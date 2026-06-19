import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '../lib/firebase';

const MAX_COVER_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadBlogCover(postId: string, file: File): Promise<{ path: string; url: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Formato non supportato. Usa JPEG, PNG o WebP.');
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new Error('Immagine troppo grande (max 2 MB).');
  }
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `blog/covers/${postId}/cover.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return { path, url };
}
