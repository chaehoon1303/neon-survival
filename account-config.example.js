/*
 * Copy this file to account-config.js only after creating the hosted services.
 * The Supabase publishable key is safe in a browser.  Never put a service-role
 * key, OAuth client secret, Apple private key, or Cloudflare API token here.
 */
window.NEON_ACCOUNT_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_YOUR_PUBLIC_KEY',
  // A Worker/API that verifies Supabase JWTs and validates progress writes.
  progressApiBase: 'https://YOUR_ACCOUNT_API.example.com'
};
