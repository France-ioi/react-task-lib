import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import frJSON from './lang/fr.json';
import enJSON from './lang/en.json';
import deJSON from './lang/de.json';
import esJSON from './lang/es.json';

i18n.use(initReactI18next).init({
  resources: {
    fr: { ...frJSON },
    en: { ...enJSON },
    de: { ...deJSON },
    es: { ...esJSON },
  },
  lng: "fr",
});
