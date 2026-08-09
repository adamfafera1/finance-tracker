import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

function assertSupabaseConfig(): { url: string; key: string } {
  const url = environment.supabaseUrl?.trim();
  const key = environment.supabaseAnonKey?.trim();

  if (!url || url.includes('YOUR_PROJECT')) {
    throw new Error(
      'Missing Supabase URL. Set supabaseUrl in src/environments/environment.ts',
    );
  }

  if (!key || key.includes('YOUR_ANON_KEY')) {
    throw new Error(
      'Missing Supabase anon key. Set supabaseAnonKey in src/environments/environment.ts',
    );
  }

  return { url, key };
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    const { url, key } = assertSupabaseConfig();
    this.client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
}
