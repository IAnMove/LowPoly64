import { createBrowserI18nController } from './i18n-browser-adapter.js';

const i18nController = createBrowserI18nController();

export function t(key, params) {
  return i18nController.t(key, params);
}

export function getLang() {
  return i18nController.getLang();
}

export function setLang(lang) {
  return i18nController.setLang(lang);
}

export function toggleLang() {
  return i18nController.toggleLang();
}

export function onLangChange(cb) {
  return i18nController.onLangChange(cb);
}

export function initI18n() {
  return i18nController.initI18n();
}
