import { test, expect } from '@playwright/test';

// Journey audit (Nov 2026) J22: the About and Roadmap donation dialog and the
// bug report form. Both take focus, keep Tab inside, say which amount is
// chosen, label every field, and give focus back on close. The API calls are
// answered here, so no server is needed.

test.describe('donation dialog on About', () => {
  test('focus moves in, the chosen amount is exposed, and focus returns to Donate', async ({ page }) => {
    await page.goto('/about');
    const donate = page.getByRole('button', { name: 'Donate', exact: true });
    await donate.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Support Veidne' });
    await expect(dialog.getByRole('heading', { name: 'Support Veidne' })).toBeFocused();
    const amounts = dialog.getByRole('group', { name: 'Choose an amount' });
    await expect(amounts.getByRole('button', { name: '5 EUR' })).toHaveAttribute('aria-pressed', 'true');
    await expect(amounts.getByRole('button', { name: '3 EUR' })).toHaveAttribute('aria-pressed', 'false');
    await expect(dialog.getByRole('button', { name: 'Donate 5 EUR' })).toBeEnabled();

    // Custom: a labelled whole-euro field takes focus; the button follows the amount.
    await amounts.getByRole('button', { name: 'Custom' }).click();
    const amount = dialog.getByLabel('Amount in euros');
    await expect(amount).toBeFocused();
    await expect(amount).toHaveAttribute('inputmode', 'numeric');
    await expect(dialog.getByRole('button', { name: 'Donate', exact: true })).toBeDisabled();
    await page.keyboard.type('7');
    await expect(dialog.getByRole('button', { name: 'Donate 7 EUR' })).toBeEnabled();

    // Tab stays in the dialog.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(donate).toBeFocused();
  });

  test('a custom amount keeps what was typed, and the Stripe line says where card details go', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('button', { name: 'Donate', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText("You pay on Stripe's secure page. Your card details go to Stripe, not to Veidne.")).toBeVisible();
    await dialog.getByRole('button', { name: 'Custom' }).click();
    const field = dialog.getByLabel('Amount in euros');
    await field.fill('2,50');
    await expect(field).toHaveValue('2,50');
    await expect(dialog.getByRole('button', { name: 'Donate', exact: true })).toBeDisabled();
    await field.press('Enter');
    await expect(dialog.getByRole('alert')).toHaveText('Enter the amount in whole euros, for example 5.');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await field.fill('7 EUR');
    await expect(dialog.getByRole('button', { name: 'Donate 7 EUR' })).toBeEnabled();
  });

  test('a failed checkout start is announced in the dialog', async ({ page }) => {
    await page.route('**/api/donations/create-session', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/about');
    await page.getByRole('button', { name: 'Donate', exact: true }).click();
    await page.getByRole('button', { name: 'Donate 5 EUR' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Could not open the payment page. Check your connection and try again.');
  });
});

test.describe('bug report form', () => {
  test('fields are labelled, the email error sits at the field, and the thank-you stays until closed', async ({ page }) => {
    await page.route('**/api/bug-report', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto('/editor');
    const open = page.getByRole('button', { name: 'Report a bug' });
    await open.click();

    const dialog = page.getByRole('dialog', { name: 'Report a Bug' });
    await expect(dialog.getByRole('heading', { name: 'Report a Bug' })).toBeFocused();
    await dialog.getByLabel('Subject').fill('Preview');
    await dialog.getByLabel('Description').fill('The date shows as a number.');
    const email = dialog.getByLabel('Your email');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await email.fill('not-an-address');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('alert')).toHaveText('Enter an email address like name@example.com, or leave it empty.');

    await email.fill('liga@example.com');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Thank you! Your report has been sent.');
    await page.waitForTimeout(2500);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
  });
});
