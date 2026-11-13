import {describe, expect, it} from 'vitest';
import {createTranslator, LANGUAGES} from './index';
import fr from './fr.json';

type Dict = {[key: string]: string | Dict};
const keysOf = (dict: Dict, prefix = ''): string[] =>
  Object.keys(dict).flatMap((key) => {
    const value = dict[key]!;
    return typeof value === 'string' ? [prefix + key] : keysOf(value, `${prefix}${key}.`);
  });

describe('lib translations', () => {
  it('defaults to French, interpolates {{values}}', () => {
    const t = createTranslator();
    expect(t('app.validate')).toBe('Valider');
    expect(t('modal.upgrade.proposal', {stars: 3})).toBe("Nous vous proposons d'essayer la version 3 étoiles.");
  });

  it('translates to the other languages and falls back to French, then to the key', () => {
    expect(createTranslator('en')('app.validate')).toBe('Validate');
    expect(createTranslator('xx')('app.validate')).toBe('Valider');
    expect(createTranslator('en')('unknown.key')).toBe('unknown.key');
  });

  it.each(LANGUAGES)('%s has every key of fr', async (language) => {
    const dict = (await import(`./${language}.json`)).default.translation as Dict;
    expect(keysOf(dict).sort()).toEqual(keysOf(fr.translation as Dict).sort());
  });
});
