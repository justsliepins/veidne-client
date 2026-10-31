import { test, expect, type Page } from '@playwright/test';

// H3: the template library tells loading, error and empty apart, and a
// template API that never answers falls back to the 25 built-in templates
// after TEMPLATE_API_TIMEOUT_MS (5 s) instead of looking empty forever.
// Runs against the feature-off dev server; no backend is needed.
const BASE = 'http://localhost:5181';
const BUILT_IN = 25;

const openLibrary = async (page: Page) => {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Templates' }).click();
  return page.getByRole('dialog', { name: 'Choose a template' });
};
// Template cards are the only buttons in the dialog with a title (the description).
const cards = (dialog: ReturnType<Page['getByRole']>) => dialog.locator('button[title]');

test('a template API that never answers shows loading, then the built-in templates', async ({ page }) => {
  await page.route('**/api/templates', () => { /* never answer */ });
  await page.goto(`${BASE}/`);
  const dialog = await openLibrary(page);
  await expect(dialog.getByRole('progressbar', { name: 'Loading templates...' })).toBeVisible();
  await expect(dialog.getByText('No templates', { exact: false })).toHaveCount(0);
  await expect(cards(dialog)).toHaveCount(BUILT_IN, { timeout: 9_000 });
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
});

test('a failing template API shows the built-in templates at once', async ({ page }) => {
  await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.goto(`${BASE}/`);
  const dialog = await openLibrary(page);
  await expect(cards(dialog)).toHaveCount(BUILT_IN, { timeout: 2_000 });
});

test('Use this template falls back to the built-in file when the download API never answers', async ({ page }) => {
  await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.route('**/api/templates/*/download', () => { /* never answer */ });
  await page.goto(`${BASE}/`);
  const dialog = await openLibrary(page);
  await dialog.getByRole('button', { name: 'NDA' }).click();
  await page.getByRole('button', { name: 'Use this template' }).click();
  await expect(page).toHaveURL(/\/editor/, { timeout: 9_000 });
  await expect(page.getByRole('dialog', { name: 'Choose a template' })).toHaveCount(0);
  // The template arrived in the editor: its fields are listed.
  await expect(page.getByText(/Your template has \d+ fields/)).toBeVisible({ timeout: 15_000 });
});

test('a search with no match says so in a status message', async ({ page }) => {
  await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.goto(`${BASE}/`);
  const dialog = await openLibrary(page);
  await expect(cards(dialog)).toHaveCount(BUILT_IN);
  await dialog.getByPlaceholder('Search templates...').fill('zzzz');
  // Once on screen and once in the visually hidden live region.
  await expect(dialog.getByText('No templates match your search')).toHaveCount(2);
  await expect(dialog.getByRole('status')).toHaveText('No templates match your search');
  await expect(cards(dialog)).toHaveCount(0);
});

// The error and empty states cannot be reached through the network, because the
// built-in list always exists. The dev server serves the store module at the
// same URL the app imports it from, so the test sets the state directly.
// A string, so the test transpiler leaves the browser-side import() alone.
const setLibraryState = (page: Page, state: Record<string, unknown>) =>
  page.evaluate(`import('/src/features/templates/store/templateStore.ts')
    .then((m) => m.useTemplateStore.setState(${JSON.stringify({ isOpen: true, ...state })}))`);

test('the error state offers Try again and the own-document path', async ({ page }) => {
  await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.goto(`${BASE}/`);
  await setLibraryState(page, { status: 'error', templates: [] });
  const dialog = page.getByRole('dialog', { name: 'Choose a template' });
  const alert = dialog.getByRole('alert');
  await expect(alert).toContainText('Templates could not be loaded.');
  await expect(alert.getByRole('link', { name: 'Open your Word document' })).toHaveAttribute('href', '/editor');
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect(cards(dialog)).toHaveCount(BUILT_IN);
  await expect(dialog.getByRole('alert')).toHaveCount(0);
});

test('the empty state offers the own-document path', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await setLibraryState(page, { status: 'ready', templates: [] });
  const dialog = page.getByRole('dialog', { name: 'Choose a template' });
  await expect(dialog.getByText('No templates yet.', { exact: false })).toBeVisible();
  await dialog.getByRole('link', { name: 'Open your Word document' }).click();
  await expect(page).toHaveURL(/\/editor$/);
  await expect(dialog).toHaveCount(0);
});

test('the dialog takes keyboard focus and gives it back', async ({ page }) => {
  await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.goto(`${BASE}/`);
  const opener = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Templates' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Choose a template' });
  await expect(cards(dialog)).toHaveCount(BUILT_IN);
  await expect(dialog.getByText('Choose a template', { exact: true })).toBeFocused();
  // Shift+Tab from the title wraps to the last control inside the dialog.
  await page.keyboard.press('Shift+Tab');
  await expect(cards(dialog).last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  // The preview takes focus on its main action and returns it to the card.
  await cards(dialog).first().focus();
  await page.keyboard.press('Enter');
  const preview = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Use this template' }) });
  await expect(preview.getByRole('button', { name: 'Use this template' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(cards(dialog).first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('the category chips say which one is selected', async ({ page }) => {
  await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.goto(`${BASE}/`);
  const dialog = await openLibrary(page);
  const group = dialog.getByRole('group', { name: 'Category' });
  const all = group.getByRole('button', { name: 'All' });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  const other = group.getByRole('button').nth(1);
  await other.click();
  await expect(other).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
});

test('a template chosen inside the editor keeps the address plain, so a reload resumes it', async ({ page }) => {
  await page.route('**/api/templates', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.route('**/api/templates/*/download', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.goto(`${BASE}/editor`);
  await page.getByRole('button', { name: 'Browse the template library' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a template' });
  await dialog.getByRole('button', { name: 'NDA' }).click();
  // Nothing is saved yet, so the preview has nothing to warn about.
  await expect(page.getByText('Using this template deletes your unfinished project.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Use this template' }).click();
  await expect(page.getByText(/Your template has \d+ fields/)).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(`${BASE}/editor`);

  // The project is saved (after a short debounce); the reload passes the leave warning.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('veidne_session') !== null), { timeout: 10_000 }).toBe(true);
  page.on('dialog', (d) => void d.accept());
  await page.reload();
  await expect(page.getByText('You have an unfinished project')).toBeVisible({ timeout: 15_000 });

  // With the project saved, choosing another template says what it replaces.
  await page.goto(`${BASE}/`);
  const again = await openLibrary(page);
  await again.getByRole('button', { name: 'NDA' }).click();
  await expect(page.getByText('Using this template deletes your unfinished project.')).toBeVisible();
});
