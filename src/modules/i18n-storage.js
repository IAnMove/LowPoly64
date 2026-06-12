const STORAGE_KEY = 'lowpoly64-lang';

function getBrowserStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function loadStoredLanguage(fallback = 'en', storage = getBrowserStorage()) {
  return storage?.getItem(STORAGE_KEY) || fallback;
}

export function saveStoredLanguage(lang, storage = getBrowserStorage()) {
  storage?.setItem(STORAGE_KEY, lang);
}
