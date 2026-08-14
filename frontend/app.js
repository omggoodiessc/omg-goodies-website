// ============================================================
// OMG GOODIES — SITE LOGIC
// You shouldn't need to edit this file. Edit config.js instead.
// ============================================================

const CFG = window.SITE_CONFIG || {};
const money = (n) => `$${n.toFixed(2)}`;

// ---------- Sample menu (used if config.js's CSV link isn't set yet) ----------
const SAMPLE_MENU = [
  { category: "Poundcake", item: "Oreo Cookies & Cream Poundcake", description: "", price: 5, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Chewies", item: "Traditional Chewies (w/ Nuts)", description: "", price: 9, special_price: 5, badge: "This Week's Special", available: true, photo_url: "" },
  { category: "Chewies", item: "Maple Butter Pecan Chewy", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Chewies", item: "Snickerdoodle Chewy", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Key Lime Crunch Cheesecake Parfait", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Lemon Crunch Cheesecake Parfait", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Strawberry Crunch Cheesecake Parfait", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Strawberry Lemon Crunch Cheesecake Parfait", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Banana Pudding with Wafers", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Banana Pudding with Chessman", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Strawberry Banana Pudding w/ Chessman", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Puddings & Parfaits", item: "Biscoff Cookie Pudding", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Brownies & Bars", item: "Brownies w/ Nuts", description: "", price: 7, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Brownies & Bars", item: "Turtle Brownies", description: "", price: 8, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Brownies & Bars", item: "Slutty Brownies", description: "", price: 9, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Drinks", item: "Strawberry Lemonade", description: "", price: 6, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Drinks", item: "Blackberry Lemonade", description: "", price: 6, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Drinks", item: "Pineapple Mango Lemonade", description: "", price: 6, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Drinks", item: "Blue Raspberry Lemonade", description: "", price: 6, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Drinks", item: "Peach Lemonade", description: "", price: 6, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Drinks", item: "Dragonfruit Lemonade", description: "", price: 6, special_price: null, badge: "", available: true, photo_url: "" },
  { category: "Drinks", item: "Island Punch", description: "", price: 6, special_price: null, badge: "", available: true, photo_url: "" },
];

// ---------- Tiny CSV parser (handles quoted fields with commas) ----------
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* skip */ }
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

function normalizeMenu(rawRows) {
  return rawRows.map((r) => ({
    category: r.category || "Menu",
    item: r.item || "Untitled item",
    description: r.description || "",
    price: parseFloat(r.price) || 0,
    special_price: r.special_price && !isNaN(parseFloat(r.special_price)) ? parseFloat(r.special_price) : null,
    badge: r.badge || "",
    available: String(r.available).trim().toUpperCase() !== "FALSE",
    photo_url: r.photo_url || "",
  }));
}

async function loadMenu() {
  const statusEl = document.getElementById("menuStatus");
  const url = (CFG.MENU_CSV_URL || "").trim();
  const isPlaceholder = !url || url.startsWith("PASTE_YOUR");

  if (isPlaceholder) {
    showStatus(statusEl, "Showing a sample menu — connect your Google Sheet in config.js to make this the live weekly menu.");
    return SAMPLE_MENU;
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);
    const text = await res.text();
    const parsed = normalizeMenu(parseCSV(text));
    if (!parsed.length) throw new Error("Sheet returned no rows");
    return parsed;
  } catch (err) {
    console.error("Menu load failed, falling back to sample menu:", err);
    showStatus(statusEl, "Couldn't load this week's menu right now — showing a recent version instead.");
    return SAMPLE_MENU;
  }
}

function showStatus(el, msg) {
  el.hidden = false;
  el.textContent = msg;
}

