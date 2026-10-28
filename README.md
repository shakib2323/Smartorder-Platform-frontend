<<<<<<< HEAD
# SmartOrder frontend (React)

A React frontend for the SmartOrder backend. No UI library, no icon pack, no images and no external fonts.
Everything is hand-written CSS and inline SVG.

## Run it (no Node needed)

The app is already built into `assets/app.js`. Start your backend (gateway on port 8084), then serve this
folder on port 3000, because the gateway allows `http://localhost:3000` by default:

    python -m http.server 3000

Open http://localhost:3000

If your gateway is elsewhere, edit `config.js` (API_BASE). If you serve on another port, set
`CORS_ALLOWED_ORIGINS` on the gateway to match.

## Change the code (optional, needs Node)

The readable source is in `src/`. After editing:

    npm install
    npm run dev      # serves http://localhost:3000 and rebuilds when you save a file
    npm run build    # writes the final assets/app.js

## What is covered

Public: home with hero, shop (search, category, brand, price, size, colour, sort, paging), product page
(gallery, offers, stock, variants, sold-by, buy now, reserve), brands, brand pages, recently viewed (batch endpoint).
Accounts: login, customer sign up, seller sign up, session check (/auth/me), automatic logout at token expiry.
Customer: cart (add, change quantity, remove, clear), checkout with delivery address, buy now or reserve (1 to 72 hours),
Idempotency-Key handling, orders list with status filter, order detail with live status, cancel, confirm reservation,
GST invoice page and PDF.
Seller: dashboard summary, brand register/edit/logo, products (create, edit, hide/show, up to 8 pictures with cover),
offers (create, switch off), stock, orders (ship with tracking, deliver, invoice).
Admin: brand approvals (approve, suspend, status filter), all orders and invoices, stock tools (lookup, create, adjust),
catalogue management.

Sample figures in the hero illustration are decoration only.
=======
# Smartorder-Platform-frontend
>>>>>>> 24f8da971139f132ad623d4943c437c41f106769
