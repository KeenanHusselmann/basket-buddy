// Screenshot script using Playwright
// Logs into demo mode and captures key screens

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'screenshots');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:5173';

// nav label text → screenshot filename  (must match sidebar NavLink labels)
const PAGES = [
  { name: '01_dashboard',      navLabel: 'Dashboard' },
  { name: '02_budget_planner', navLabel: 'Budget Planner' },
  { name: '03_home_budget',    navLabel: 'Home Budget' },
  { name: '04_analytics',      navLabel: 'Analytics' },
];

async function navigateSidebar(page, label) {
  // The sidebar NavLink contains a <span> with the label text
  const link = page.locator('nav a').filter({ hasText: label });
  await link.waitFor({ timeout: 10_000 });
  await link.click();
  await page.waitForTimeout(1200); // let animations + data settle
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // ── 1. Load the app ────────────────────────────────────────────────────────
  console.log('Opening app…');
  await page.goto(BASE_URL);

  // ── 2. Wait for login screen (the "Try Demo Mode" button) ─────────────────
  const demoBtn = page.locator('button', { hasText: 'Try Demo Mode' });
  await demoBtn.waitFor({ state: 'visible', timeout: 15_000 });
  console.log('Login screen detected. Clicking "Try Demo Mode"…');
  await demoBtn.click();

  // ── 3. Wait for the app to land on the Dashboard ───────────────────────────
  // The sidebar icon for Dashboard should appear once auth state flips
  await page.waitForSelector('aside', { timeout: 15_000 });
  // Also wait for the sidebar to be expanded (i.e. a nav <a> link is visible)
  await page.waitForSelector('nav a', { timeout: 10_000 });
  await page.waitForTimeout(1500); // charts / data finish rendering

  console.log('Dashboard loaded ✓');

  // ── 4. Screenshot each page via sidebar navigation ─────────────────────────
  for (const { name, navLabel } of PAGES) {
    console.log(`Navigating to "${navLabel}"…`);
    await navigateSidebar(page, navLabel);

    const file = join(OUTPUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ✓ Saved: ${file}`);
  }

  await browser.close();
  console.log('\nAll screenshots saved to ./screenshots/');
})();
