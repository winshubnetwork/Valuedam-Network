# ValueDam Network — Batch 1

This is the first incremental batch. It contains the public website foundation only.

## Included
- Responsive homepage
- About
- Services + service detail pages
- Portfolio
- Blog listing + article structure
- Contact form
- Request-a-Service form
- Supabase database tables for public submissions
- Clean Vite/React project

## Setup
1. Copy `.env.example` to `.env.local`.
2. Add your Supabase Project URL and Publishable/Anon key.
3. In Supabase SQL Editor, run `supabase/schema.sql` once.
4. In a terminal in this folder run:
   - `npm install`
   - `npm run dev`
5. Open the local URL shown by Vite.

## Important
Do not put a Supabase service-role/secret key in `.env.local` for this frontend.

## Incremental batches
Batch 2 will contain only the additions/replacements needed to extend this project with the CMS/admin system. Do not mix Batch 2 into the project until Batch 1 has been tested.
