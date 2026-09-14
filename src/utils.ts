// دوال مساعدة عامة

// تنسيق التاريخ والوقت بصيغة عربية مبسّطة (يعمل بدون Intl)
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${date} - ${time}`;
}

// عرض الإحداثيات بشكل مختصر
export function formatCoords(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "لم يُسجّل موقع";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
