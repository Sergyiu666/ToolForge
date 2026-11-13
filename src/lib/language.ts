export type Language = 'ro' | 'en';
export const DEFAULT_LANGUAGE: Language = 'ro';
export const LANGUAGE_STORAGE_KEY = 'toolforge-language';
export function savedLanguage(value: string | null): Language {
  return value === 'en' ? 'en' : DEFAULT_LANGUAGE;
}