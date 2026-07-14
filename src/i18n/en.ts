import legacyEnglish from "./en.json";
import { ambientTranslations } from "./dictionaries/ambient";
import { headerTranslations } from "./dictionaries/header";
import { reviewTranslations } from "./dictionaries/review";
import { sessionTranslations } from "./dictionaries/session";
import type { TranslationDictionary } from "./types";

export const en = {
  ...legacyEnglish,
  ...headerTranslations.en,
  ...ambientTranslations.en,
  ...sessionTranslations.en,
  ...reviewTranslations.en,
  "brand.medexa": "Medexa",
  "language.english": "English",
  "language.arabic": "العربية",
  "language.current": "Current language: {language}",
  "language.switchTo": "Switch to {language}",
  "language.menu": "Language menu",
  "common.loading": "Loading...",
  "common.retry": "Try again",
  "common.clear": "Clear",
  "common.delete": "Delete",
  "common.continue": "Continue",
  "common.saveAndContinue": "Save & Continue",
  "common.backToHome": "Back to Home",
  "common.seeDocument": "See Document",
  "common.updatedJustNow": "Updated just now",
  "common.networkError": "A network error occurred.",
  "common.unableToSave": "Unable to save.",
  "validation.required": "This field is required.",
  "validation.validDate": "Please enter a valid date.",
  "meta.title": "Medexa GCC Clinical Session",
  "meta.description": "Medexa GCC ambient clinical session workspace",
} satisfies TranslationDictionary;

export default en;
