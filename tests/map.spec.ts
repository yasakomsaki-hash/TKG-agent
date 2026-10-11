import { expect, test } from '@playwright/test';
import { chooseImageFixture } from './image-fixture';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await chooseImageFixture(page);
});

test('venue search and selection isolate the selected region', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: '搜索场馆或设施' }).fill('AQC');
  await expect(page.locator('.place-item')).toHaveCount(1);
  await page.locator('.place-item').click();
  await expect(page.locator('[data-highlighted=aqc]')).toHaveCount(1);
  await expect(page.locator('.muted-map')).toHaveAttribute('filter', 'url(#grayscale)');
  await expect(page.getByRole('region', { name: '选中地点资料' })).toContainText('OCBC Aquatic Centre');
  await page.getByRole('button', { name: '全部区域' }).click();
  await expect(page.locator('.muted-map')).toHaveCount(0);
});

test('add, persist, filter, edit, move, export and delete a facility', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '编辑地图' }).click();
  await page.getByRole('button', { name: /饮水机.*0 个/ }).click();
  await page.getByRole('button', { name: '添加饮水机' }).click();
  const map = page.locator('.site-map');
  await map.click({ position: { x: 200, y: 200 } });
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('设施名称').fill('AQC 员工入口饮水机');
  await dialog.getByLabel('所属场馆').selectOption('aqc');
  await dialog.getByLabel('位置说明').fill('Level 1，员工入口右侧。');
  await dialog.getByRole('button', { name: '保存设施' }).click();
  await expect(page.locator('.facility-marker')).toHaveCount(1);
  await expect(page.locator('[data-highlighted=aqc]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.facility-marker')).toHaveCount(1);
  await page.getByRole('button', { name: /饮水机.*1 个/ }).click();
  await page.locator('.facility-marker').click();
  await expect(page.getByRole('region', { name: '选中地点资料' })).toContainText('Level 1');
  await page.getByRole('button', { name: '编辑地图' }).click();
  await page.getByRole('button', { name: '修改资料' }).click();
  await dialog.getByLabel('设施名称').fill('AQC 二楼饮水机');
  await dialog.getByRole('button', { name: '重新选择位置' }).click();
  await map.click({ position: { x: 300, y: 280 } });
  await expect(dialog.getByLabel('设施名称')).toHaveValue('AQC 二楼饮水机');
  await dialog.getByRole('button', { name: '保存设施' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份' }).click();
  await expect((await download).suggestedFilename()).toBe('tkg-locations.json');
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.locator('.facility-marker')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.facility-marker')).toHaveCount(0);
});

test('imports are validated and merged without losing existing locations', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '编辑地图' }).click();
  const upload = page.getByLabel('导入设施 JSON');
  const original = { id: 'original', name: 'KTH 储物柜', type: 'locker', venueId: 'kth', description: '入口', x: 810, y: 670 };
  await upload.setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, locations: [original] })) });
  await expect(page.locator('.facility-marker')).toHaveCount(1);
  await upload.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, locations: [{ ...original, x: -1 }] })) });
  await expect(page.getByRole('status')).toContainText('坐标不正确');
  await expect(page.locator('.facility-marker')).toHaveCount(1);
  await upload.setInputFiles({ name: 'second.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, locations: [{ ...original, id: 'second', type: 'ice', name: 'AQC 制冰机', venueId: 'aqc', x: 300, y: 280 }] })) });
  await expect(page.locator('.facility-marker')).toHaveCount(2);
  await page.getByRole('button', { name: /制冰机.*1 个/ }).click();
  await expect(page.locator('.facility-marker')).toHaveCount(1);
  await expect(page.locator('[data-highlighted=aqc]')).toHaveCount(1);
});

test.describe('mobile browser', () => {
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test('mobile layout fits the screen and supports touch editing', async ({ page }) => {
  await page.goto('./');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: '编辑地图' }).tap();
  await page.getByRole('button', { name: '添加设施' }).tap();
  await page.locator('.site-map').tap({ position: { x: 170, y: 210 } });
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('设施名称').fill('SIS 储物柜');
  await dialog.getByLabel('所属场馆').selectOption('sis');
  await dialog.getByRole('button', { name: '保存设施' }).tap();
  await expect(page.locator('.facility-marker')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: '放大地图' }).tap();
  await page.getByRole('button', { name: '重置地图视角' }).tap();
  await expect(page.locator('.site-map')).toHaveAttribute('viewBox', '0 0 1200 900');
});
});

test('unconfirmed facility positions stay empty and no runtime errors occur', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('.facility-marker')).toHaveCount(0);
  await page.getByRole('button', { name: /制冰机.*0 个/ }).click();
  await expect(page.getByText('还没有制冰机位置')).toBeVisible();
  await expect(page.locator('[data-highlighted]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
