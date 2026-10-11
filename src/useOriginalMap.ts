import { useEffect, useState } from 'react';
import { SOURCE_HEIGHT, SOURCE_WIDTH } from './originalMap';

type SavedMap = { file: Blob; name: string };
const bundledMap = __DEFAULT_MAP_FILE__ ? `${import.meta.env.BASE_URL}maps/${encodeURIComponent(__DEFAULT_MAP_FILE__)}` : null;

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('tkg-original-map', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readImage() {
  const db = await database();
  try {
    return await new Promise<SavedMap | undefined>((resolve, reject) => {
      const request = db.transaction('images').objectStore('images').get('original');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function saveImage(image: SavedMap) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      transaction.objectStore('images').put(image, 'original');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export function useOriginalMap() {
  const [image, setImage] = useState<SavedMap | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    void readImage().then(saved => { if (active && saved?.file instanceof Blob) setImage(saved); }).catch(() => {
      if (active && !bundledMap) setMessage('本地原图无法读取，请重新选择图片。');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!image) { setUrl(null); return; }
    const objectUrl = URL.createObjectURL(image.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  async function choose(file?: File) {
    if (!file) return;
    setMessage('');
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 原图文件。');
      if (file.size > 20 * 1024 * 1024) throw new Error('请选择小于 20 MB 的原图。');
      const bitmap = await createImageBitmap(file);
      const correctRatio = Math.abs(bitmap.width / bitmap.height - SOURCE_WIDTH / SOURCE_HEIGHT) < .03;
      const sufficientSize = bitmap.width >= 800 && bitmap.height >= 500;
      bitmap.close();
      if (!correctRatio || !sufficientSize) throw new Error('请选择你提供的那张完整横版地图（1684 × 1190 或相同比例），以保持点击区域对齐。');
      // Keep the exact uploaded bytes. No canvas redraw, conversion, or compression.
      const next = { file, name: file.name };
      await saveImage(next).then(() => setMessage('原图已保存到此浏览器，刷新后仍可使用。')).catch(() => setMessage('原图已打开，但此浏览器无法保存；请保留文件，下次重新选择。'));
      setImage(next);
    } catch (error) { setMessage(error instanceof Error ? error.message : '图片无法打开，请选择原始图片文件。'); }
  }
  return { src: loading ? null : url ?? bundledMap, loading, choose, message, name: image?.name ?? __DEFAULT_MAP_FILE__, local: !!image };
}
