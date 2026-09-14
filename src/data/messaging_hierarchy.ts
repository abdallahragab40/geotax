// قواعد المراسلات حسب الدور — يُستخدم لتصفية قائمة الجهات المتاحة للمراسلة
import { Profile, Role } from "../types";

// أدوار يستطيع كل دور التواصل معها
const ALLOWED_TO_TALK_TO: Record<string, Role[]> = {
  taxpayer: ["surveyor", "examiner"],
  surveyor: ["taxpayer", "survey_reviewer", "survey_manager", "office_head"],
  examiner: ["taxpayer", "exam_reviewer", "exam_manager", "office_head"],
  survey_reviewer: ["surveyor", "survey_manager", "office_head"],
  exam_reviewer: ["examiner", "exam_manager", "office_head"],
  survey_manager: ["surveyor", "survey_reviewer", "office_head"],
  exam_manager: ["examiner", "exam_reviewer", "office_head"],
  it_manager: [
    "surveyor", "examiner", "survey_reviewer", "exam_reviewer",
    "survey_manager", "exam_manager", "office_head",
  ],
  office_head: [
    "surveyor", "examiner", "survey_reviewer", "exam_reviewer",
    "survey_manager", "exam_manager", "it_manager", "admin",
  ],
  admin: [
    "office_head", "it_manager", "survey_manager", "exam_manager",
    "survey_reviewer", "exam_reviewer", "surveyor", "examiner",
  ],
};

export function getAllowedContacts(
  myProfile: Profile | null,
  candidates: Profile[]
): Profile[] {
  if (!myProfile) return [];
  const allowed = ALLOWED_TO_TALK_TO[myProfile.role] ?? [];
  return candidates.filter(
    (p) =>
      p.id !== myProfile.id &&
      allowed.includes(p.role as Role) &&
      // داخل نفس المأمورية (إلا إن أحد الطرفين أدمن)
      (myProfile.role === "admin" ||
       p.role === "admin" ||
       p.office_id == null ||
       p.office_id === myProfile.office_id)
  );
}
