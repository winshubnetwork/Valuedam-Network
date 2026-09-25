# ValueDam Network — Services & Quote Website V1

A responsive React + Vite website for ValueDam Network. V1 includes a public services/portfolio site and a quote/contact workflow that works immediately with a mailto fallback.

## Run locally

1. Install Node.js (LTS).
2. Open a terminal in this folder.
3. Run:
   `npm install`
4. Run:
   `npm run dev`

## Build

`npm run build`

The production files will be created in `dist/`.

## Deploy to Vercel

1. Upload this project to GitHub.
2. Import the GitHub repository into Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

## Quote form

Without Supabase configured, quote submissions open the visitor's email app using the contact email in `.env`.

To connect Supabase later, add:

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

Then create a `quote_requests` table and connect the form in `src/lib/quotes.js`.

## Customize

Main content is in `src/data/services.js`.
Brand/contact details are in `src/data/site.js`.
