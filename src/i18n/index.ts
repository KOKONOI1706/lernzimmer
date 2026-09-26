import { dictionaries, type Lang, type StringKey } from './strings';
import { useSettings } from '../state/settings';

export function translate(lang: Lang, key: StringKey): string {
  return dictionaries[lang][key] ?? dictionaries.de[key] ?? key;
}

/** Returns a `t(key)` bound to the current UI language. */
export function useT() {
  const lang = useSettings((s) => s.lang);
  return (key: StringKey) => translate(lang, key);
}

/** Fill "{n} Karten" style placeholders. */
export const fmt = (str: string, vars: Record<string, string | number>) =>
  str.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

export type { Lang, StringKey };
