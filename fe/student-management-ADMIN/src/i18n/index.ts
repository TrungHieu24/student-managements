import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';

const resources = {
  en: {
    translation: en,
  },
  vi: {
    translation: vi,
  },
};

const language = localStorage.getItem('language') || 'vi';

i18n.use(initReactI18next).init({
  resources,
  lng: language, 
  fallbackLng: 'vi', 
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
