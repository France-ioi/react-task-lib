import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';

type Dictionary = {[key: string]: string | Dictionary};

const DICTIONARIES: Record<string, Dictionary> = {
  fr: fr.translation,
  en: en.translation,
  de: de.translation,
  es: es.translation,
};

export const DEFAULT_LANGUAGE = 'fr';
export const LANGUAGES = Object.keys(DICTIONARIES);

function lookup(dictionary: Dictionary | undefined, key: string): string | undefined {
  let node: string | Dictionary | undefined = dictionary;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The lib's own translations (a private, tiny i18n: no global i18next instance that could clash
 * with the task's). Falls back to French, then to the key.
 */
export function createTranslator(language: string = DEFAULT_LANGUAGE): Translate {
  const dictionary = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE];
  return (key, values) => {
    const text = lookup(dictionary, key) ?? lookup(DICTIONARIES[DEFAULT_LANGUAGE], key) ?? key;
    return values ? text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => String(values[name] ?? match)) : text;
  };
}
