// Guards Important #1/#3 from the final review: because tests mock next-intl
// (each file's own vi.mock), a `t('key.that.doesnt.exist')` never fails a
// test — next-intl's real runtime would show the raw path instead (no
// getMessageFallback configured). This walks the feature's source and checks
// every static `t('...')` / `t(`...`)` key exists in all three locales.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import en from '../../../../shared/i18n-messages/en.json';
import es from '../../../../shared/i18n-messages/es.json';
import pt from '../../../../shared/i18n-messages/pt.json';

const FEATURE_DIR = dirname(new URL(import.meta.url).pathname);
const NAMESPACE = 'platformAdmin.blueprints';
const MESSAGES: Record<string, unknown> = { en, es, pt };

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [full];
  });
}

// Matches `t(...)`, `t.has(...)`, `t.rich(...)` — but not `tm(...)` (a
// different namespace, TemplateSelect.tsx) — capturing a plain string/
// template literal with no interpolation.
const T_CALL = /\bt(?:\.has|\.rich)?\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;

function extractKeys(source: string): string[] {
  const keys: string[] = [];
  for (const m of source.matchAll(T_CALL)) {
    const literal = m[2];
    if (literal.includes('${')) continue; // dynamic key, e.g. `errors.${code}` — checked separately below
    keys.push(literal);
  }
  return keys;
}

function has(messages: unknown, path: string): boolean {
  return path.split('.').reduce<unknown>((node, part) => (
    node && typeof node === 'object' && part in (node as Record<string, unknown>) ? (node as Record<string, unknown>)[part] : undefined
  ), messages) !== undefined;
}

describe('blueprints i18n key coverage', () => {
  const files = collectSourceFiles(FEATURE_DIR);
  const keysByFile = new Map(files.map((f) => [f, extractKeys(readFileSync(f, 'utf8'))]));

  it('found t(...) usages to check (sanity — catches the scan itself breaking)', () => {
    const total = [...keysByFile.values()].reduce((n, ks) => n + ks.length, 0);
    expect(total).toBeGreaterThan(50);
  });

  for (const locale of ['pt', 'en', 'es'] as const) {
    it(`every static key resolves in ${locale}.json under ${NAMESPACE}`, () => {
      const missing: string[] = [];
      for (const [file, keys] of keysByFile) {
        for (const key of keys) {
          if (!has(MESSAGES[locale], `${NAMESPACE}.${key}`)) missing.push(`${file.replace(FEATURE_DIR, '.')}: ${key}`);
        }
      }
      expect(missing).toEqual([]);
    });
  }

  // The runtime error/analysis codes are read with a dynamic key
  // (`errors.${code}`), which the static scan above can't see. Pin the full
  // code list here instead — this is exactly what caught Important #1.
  it('covers every backend/analyzer error code plus GENERIC in all three locales', () => {
    const codes = [
      'GENERIC', 'BLUEPRINT_NOT_FOUND', 'VERSION_NOT_FOUND', 'NOT_PUBLISHED', 'ANALYSIS_FAILED',
      'INVALID_GRAPH', 'NO_TRIGGER', 'MULTIPLE_TRIGGERS', 'UNREACHABLE_NODE', 'CYCLE', 'DANGLING_PATH',
      'CONDITION_PORTS', 'UNKNOWN_NODE', 'INVALID_CONFIG', 'BAD_REFERENCE', 'TYPE_MISMATCH', 'RESTRICTED_FIELD',
      'PERSONAL_NOT_ALLOWED', 'MISSING_DEDUPE_KEY', 'WAIT_TOO_LONG', 'TOO_MANY_NODES',
      'PORT_EDGES', 'SECRET_NOT_ALLOWED', 'JSON_PATH',
    ];
    for (const locale of ['pt', 'en', 'es'] as const) {
      for (const code of codes) {
        expect(has(MESSAGES[locale], `${NAMESPACE}.errors.${code}`), `${locale}: errors.${code}`).toBe(true);
      }
    }
  });
});
