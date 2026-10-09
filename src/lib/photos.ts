import { supabase } from './supabase';

/** Réduit une image (max 900 px, JPEG) pour un envoi rapide depuis le téléphone. */
async function resizeImage(file: File, max = 900): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Image illisible'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversion impossible'))), 'image/jpeg', 0.85)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Envoie la photo dans le stockage Supabase (dossier de l'utilisateur) et renvoie son adresse publique.
 * En mode démo (sans Supabase), renvoie l'image encodée localement.
 */
export async function uploadProfilePhoto(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez une image (JPG, PNG…).');
  if (file.size > 15 * 1024 * 1024) throw new Error('Image trop lourde (15 Mo maximum).');
  const blob = await resizeImage(file);
  if (!supabase) {
    return await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });
  }
  const path = `${userId}/photo-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error("L'envoi de la photo a échoué. Réessayez.");
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
