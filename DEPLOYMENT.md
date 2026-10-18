# Deployment

## Local
`npm install`
`npm run dev`

## Production build
`npm run build`

The generated `dist` folder can be deployed to a static hosting provider such as Cloudflare Pages.

Environment variables required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
