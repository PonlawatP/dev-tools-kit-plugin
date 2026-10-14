// Role slugs + credentials from .env, shared by playwright.config.ts, tests and scripts.
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const envKey = (slug) => slug.toUpperCase().replace(/-/g, '_');
const ROLES = (process.env.E2E_ROLES || '').split(',').map((s) => s.trim()).filter(Boolean)
  .map((slug) => ({ slug, email: process.env[`${envKey(slug)}_EMAIL`], password: process.env[`${envKey(slug)}_PASSWORD`] }));

module.exports = {
  ROLES,
  BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  AUTHENTICATED_PATH: process.env.E2E_AUTHENTICATED_PATH || '/',
  SMOKE_PATH: process.env.E2E_SMOKE_PATH || '/',
  role: (slug) => ROLES.find((r) => r.slug === slug),
};
