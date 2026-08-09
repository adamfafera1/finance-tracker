// Copy to environment.ts for local development (ng serve).
// Production builds (npm run build / Vercel) generate environment.ts from env vars.

export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_OR_PUBLISHABLE_KEY',
  primeui: 'YOUR_PRIMEUI_LICENSE_KEY',
};

// Vercel / CI environment variables:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   PRIMEUI_LICENSE (optional)
