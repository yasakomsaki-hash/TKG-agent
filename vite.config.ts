import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync } from 'node:fs';

const maps = readdirSync(new URL('./public/maps', import.meta.url)).filter(name => /\.(jpe?g|png|webp)$/i.test(name));
const preferred = maps.filter(name => /^site-map\./i.test(name));
if (preferred.length > 1 || (maps.length > 1 && preferred.length !== 1)) throw new Error('public/maps 中有多张图片。请只保留一张默认原图，或将其命名为 site-map.jpg/png/webp。');

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { __DEFAULT_MAP_FILE__: JSON.stringify(preferred[0] ?? maps[0] ?? null) },
});