// ---------- Render menu ----------
function renderHeroSpecial(menu) {
  const special = menu.find((m) => m.badge && m.available);
  const card = document.getElementById("specialCard");
  if (!special) { card.hidden = true; return; }
  card.hidden = false;
  document.getElementById("specialLabel").textContent = special.badge;
  document.getElementById("specialName").textContent = special.item;
  const was = document.getElementById("specialWas");
  const now = document.getElementById("specialNow");
  if (special.special_price != null) {
    was.textContent = money(special.price);
    now.textContent = money(special.special_price);
  } else {
    was.textContent = "";
    now.textContent = money(special.price);
  }
  document.getElementById("specialDate").textContent =
    new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function renderMenu(menu) {
  const container = document.getElementById("menuCategories");
  container.innerHTML = "";
  const categories = [...new Set(menu.map((m) => m.category))];

  categories.forEach((cat) => {
    const items = menu.filter((m) => m.category === cat);
    const section = document.createElement("div");
    section.className = "menu-category";
    section.innerHTML = `<h3 class="menu-category-title">${escapeHTML(cat)}</h3>`;
    const grid = document.createElement("div");
    grid.className = "menu-grid";

    items.forEach((it) => {
      const card = document.createElement("div");
      card.className = "menu-card" + (it.available ? "" : " menu-card-unavailable");
      const priceHTML = it.special_price != null
        ? `<span class="was">${money(it.price)}</span>${money(it.special_price)}`
        : money(it.price);

      card.innerHTML = `
        ${it.badge ? `<span class="menu-card-badge">${escapeHTML(it.badge)}</span>` : ""}
        <p class="menu-card-name">${escapeHTML(it.item)}</p>
        ${it.description ? `<p class="menu-card-desc">${escapeHTML(it.description)}</p>` : ""}
        <div class="menu-card-bottom">
          <span class="menu-card-price">${priceHTML}</span>
          ${it.available ? `
            <div class="qty-add">
              <div class="qty-stepper" data-qty="1">
                <button type="button" class="qty-minus" aria-label="Decrease quantity">−</button>
                <span>1</span>
                <button type="button" class="qty-plus" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="add-btn">Add</button>
            </div>` : `<span class="menu-card-soldout">Sold out</span>`}
        </div>
      `;

      if (it.available) {
        const stepper = card.querySelector(".qty-stepper");
        const qtyLabel = stepper.querySelector("span");
        stepper.querySelector(".qty-minus").addEventListener("click", () => {
          const q = Math.max(1, parseInt(stepper.dataset.qty) - 1);
          stepper.dataset.qty = q; qtyLabel.textContent = q;
        });
        stepper.querySelector(".qty-plus").addEventListener("click", () => {
          const q = parseInt(stepper.dataset.qty) + 1;
          stepper.dataset.qty = q; qtyLabel.textContent = q;
        });
        card.querySelector(".add-btn").addEventListener("click", () => {
          const qty = parseInt(stepper.dataset.qty);
          addToCart({
            id: `${it.category}::${it.item}`,
            name: it.item,
            price: it.special_price != null ? it.special_price : it.price,
          }, qty);
          stepper.dataset.qty = 1; qtyLabel.textContent = 1;
          flashCart();
        });
      }
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Cart ----------
let cart = JSON.parse(localStorage.getItem("omg_cart") || "[]");

function saveCart() { localStorage.setItem("omg_cart", JSON.stringify(cart)); }

function addToCart(product, qty) {
  const existing = cart.find((c) => c.id === product.id);
  if (existing) existing.qty += qty;
  else cart.push({ ...product, qty });
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== id);
  saveCart();
  renderCart();
}

function cartSubtotal() { return cart.reduce((sum, c) => sum + c.price * c.qty, 0); }
function cartDeliveryFee() { return cart.length ? (Number(CFG.DELIVERY_FEE) || 0) : 0; }
function cartTotal() { return cartSubtotal() + cartDeliveryFee(); }

function renderCart() {
  const itemsEl = document.getElementById("cartItems");
  const emptyEl = document.getElementById("cartEmpty");
  const totalsEl = document.getElementById("cartTotalsItems");
  const countEl = document.getElementById("cartCount");

  itemsEl.innerHTML = "";
  const count = cart.reduce((s, c) => s + c.qty, 0);
  countEl.hidden = count === 0;
  countEl.textContent = count;

  if (!cart.length) {
    emptyEl.hidden = false;
    totalsEl.hidden = true;
    return;
  }
  emptyEl.hidden = true;
  totalsEl.hidden = false;

  cart.forEach((c) => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <p class="cart-item-name">${escapeHTML(c.name)} × ${c.qty}</p>
        <p class="cart-item-price">${money(c.price * c.qty)}</p>
      </div>
      <button class="cart-item-remove" type="button">Remove</button>
    `;
    row.querySelector(".cart-item-remove").addEventListener("click", () => removeFromCart(c.id));
    itemsEl.appendChild(row);
  });

  document.getElementById("cartSubtotal").textContent = money(cartSubtotal());
  document.getElementById("cartDeliveryFee").textContent = money(cartDeliveryFee());
  document.getElementById("cartTotal").textContent = money(cartTotal());
}

function flashCart() {
  const btn = document.getElementById("cartToggle");
  btn.style.transform = "scale(1.08)";
  setTimeout(() => (btn.style.transform = ""), 150);
}

// ---------- Cart panel open/close & steps ----------
const overlay = document.getElementById("overlay");
const cartPanel = document.getElementById("cartPanel");
const cartToggle = document.getElementById("cartToggle");
const cartClose = document.getElementById("cartClose");

function openCart() {
  overlay.hidden = false; cartPanel.hidden = false;
  cartToggle.setAttribute("aria-expanded", "true");
  showCartStep("items");
}
function closeCart() {
  overlay.hidden = true; cartPanel.hidden = true;
  cartToggle.setAttribute("aria-expanded", "false");
}
cartToggle.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

function showCartStep(step) {
  document.getElementById("cartStepItems").hidden = step !== "items";
  document.getElementById("cartStepCheckout").hidden = step !== "checkout";
  document.getElementById("cartStepConfirm").hidden = step !== "confirm";
}

document.getElementById("goToCheckout").addEventListener("click", () => {
  showCartStep("checkout");
  updateCheckoutTotals();
  initSquareCard();
});
document.getElementById("backToCart").addEventListener("click", () => showCartStep("items"));
document.getElementById("confirmClose").addEventListener("click", () => { closeCart(); showCartStep("items"); });

function updateCheckoutTotals() {
  document.getElementById("checkoutSubtotal").textContent = money(cartSubtotal());
  document.getElementById("checkoutDeliveryFee").textContent = money(cartDeliveryFee());
  document.getElementById("checkoutTotal").textContent = money(cartTotal());
}

// ---------- Square Web Payments SDK ----------
let squareCard = null;
let squareCardReady = false;

function loadSquareScript() {
  return new Promise((resolve, reject) => {
    if (window.Square) return resolve();
    const isProd = CFG.SQUARE_ENVIRONMENT === "production";
    const script = document.createElement("script");
    script.src = isProd
      ? "https://web.squarecdn.com/v1/square.js"
      : "https://sandbox.web.squarecdn.com/v1/square.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Square SDK"));
    document.head.appendChild(script);
  });
}

async function initSquareCard() {
  const note = document.getElementById("checkoutNote");
  const appId = (CFG.SQUARE_APPLICATION_ID || "").trim();
  const locId = (CFG.SQUARE_LOCATION_ID || "").trim();

  if (!appId || appId.startsWith("PASTE_YOUR") || !locId || locId.startsWith("PASTE_YOUR")) {
    note.textContent = "Payments aren't connected yet — add your Square Application ID and Location ID in config.js.";
    note.className = "form-note error";
    document.getElementById("payButton").disabled = true;
    return;
  }
  if (squareCardReady) return;

  try {
    await loadSquareScript();
    const payments = window.Square.payments(appId, locId);
    squareCard = await payments.card();
    await squareCard.attach("#card-container");
    squareCardReady = true;
    document.getElementById("payButton").disabled = false;
  } catch (err) {
    console.error(err);
    note.textContent = "Couldn't load the payment form. Please refresh and try again.";
    note.className = "form-note error";
  }
}

// ---------- Checkout submit ----------
document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("checkoutNote");
  const payBtn = document.getElementById("payButton");
  note.textContent = ""; note.className = "form-note";

  if (!cart.length) { note.textContent = "Your cart is empty."; note.className = "form-note error"; return; }
  if (!squareCardReady) { note.textContent = "Payment form isn't ready yet."; note.className = "form-note error"; return; }

  const form = e.target;
  const customer = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    address: form.address.value.trim(),
    deliveryDate: form.deliveryDate.value,
    notes: form.notes.value.trim(),
  };

  payBtn.disabled = true;
  payBtn.textContent = "Processing…";

  try {
    const tokenResult = await squareCard.tokenize({
      amount: cartTotal().toFixed(2),
      currencyCode: "USD",
      intent: "CHARGE",
    });
    if (tokenResult.status !== "OK") {
      throw new Error(tokenResult.errors?.[0]?.message || "Card was declined.");
    }

    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: tokenResult.token,
        cart: cart.map((c) => ({ name: c.name, qty: c.qty })),
        deliveryFee: cartDeliveryFee(),
        customer,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Something went wrong processing your order.");
    }

    document.getElementById("confirmOrderId").textContent = data.orderId ? `Order #${data.orderId}` : "";
    cart = []; saveCart(); renderCart();
    showCartStep("confirm");
    form.reset();
  } catch (err) {
    console.error(err);
    note.textContent = err.message || "Something went wrong. Please try again.";
    note.className = "form-note error";
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = "Place order";
  }
});

// ---------- Catering form ----------
document.getElementById("cateringForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const note = document.getElementById("cateringNote");
  const endpoint = (CFG.FORMSPREE_ENDPOINT || "").trim();

  if (!endpoint) {
    const subject = encodeURIComponent("Catering inquiry — " + form.name.value);
    const body = encodeURIComponent(
      `Name: ${form.name.value}\nEmail: ${form.email.value}\nPhone: ${form.phone.value}\n` +
      `Event date: ${form.eventDate.value}\nGuest count: ${form.guestCount.value}\n` +
      `Event type: ${form.eventType.value}\nMessage: ${form.message.value}`
    );
    window.location.href = `mailto:${CFG.CATERING_EMAIL || ""}?subject=${subject}&body=${body}`;
    return;
  }

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
    });
    if (!res.ok) throw new Error();
    note.textContent = "Thanks! We'll be in touch soon.";
    note.className = "form-note success";
    form.reset();
  } catch {
    note.textContent = "Something went wrong sending your inquiry — please try again or email us directly.";
    note.className = "form-note error";
  } finally {
    btn.disabled = false; btn.textContent = "Send inquiry";
  }
});

// ---------- Init ----------
(async function init() {
  renderCart();
  const menu = await loadMenu();
  renderHeroSpecial(menu);
  renderMenu(menu);
})();
