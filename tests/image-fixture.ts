import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// A clearly artificial color chart, used only for testing image preservation.
// This is never copied into public/, committed as a map, or shown to users.
export async function chooseImageFixture(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1684; canvas.height = 1190;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#8fce85'; ctx.fillRect(0, 0, 1684, 1190);
    ctx.fillStyle = '#217dda'; ctx.fillRect(440, 260, 190, 170);
    ctx.fillStyle = '#e5584f'; ctx.fillRect(700, 420, 200, 160);
    ctx.fillStyle = '#272727'; ctx.font = '32px sans-serif';
    ctx.fillText('AUTOMATED TEST COLOR CHART — NOT A MAP', 80, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const buffer = Buffer.from(base64, 'base64');
  await page.getByLabel('选择原图文件').setInputFiles({ name: 'test-color-chart.png', mimeType: 'image/png', buffer });
  await expect(page.locator('[data-original-map]')).toHaveAttribute('href', /^blob:/);
  return buffer;
}
