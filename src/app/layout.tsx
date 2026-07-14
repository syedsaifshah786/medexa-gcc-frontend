import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { DoctorProvider } from "@/components/DoctorContext";
import { translate } from "@/i18n";
import type { GCCLocale } from "@/i18n/types";
import { GCCLocaleProvider } from "@/providers/GCCLocaleProvider";
import { GCCVoiceSessionProvider } from "@/providers/GCCVoiceSessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  display: "swap",
});

const GCC_LOCALE_STORAGE_KEY = "medexa_gcc_locale";

function getLocaleBootstrapScript(serverLocale: GCCLocale) {
  return `
  (function () {
    var root = document.documentElement;
    try {
      var key = ${JSON.stringify(GCC_LOCALE_STORAGE_KEY)};
      var legacyKey = "medexa-language";
      var stored = localStorage.getItem(key);
      if (stored !== "en" && stored !== "ar") {
        var legacy = localStorage.getItem(legacyKey);
        stored = legacy === "ar" ? "ar" : ${JSON.stringify(serverLocale)};
        localStorage.setItem(key, stored);
        localStorage.removeItem(legacyKey);
      }
      root.lang = stored;
      root.dir = stored === "ar" ? "rtl" : "ltr";
      root.dataset.gccLocale = stored;
      if (stored !== ${JSON.stringify(serverLocale)}) {
        root.dataset.gccLocaleReady = "false";
        document.cookie = key + "=" + stored + "; Path=/; Max-Age=31536000; SameSite=Lax";
        var marker = key + "_reload_" + stored;
        if (sessionStorage.getItem(marker) !== "1") {
          sessionStorage.setItem(marker, "1");
          location.reload();
          return;
        }
      }
      sessionStorage.removeItem(key + "_reload_en");
      sessionStorage.removeItem(key + "_reload_ar");
      root.dataset.gccLocaleReady = "true";
    } catch (_) {
      root.dataset.gccLocaleReady = "true";
    }
  })();
`;
}

async function getServerLocale(): Promise<GCCLocale> {
  const cookieStore = await cookies();
  return cookieStore.get(GCC_LOCALE_STORAGE_KEY)?.value === "ar" ? "ar" : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: translate(locale, "meta.title"),
    description: translate(locale, "meta.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={direction}
      data-gcc-locale={locale}
      data-gcc-locale-ready="true"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: getLocaleBootstrapScript(locale) }} />
        <GCCLocaleProvider initialLocale={locale}>
          <DoctorProvider>
            <GCCVoiceSessionProvider>{children}</GCCVoiceSessionProvider>
          </DoctorProvider>
        </GCCLocaleProvider>
      </body>
    </html>
  );
}
