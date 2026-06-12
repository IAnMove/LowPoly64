import { createI18nController } from './i18n-controller.js';
import { createI18nDomAdapter } from './i18n-dom.js';
import { loadStoredLanguage, saveStoredLanguage } from './i18n-storage.js';
import { translations } from './i18n-translations.js';

export function createBrowserI18nController({
  root = globalThis.document,
  createI18nDom = createI18nDomAdapter,
  createFacadeController = createI18nController,
  translations: browserTranslations = translations,
  defaultLang = 'en',
  initialLang,
  loadLanguage = loadStoredLanguage,
  saveLanguage = saveStoredLanguage,
  applyTranslationsToDocumentCommand,
} = {}) {
  const resolvedApplyTranslations = applyTranslationsToDocumentCommand
    ?? createI18nDom({ root }).applyTranslationsToDocument;

  return createFacadeController({
    translations: browserTranslations,
    defaultLang,
    initialLang,
    loadLanguage,
    saveLanguage,
    applyTranslationsToDocumentCommand: resolvedApplyTranslations,
  });
}
