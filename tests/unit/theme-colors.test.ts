import { describe, expect, it } from 'vitest';
import themeColors from '@/styles/themeColors.json';

/** Every leaf path of a nested token object, e.g. `orders.cardBg` or `base.primary.main`. */
function leaves(value: unknown, prefix = ''): [string, unknown][] {
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, value]];
}

const COLOUR =
  /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/;
const SHADOW = /^(\d+(px)? \d+(px)? \d+px( \d+px)? rgba?\([^)]*\)(, )?)+$/;

describe('themeColors.json', () => {
  const light = leaves(themeColors.light);
  const dark = leaves(themeColors.dark);

  it('has exactly the same token keys in light and dark', () => {
    expect(dark.map(([path]) => path).sort()).toEqual(light.map(([path]) => path).sort());
  });

  it.each([...light.map((e) => ['light', ...e]), ...dark.map((e) => ['dark', ...e])])(
    '%s %s is a colour or a shadow',
    (_mode, path, value) => {
      expect(typeof value).toBe('string');
      const ok =
        COLOUR.test(value as string) ||
        (String(path).endsWith('Shadow') && SHADOW.test(value as string));
      expect(ok, `${String(path)} = ${String(value)}`).toBe(true);
    },
  );

  it('contains every documented group', () => {
    expect(Object.keys(themeColors.light).sort()).toEqual(
      ['admin', 'audit', 'auth', 'base', 'orders', 'provider', 'shell', 'status'].sort(),
    );
  });
});
