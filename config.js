// ============================================================
// OMG GOODIES — SITE CONFIG
// This is the ONLY file you should need to edit to get the site
// running. See README.md for step-by-step setup instructions.
// ============================================================

window.SITE_CONFIG = {

  // --- MENU SOURCE ------------------------------------------------
  // Paste the "publish to web" CSV link for your Google Sheet menu.
  // README.md → "Updating the menu" explains exactly how to get this.
  // Leave as-is to see the site running with the sample menu.
  MENU_CSV_URL: "PASTE_YOUR_GOOGLE_SHEET_CSV_LINK_HERE",

  // --- DELIVERY -----------------------------------------------------
  // Flat delivery fee added to every order, in dollars (e.g. 5 = $5.00)
  DELIVERY_FEE: 5,

  // --- SQUARE (PAYMENTS) --------------------------------------------
  // From your Square Developer Dashboard → your app → Credentials.
  // These two IDs are safe to be public (they only identify your
  // account — they can't move money on their own).
  SQUARE_APPLICATION_ID: "PASTE_YOUR_SQUARE_APPLICATION_ID_HERE",
  SQUARE_LOCATION_ID: "PASTE_YOUR_SQUARE_LOCATION_ID_HERE",

  // "sandbox" while testing, "production" once you're ready to take
  // real payments. See README.md → "Going live".
  SQUARE_ENVIRONMENT: "sandbox",

  // --- CATERING INQUIRIES --------------------------------------------
  // Free form at https://formspree.io — sign up, create a form, and
  // paste its endpoint URL here so catering inquiries land in her inbox.
  // Leave blank and inquiries will open in the visitor's email app instead.
  FORMSPREE_ENDPOINT: "",
  CATERING_EMAIL: "hello@omggoodiesllc.com",
};
