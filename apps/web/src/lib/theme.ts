export const themeStorageKey = 'nexo-theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
}

export function isThemePreference(
  value: string | null,
): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export const themeBootstrapScript = `(() => {
  try {
    const key = '${themeStorageKey}';
    const stored = localStorage.getItem(key);
    const preference = stored === 'light' || stored === 'dark' ? stored : 'system';
    const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themePreference = preference;
  } catch { document.documentElement.dataset.theme = 'light'; }
})();`
