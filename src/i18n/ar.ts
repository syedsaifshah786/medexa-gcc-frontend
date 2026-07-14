import legacyArabic from "./ar.json";
import { ambientTranslations } from "./dictionaries/ambient";
import { headerTranslations } from "./dictionaries/header";
import { reviewTranslations } from "./dictionaries/review";
import { sessionTranslations } from "./dictionaries/session";
import type { TranslationDictionary } from "./types";

export const ar = {
  ...legacyArabic,
  ...headerTranslations.ar,
  ...ambientTranslations.ar,
  ...sessionTranslations.ar,
  ...reviewTranslations.ar,
  "brand.medexa": "Medexa",
  "language.english": "English",
  "language.arabic": "العربية",
  "language.current": "اللغة الحالية: {language}",
  "language.switchTo": "التبديل إلى {language}",
  "language.menu": "قائمة اللغة",
  "common.loading": "جارٍ التحميل...",
  "common.retry": "إعادة المحاولة",
  "common.clear": "مسح",
  "common.delete": "حذف",
  "common.continue": "متابعة",
  "common.saveAndContinue": "حفظ ومتابعة",
  "common.backToHome": "العودة إلى الرئيسية",
  "common.seeDocument": "عرض المستند",
  "common.updatedJustNow": "تم التحديث الآن",
  "common.networkError": "حدث خطأ في الاتصال بالشبكة.",
  "common.unableToSave": "تعذر الحفظ.",
  "validation.required": "هذا الحقل مطلوب.",
  "validation.validDate": "يرجى إدخال تاريخ صحيح.",
  "meta.title": "Medexa | الجلسة السريرية لدول مجلس التعاون الخليجي",
  "meta.description": "مساحة Medexa للجلسات السريرية والاستماع المحيطي في دول مجلس التعاون الخليجي",
} satisfies TranslationDictionary;

export default ar;
