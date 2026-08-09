import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(__dirname, '../src/environments/environment.ts');

const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() ?? '';
const primeui = process.env.PRIMEUI_LICENSE?.trim() ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY\n' +
      'Set them in Vercel Project Settings → Environment Variables, or locally before running npm run build.',
  );
  process.exit(1);
}

const environment = {
  production: true,
  supabaseUrl,
  supabaseAnonKey,
  primeui,
};

writeFileSync(target, `export const environment = ${JSON.stringify(environment, null, 2)};\n`);
console.log(`Wrote ${target}`);
