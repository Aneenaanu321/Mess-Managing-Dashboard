"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ar";

const DICTS: Record<Locale, Record<string, string>> = {
  en: {
    "nav.fieldOps": "Field Ops",
    "nav.teamTasks": "Team Tasks",
    "nav.settings": "Settings",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.loading": "Loading…",
    "fieldOps.title": "Field Ops",
    "fieldOps.description": "Your assigned jobs, SOP checklists, document packs, and end-of-day originals return.",
    "fieldOps.schedule": "Your schedule",
    "fieldOps.eod": "End of day — originals",
    "fieldOps.returnAll": "Return originals for all my done jobs",
    "fieldOps.guide": "Field Ops SOP guide",
    "fieldOps.pendingSync": "Pending offline sync",
    "fieldOps.reorder": "Visit order",
    "fieldOps.openMaps": "Open in maps",
    "settings.language": "Language",
    "settings.languageHint": "UI language pack (English / العربية). Stored on this device.",
    "cti.callAndLog": "Call & log",
    "cti.outboundCall": "Outbound call",
  },
  ar: {
    "nav.fieldOps": "عمليات الميدان",
    "nav.teamTasks": "مهام الفريق",
    "nav.settings": "الإعدادات",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.loading": "جاري التحميل…",
    "fieldOps.title": "عمليات الميدان",
    "fieldOps.description": "المهام المعيّنة وقوائم SOP والمستندات وإرجاع الأصول في نهاية اليوم.",
    "fieldOps.schedule": "جدولك",
    "fieldOps.eod": "نهاية اليوم — الأصول",
    "fieldOps.returnAll": "إرجاع الأصول لجميع المهام المكتملة",
    "fieldOps.guide": "دليل إجراءات الميدان",
    "fieldOps.pendingSync": "مزامنة معلّقة دون اتصال",
    "fieldOps.reorder": "ترتيب الزيارات",
    "fieldOps.openMaps": "فتح في الخرائط",
    "settings.language": "اللغة",
    "settings.languageHint": "حزمة لغة الواجهة (English / العربية). تُحفظ على هذا الجهاز.",
    "cti.callAndLog": "اتصال وتسجيل",
    "cti.outboundCall": "مكالمة صادرة",
  },
};

type LocaleCtx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
};

const Ctx = createContext<LocaleCtx | null>(null);
const STORAGE_KEY = "ibtech-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<LocaleCtx>(() => {
    function setLocale(next: Locale) {
      setLocaleState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    function t(key: string) {
      return DICTS[locale][key] ?? DICTS.en[key] ?? key;
    }
    return { locale, setLocale, t, dir: locale === "ar" ? "rtl" : "ltr" };
  }, [locale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Safe for components that may render outside provider during tests. */
export function useT() {
  const ctx = useContext(Ctx);
  return (key: string) => ctx?.t(key) ?? DICTS.en[key] ?? key;
}
