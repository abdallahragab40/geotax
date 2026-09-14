// تصدير تقرير إلى ملف Excel أو PDF ومشاركته
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

// rows: مصفوفة كائنات (المفاتيح = رؤوس الأعمدة العربية)
export async function exportToExcel(rows: Record<string, any>[], fileName: string): Promise<void> {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تقرير");
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

  const uri = FileSystem.cacheDirectory + fileName + ".xlsx";
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "تصدير التقرير",
      UTI: "com.microsoft.excel.xlsx",
    });
  }
}

// تصدير إلى PDF (مع جدول HTML بسيط)
export async function exportToPDF(rows: Record<string, any>[], title: string): Promise<void> {
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const tableRows = rows.map((r) =>
    `<tr>${cols.map((c) => `<td>${String(r[c] ?? "").replace(/</g, "&lt;")}</td>`).join("")}</tr>`
  ).join("");
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, sans-serif; padding: 16px; direction: rtl; }
  h1 { font-size: 18px; text-align: center; color: #0E7C66; }
  .date { text-align: center; color: #64748B; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #E2E8F0; padding: 6px; text-align: right; }
  th { background: #F1F5F9; color: #0F172A; font-weight: 700; }
  tr:nth-child(even) { background: #FAFBFC; }
</style></head><body>
<h1>${title}</h1>
<div class="date">${new Date().toLocaleString("ar-EG")}</div>
<table>
  <thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "تصدير PDF",
      UTI: "com.adobe.pdf",
    });
  }
}
