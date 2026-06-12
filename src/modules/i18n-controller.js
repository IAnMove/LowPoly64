import { getNextLanguage, translate } from './i18n-core.js';

export function createI18nController({
  translations = {},
  defaultLang = 'en',
  initialLang,
  loadLanguage = (fallback) => fallback,
  saveLanguage = () => {},
  translateCommand = translate,
  getNextLanguageCommand = getNextLanguage,
  applyTranslationsToDocumentCommand = () => {},
} = {}) {
  let currentLang = initialLang ?? loadLanguage(defaultLang);
  const langChangeCallbacks = [];

  function t(key, params) {
    return translateCommand(translations, currentLang, key, params);
  }

  function getLang() {
    return currentLang;
  }

  function applyTranslations() {
    applyTranslationsToDocumentCommand(t, currentLang);
    langChangeCallbacks.forEach((callback) => callback(currentLang));
  }

  function setLang(lang) {
    currentLang = lang;
    saveLanguage(lang);
    applyTranslations();
  }

  function toggleLang() {
    setLang(getNextLanguageCommand(currentLang));
  }

  function onLangChange(callback) {
    langChangeCallbacks.push(callback);
  }

  function initI18n() {
    applyTranslations();
  }

  return {
    getLang,
    initI18n,
    onLangChange,
    setLang,
    t,
    toggleLang,
  };
}
