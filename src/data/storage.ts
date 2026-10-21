// رفع الصور إلى Supabase Storage (bucket: attachments)
import { supabase } from "../lib/supabase";

const BUCKET = "attachments";

// رفع صورة من مسار محلي وإرجاع رابطها العام
export async function uploadPhoto(localUri: string): Promise<string> {
  const ext = (localUri.split(".").pop()?.split("?")[0] || "jpg").toLowerCase();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  // قراءة الملف المحلي كبيانات ثنائية
  const res = await fetch(localUri);
  const arrayBuffer = await res.arrayBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPhotos(localUris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const uri of localUris) {
    urls.push(await uploadPhoto(uri));
  }
  return urls;
}

// ===== عرض الصور من المساحة الخاصة =====
// الروابط المحفوظة بالسجلات بصيغة الرابط العام؛ بعد جعل المساحة خاصة
// نستخرج مسار الملف ونطلب رابطًا موقّعًا مؤقتًا (يُخزَّن مؤقتًا لتقليل الطلبات)
const SIGNED_TTL = 60 * 60; // ثانية
const signedCache = new Map<string, { url: string; expires: number }>();

export function storagePathFromUrl(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/attachments\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function resolvePhotoUrl(url: string): Promise<string> {
  const path = storagePathFromUrl(url);
  if (!path) return url; // صورة محلية أو رابط خارجي
  const cached = signedCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return url;
  signedCache.set(path, { url: data.signedUrl, expires: Date.now() + (SIGNED_TTL - 60) * 1000 });
  return data.signedUrl;
}
