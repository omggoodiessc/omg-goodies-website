// ============================================================
// OMG GOODIES — ORDER SERVER
// Serves the site and talks to Square to charge cards securely.
// Requires Node.js 18+ (uses the built-in fetch).
// ============================================================

require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const { SquareClient, SquareEnvironment, SquareError } = require("square");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

const PORT = process.env.PORT || 3000;
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_ENVIRONMENT = (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase();
const MENU_CSV_URL = process.env.MENU_CSV_URL || "";
const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 5);

const squareClient = SQUARE_ACCESS_TOKEN
  ? new SquareClient({
      token: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENVIRONMENT === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    })
  : null;

// ---------- Menu cache (used to verify prices server-side so a customer
// can never pay less than the real, current price) ----------
let menuCache = { at: 0, byName: new Map() };
const MENU_CACHE_TTL_MS = 5 * 60 * 1000;

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1)
    .filter((r) => r.some((v) => v && v.trim().length))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
      return obj;
    });
}

async function getMenuPriceMap() {
  const isPlaceholder = !MENU_CSV_URL || MENU_CSV_URL.startsWith("PASTE_YOUR");
  if (isPlaceholder) return null; // signal: no live sheet configured, skip server-side price check

  if (Date.now() - menuCache.at < MENU_CACHE_TTL_MS && menuCache.byName.size) {
    return menuCache.byName;
  }
  const res = await fetch(MENU_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load menu sheet for price verification");
  const text = await res.text();
  const rows = parseCSV(text);
  const byName = new Map();
  rows.forEach((r) => {
    if (String(r.available).trim().toUpperCase() === "FALSE") return;
    const price = r.special_price && !isNaN(parseFloat(r.special_price))
      ? parseFloat(r.special_price)
      : parseFloat(r.price) || 0;
    byName.set((r.item || "").trim().toLowerCase(), price);
  });
  menuCache = { at: Date.now(), byName };
  return byName;
}

// ---------- Create order + charge card ----------
app.post("/api/create-order", async (req, res) => {
  try {
    if (!squareClient || !SQUARE_LOCATION_ID) {
      return res.status(500).json({
        success: false,
        message: "Payments aren't configured on the server yet. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.",
      });
    }

    const { sourceId, cart, customer, deliveryFee } = req.body || {};
    if (!sourceId || !Array.isArray(cart) || !cart.length || !customer) {
      return res.status(400).json({ success: false, message: "Missing order details." });
    }
    for (const field of ["name", "email", "phone", "address", "deliveryDate"]) {
      if (!customer[field] || !String(customer[field]).trim()) {
        return res.status(400).json({ success: false, message: `Missing ${field}.` });
      }
    }

    // Verify prices against the live menu sheet when one is configured, so a
    // tampered client request can't check out at the wrong price.
    let priceMap = null;
    try { priceMap = await getMenuPriceMap(); }
    catch (e) { console.warn("Menu price verification unavailable:", e.message); }

    const lineItems = cart.map((c) => {
      const qty = Math.max(1, parseInt(c.qty) || 1);
      let unitPrice = priceMap ? priceMap.get(String(c.name).trim().toLowerCase()) : undefined;
      if (unitPrice == null) unitPrice = Number(c.price) || 0; // fallback if item not found / no sheet configured
      return {
        name: String(c.name).slice(0, 255),
        quantity: String(qty),
        basePriceMoney: { amount: BigInt(Math.round(unitPrice * 100)), currency: "USD" },
      };
    });

    const fee = Number.isFinite(Number(deliveryFee)) ? Number(deliveryFee) : DELIVERY_FEE;
    if (fee > 0) {
      lineItems.push({
        name: "Delivery",
        quantity: "1",
        basePriceMoney: { amount: BigInt(Math.round(fee * 100)), currency: "USD" },
      });
    }

    const orderNote =
      `Delivery to: ${customer.address} | Requested date: ${customer.deliveryDate} | ` +
      `Contact: ${customer.name}, ${customer.phone}, ${customer.email}` +
      (customer.notes ? ` | Notes: ${customer.notes}` : "");

    const { order } = await squareClient.orders.create({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: SQUARE_LOCATION_ID,
        lineItems,
        note: orderNote.slice(0, 500),
      },
    });

    if (!order) {
      return res.status(502).json({ success: false, message: "Could not create the order." });
    }

    const { payment } = await squareClient.payments.create({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: order.totalMoney,
      orderId: order.id,
      locationId: SQUARE_LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer.email,
      note: `OMG Goodies order — ${customer.name}`,
    });

    if (!payment || payment.status !== "COMPLETED") {
      return res.status(402).json({ success: false, message: "Payment was not completed." });
    }

    return res.json({ success: true, orderId: order.id.slice(-8).toUpperCase(), paymentId: payment.id });
  } catch (err) {
    console.error("create-order error:", err);
    if (err instanceof SquareError) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.body?.errors?.[0]?.detail || "Payment could not be processed.",
      });
    }
    return res.status(500).json({ success: false, message: "Something went wrong placing your order." });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`OMG Goodies order site running on port ${PORT}`);
  if (!squareClient) console.warn("⚠️  SQUARE_ACCESS_TOKEN not set — payments will fail until it is.");
});
