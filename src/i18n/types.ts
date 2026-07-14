export type GCCLocale = "en" | "ar";

export type GCCDirection = "ltr" | "rtl";

export type TranslationParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export type TranslationDictionary = Readonly<Record<string, string>>;

export type TranslationKey = string;

export type GCCLocaleContextValue = {
  locale: GCCLocale;
  direction: GCCDirection;
  setLocale: (locale: GCCLocale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatNumber: (value: number | bigint) => string;
  formatPercent: (value: number) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDuration: (elapsedMs: number) => string;
  formatSessionProgress: (current: number, total: number) => string;
};
