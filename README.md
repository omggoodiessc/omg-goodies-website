# OMG Goodies LLC — Online Ordering Site

A pink-and-white ordering site for OMG Goodies LLC: customers browse the
weekly menu, build a cart, pay by card (via Square), and get their order
sent straight to Square with the delivery address and date attached.
There's also a catering inquiry form for events.

**The most important thing to know:** the menu is *not* hardcoded into the
website. It's pulled live from a Google Sheet, so updating the menu each
week is just editing a spreadsheet — no code, no redeploying, no developer
needed after the one-time setup below.

---

## How it's put together

- `frontend/` — the actual website (menu, cart, checkout form)
- `frontend/config.js` — the **one file** you edit to connect everything
  (Google Sheet link, Square IDs, delivery fee)
- `server.js` — a small backend that securely charges the card through
  Square (this step can't happen in the browser alone — card payments
  always need a server in between for security)
- `menu-template.csv` — a ready-to-import copy of the current menu, to
  get the Google Sheet started

---

## Part 1 — Set up the weekly menu (Google Sheet)

This is the part that makes updates "seamless," so it's worth doing first.

1. Go to [Google Sheets](https://sheets.google.com) and create a new
   blank spreadsheet.
2. Import the starter menu: **File → Import → Upload**, choose
   `menu-template.csv` from this project, and select **"Replace current
   sheet"** when prompted.
3. You'll see one row per item with these columns:

   | Column | What goes here |
   |---|---|
   | `category` | Section heading, e.g. `Chewies`, `Drinks` |
   | `item` | The item's name |
   | `description` | Optional short description |
   | `price` | Regular price, numbers only (e.g. `9`) |
   | `special_price` | Only fill in if it's on sale this week |
   | `badge` | Optional tag like `This Week's Special` or `New` |
   | `available` | `TRUE` or `FALSE` — set to `FALSE` to hide a sold-out item without deleting it |
   | `photo_url` | Optional — a public image link (see note below) |

   **Each week:** just edit the price/description/available cells,
   add new rows for new items, or set `available` to `FALSE` for
   anything you're out of. That's the whole update.

4. Publish it so the website can read it: **File → Share → Publish to
   web**. Choose the sheet (not "Entire document" if you add more
   tabs later), set the format to **Comma-separated values (.csv)**,
   and click **Publish**.
5. Copy the link it gives you. It'll look like:
   `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`
6. Open `frontend/config.js` and paste it in for `MENU_CSV_URL`. Also
   paste the same link into `.env` as `MENU_CSV_URL` (used server-side
   to double-check prices — see Part 2).

**Note on photos:** `photo_url` isn't wired into the current card
design (kept simple for launch), but the column is there so photos can
be added later without changing the sheet structure again.

You only do steps 1–6 once. After that, editing the sheet *is* editing
the menu — refresh the site and changes show up immediately.

---

## Part 2 — Set up Square (payments)

1. Create a free account at
   [developer.squareup.com](https://developer.squareup.com) using the
   same login as her existing Square account.
2. Click **+ Create App**, name it something like "OMG Goodies Website."
3. Inside the app, open the **Sandbox** tab first (this lets you test
   with fake money before anything real is on the line):
   - Copy the **Sandbox Application ID** → paste into `config.js` as
     `SQUARE_APPLICATION_ID`
   - Copy the **Sandbox Access Token** → paste into `.env` as
     `SQUARE_ACCESS_TOKEN`
   - Under **Locations**, copy the **Sandbox Location ID** → paste into
     both `config.js` and `.env` as `SQUARE_LOCATION_ID`
4. Leave `SQUARE_ENVIRONMENT=sandbox` in both `config.js` and `.env`
   for now.
5. To test a payment, use Square's standard test card:
   - Card number: `4111 1111 1111 1111`
   - CVV: `111`
   - Expiration: any future date
   - ZIP: any valid ZIP code

   Orders placed in sandbox mode show up in the **Sandbox** view of the
   Square Developer Dashboard, not the real Square Dashboard she
   normally uses.

### Going live (real payments)

When ready to accept real cards:

1. In the same Developer Dashboard app, switch to the **Production**
   tab and repeat step 3 above using the **production** Application ID,
   Access Token, and Location ID (these are different from the sandbox
   ones).
2. Set `SQUARE_ENVIRONMENT=production` in both `config.js` and `.env`.
3. Square requires the live site's domain to be registered before it
   will accept real card payments: in the Developer Dashboard, go to
   your app → **Web Payments SDK** and add the site's domain once it's
   deployed (Part 4).
4. Redeploy. Real orders will now appear in her normal Square Dashboard
   and Square point-of-sale app, itemized, with the delivery address
   and date in the order note.

---

## Part 3 — Set up catering inquiries

Catering requests aren't paid for on the spot (events usually need a
custom quote), so the catering form just needs somewhere to send
inquiries:

1. Go to [formspree.io](https://formspree.io) and create a free
   account with the email she wants inquiries to land in.
2. Create a new form, and copy its endpoint URL (looks like
   `https://formspree.io/f/xxxxxxx`).
3. Paste it into `frontend/config.js` as `FORMSPREE_ENDPOINT`.

If this step is skipped, the form still works — it'll just open the
visitor's email app with the details pre-filled, addressed to
`CATERING_EMAIL` in `config.js` (also worth setting to her real
inbox).

---

## Part 4 — Run it locally, then deploy

### Run locally (to test before going live)

Requires [Node.js](https://nodejs.org) 18 or newer installed.

```bash
npm install
cp .env.example .env   # then fill in the values from Part 1 & 2
npm start
```

Visit `http://localhost:3000` — the whole site, cart, and sandbox
checkout should work end to end.

### Deploy so it's live on the internet

The simplest option is **[Render](https://render.com)** (free tier
available, and it runs the backend and serves the website together —
one thing to manage):

1. Push this project to a GitHub repository (Render deploys from
   GitHub).
2. In Render, click **New → Web Service**, connect the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Under **Environment**, add the same values from your `.env` file
   (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT`,
   `MENU_CSV_URL`, `DELIVERY_FEE`). Do **not** upload the `.env` file
   itself — environment variables are entered directly in Render's
   dashboard instead, so the access token is never stored in the repo.
5. Deploy. Render gives you a URL like `omg-goodies.onrender.com` — a
   custom domain (e.g. `order.omggoodiesllc.com`) can be connected
   under **Settings → Custom Domain** once she has one.

If a custom domain is added later, remember to register that exact
domain with Square (Part 2, "Going live," step 3) or the card form will
stop working.

---

## What this doesn't include (by design, for now)

- **Pickup** isn't built in — the checkout form is delivery-only. Easy
  to add later if she wants it (a pickup/delivery toggle).
- **Order tracking / status updates** — orders land in her Square
  Dashboard like any other Square sale; there's no separate admin
  screen on this site.
- **Delivery zones or per-address fees** — one flat delivery fee for
  every order (`DELIVERY_FEE` in `config.js`/`.env`). Ask if variable
  pricing by distance is needed.
- **Menu photos** — the data column exists but isn't displayed yet.

---

## Troubleshooting

- **"Payments aren't connected yet"** on checkout → `config.js` still
  has placeholder Square IDs.
- **Card form doesn't appear** → check the browser console; usually
  means the Application ID/Location ID and environment (sandbox vs.
  production) don't match each other.
- **Menu shows the sample instead of the real one** → the Google Sheet
  link either isn't published correctly (Part 1, step 4) or wasn't
  pasted into `config.js`.
- **"Payment could not be processed"** → double check the Square
  Access Token in `.env` matches the same environment (sandbox/
  production) as `SQUARE_ENVIRONMENT`.
