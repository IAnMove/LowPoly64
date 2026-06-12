export function applyTranslationsToDocument(translate, lang, root = globalThis.document) {
  root?.querySelectorAll?.('[data-i18n]')?.forEach((element) => {
    const key = element.getAttribute('data-i18n');
    const target = element.getAttribute('data-i18n-attr');
    const text = translate(key);

    if (target === 'placeholder') {
      element.placeholder = text;
    } else if (target === 'title') {
      element.title = text;
    } else {
      element.textContent = text;
    }
  });

  const flag = root?.getElementById?.('lang-toggle');
  if (flag) flag.textContent = lang === 'en' ? 'EN' : 'ES';
}

export function createI18nDomAdapter({ root = globalThis.document } = {}) {
  return {
    applyTranslationsToDocument: (translate, lang) => applyTranslationsToDocument(translate, lang, root),
  };
}
