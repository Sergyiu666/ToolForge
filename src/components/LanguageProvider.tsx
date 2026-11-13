import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, savedLanguage, type Language } from '@/lib/language';
import { translate } from '@/lib/translations';

const LanguageContext = createContext({ language: DEFAULT_LANGUAGE, setLanguage: (_language: Language) => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  useEffect(() => {
    try { setLanguageState(savedLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))); } catch { /* Storage is optional. */ }
    const sync = (event: StorageEvent) => { if (event.key === LANGUAGE_STORAGE_KEY) setLanguageState(savedLanguage(event.newValue)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Switching still works without storage. */ }
  };
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  return { ...context, t: (text: string, ...values: (string | number)[]) => translate(context.language, text, ...values) };
}