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
