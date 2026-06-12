export function translate(translations, lang, key, params) {
  const entry = translations[key];
  if (!entry) return key;

  let text = entry[lang] || entry.en || key;
  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      text = text.replace(`{${paramKey}}`, value);
    }
  }
  return text;
}

export function getNextLanguage(lang) {
  return lang === 'en' ? 'es' : 'en';
}
