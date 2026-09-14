// إشعارات الدفع معطّلة مؤقتًا (تتطلب إعداد Firebase/FCM للنسخة المستقلة).
// المراسلة تعمل عبر التحديث اللحظي والدوري أثناء فتح التطبيق.
// الدوال محفوظة بنفس التواقيع حتى لا يتأثر باقي الكود.

export async function registerForPush(_userId: string): Promise<void> {
  // لا شيء حاليًا — يُفعّل بعد إعداد FCM
}

export async function sendPush(
  _targetId: string,
  _title: string,
  _body: string
): Promise<void> {
  // لا شيء حاليًا
}

export async function showLocalNotification(
  _title: string,
  _body: string
): Promise<void> {
  // لا شيء حاليًا
}
