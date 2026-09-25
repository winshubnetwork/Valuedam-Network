# Supabase setup (optional V1)

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `schema.sql`.
4. Copy your Project URL and anon key.
5. Put them in Vercel environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
6. Redeploy.

The current V1 already works without Supabase: the quote form falls back to opening an email draft. Supabase is included so the project can evolve into an admin-managed quote system in V2.
