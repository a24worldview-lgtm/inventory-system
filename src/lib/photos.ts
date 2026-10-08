import { getSupabase, isSupabaseConfigured } from './supabase';
import { newId } from './migrate';
import type { GuidePhoto } from './types';

// 写真の保存。スマホの写真は1枚数MBあるので、送る前に端末側で縮小してから保存する。

const BUCKET = 'sm-photos';
const FULL_MAX_PX = 1600; // 拡大表示用。スマホ画面で細部まで見える大きさ
const THUMB_MAX_PX = 480; // 一覧用
const JPEG_QUALITY = 0.82;

export const canUploadPhotos = isSupabaseConfigured;

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap は写真の向き（縦横）を正しく扱える。使えない環境では <img> で読む
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* 下の方法で読み直す */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resize(img: ImageBitmap | HTMLImageElement, maxPx: number): Promise<Blob> {
  const w = img.width;
  const h = img.height;
  const scale = Math.min(1, maxPx / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('画像を処理できませんでした'));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を変換できませんでした'))), 'image/jpeg', JPEG_QUALITY),
  );
}

/** 写真を縮小して保存し、画面で使える情報を返す（置き方の見本・引き継ぎメモで共通） */
export async function uploadGuidePhoto(file: File, folder: string): Promise<GuidePhoto> {
  const img = await loadImage(file);
  const [full, thumb] = await Promise.all([resize(img, FULL_MAX_PX), resize(img, THUMB_MAX_PX)]);
  if ('close' in img) img.close();

  const id = newId();
  const path = `${folder}/${id}.jpg`;
  const thumbPath = `${folder}/${id}_thumb.jpg`;
  const storage = getSupabase().storage.from(BUCKET);
  for (const [p, blob] of [
    [path, full],
    [thumbPath, thumb],
  ] as const) {
    const { error } = await storage.upload(p, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (error) throw new Error(`写真の保存に失敗しました：${error.message}`);
  }
  return { id, path, thumbPath };
}

export async function deleteGuidePhoto(photo: GuidePhoto): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).remove([photo.path, photo.thumbPath]);
  if (error) console.error('写真の削除に失敗しました（画面からは消えています）', error);
}

export function photoUrl(path: string): string {
  if (!isSupabaseConfigured) return '';
  return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
