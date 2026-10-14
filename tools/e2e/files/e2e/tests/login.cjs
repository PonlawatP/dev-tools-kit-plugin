// The ONE place that knows this app's login form. Adapt the selectors to the real login page
// (prefer data-testid); auth.setup.ts and scripts/browser-host.mjs both call this.
const LOGIN_PATH = '/login';

async function login(page, email, password) {
  await page.goto(LOGIN_PATH);
  await page.getByLabel(/email|username/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).click();
}

// True when the app bounced the page to the login form (session missing or expired).
const onLoginPage = (page) => new URL(page.url()).pathname.startsWith(LOGIN_PATH);

module.exports = { LOGIN_PATH, login, onLoginPage };
