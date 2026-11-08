// Short "Browser · OS" label for the audit trail's Origem column. Plain
// substring rules, no UA-parsing dependency: the raw string stays available
// in the row's tooltip for anything this misreads.

// Order matters: Edge/Opera UAs also say Chrome, Chrome UAs also say Safari.
const BROWSERS: Array<[RegExp, string]> = [
  [/Edg(?:e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

// iOS before macOS: iPhone UAs contain "like Mac OS X".
const SYSTEMS: Array<[RegExp, string]> = [
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux|X11/, 'Linux'],
];

export function summarizeUserAgent(userAgent: string | null | undefined): string | null {
  const ua = userAgent?.trim();
  if (!ua) return null;

  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
  const system = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  if (browser) return system ? `${browser} · ${system}` : browser;

  // Non-browser client (curl, node-fetch…): its product token is the best label.
  const product = /^([A-Za-z][\w.-]*)\//.exec(ua)?.[1];
  return product ?? ua.slice(0, 24);
}
