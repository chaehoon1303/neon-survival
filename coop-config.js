/*
 * Public co-op endpoint only.  It contains no API secret or Cloudflare token.
 * After `npm run coop:deploy`, set serverUrl to the shown workers.dev URL plus
 * `/ws`, or run NEON_COOP.setServer('wss://.../ws') from the browser once.
 */
window.NEON_COOP_CONFIG = {
  serverUrl: 'wss://neon-survivor-coop.chaehoon1303.workers.dev/ws'
};
