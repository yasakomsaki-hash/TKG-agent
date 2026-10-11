import { expect, test } from '@playwright/test';
import { chooseImageFixture } from './image-fixture';

test('keeps the uploaded image bytes unchanged and restores them after reload', async ({ page }) => {
  await page.goto('./');
  const uploaded = await chooseImageFixture(page);
  async function displayedBytes() {
    return Buffer.from(await page.locator('[data-original-map]').evaluate(async image => {
      const response = await fetch(image.getAttribute('href')!);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    }));
  }
  expect(await displayedBytes()).toEqual(uploaded);
  await expect(page.locator('.roads,.venue-shape,.venue-label')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-original-map]')).toHaveAttribute('href', /^blob:/);
  expect(await displayedBytes()).toEqual(uploaded);
});

test('clicking AQC keeps the same original image inside the highlight mask', async ({ page }) => {
  await page.goto('./');
  await chooseImageFixture(page);
  await page.getByRole('button', { name: 'AQC OCBC Aquatic Centre', exact: true }).click();
  const baseImage = await page.locator('[data-original-map]').getAttribute('href');
  await expect(page.locator('[data-highlighted=aqc] image')).toHaveAttribute('href', baseImage!);
  await expect(page.locator('[data-highlighted=aqc] image')).toHaveAttribute('clip-path', 'url(#original-clip-aqc)');
  await expect(page.locator('.muted-map')).toHaveAttribute('filter', 'url(#grayscale)');
  await expect(page.getByRole('region', { name: '选中地点资料' })).toContainText('OCBC Aquatic Centre');
});

test('rejects invalid images without replacing the currently selected original', async ({ page }) => {
  await page.goto('./');
  const uploaded = await chooseImageFixture(page);
  const src = await page.locator('[data-original-map]').getAttribute('href');
  await page.getByLabel('选择原图文件').setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('broken image') });
  await expect(page.locator('.map-image-message')).not.toHaveText('原图已保存到此浏览器，刷新后仍可使用。');
  await expect(page.locator('[data-original-map]')).toHaveAttribute('href', src!);
  expect(uploaded.length).toBeGreaterThan(100);
});

test('preserves old facility data and requests coordinate review until it is moved', async ({ page }) => {
  await page.goto('./');
  await chooseImageFixture(page);
  const old = { id: 'existing-user-location', type: 'locker', name: '我的旧储物柜', venueId: 'aqc', x: 350, y: 300, description: '保留这份说明' };
  await page.evaluate(data => localStorage.setItem('tkg-work-map.locations.v1', JSON.stringify({ version: 1, locations: [data] })), old);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('1 个设施资料已保留');
  await page.locator('.facility-marker').click();
  await expect(page.getByRole('region', { name: '选中地点资料' })).toContainText('保留这份说明');
  await page.getByRole('button', { name: '编辑地图' }).click();
  await page.getByRole('button', { name: '修改资料' }).click();
  await page.getByRole('button', { name: '重新选择位置' }).click();
  await page.locator('.site-map').click({ position: { x: 240, y: 260 } });
  await page.getByRole('button', { name: '保存设施' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tkg-work-map.locations.v1')!));
  expect(saved.mapId).toBe('original-map-1684x1190-v1');
  expect(saved.locations[0]).toMatchObject({ id: old.id, description: old.description });
});

test('missing source image prompts for the original and does not show a fabricated map', async ({ page }) => {
  await page.route('**/maps/*', route => route.abort());
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /选择你的原本地图|原图未能加载/ })).toBeVisible();
  await expect(page.locator('.site-map')).toHaveCount(0);
  await page.getByRole('button', { name: '编辑地图' }).click();
  await expect(page.getByRole('button', { name: '添加设施' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /上传原图到 GitHub/ })).toHaveAttribute('href', 'https://github.com/yasakomsaki-hash/TKG-agent/upload/main/public/maps');
});
