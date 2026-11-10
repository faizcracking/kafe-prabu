// Upload gambar ke Supabase Storage (bucket "cafe-assets"). Hanya admin yang diizinkan oleh RLS.
export async function uploadAsset(sb, file, folder) {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar');
  if (file.size > 3 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 3 MB');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('cafe-assets').upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw error;
  return sb.storage.from('cafe-assets').getPublicUrl(path).data.publicUrl;
}
