let translations: Record<string, string> = {};

export async function loadLocale(locale: string): Promise<void> {
  const module = await import(`./locales/${locale}.json`);
  translations = module.default;
}

export function t(key: string, params?: Record<string, string>): string {
  let value = translations[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replaceAll(`{${k}}`, v);
    }
  }
  return value;
}
