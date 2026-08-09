export interface ChartThemeColors {
  text: string;
  muted: string;
  border: string;
  surface: string;
  green: string;
  red: string;
  primary: string;
  fontFamily: string;
}

const LIGHT_FALLBACK: ChartThemeColors = {
  text: 'rgb(51, 65, 85)',
  muted: 'rgb(100, 116, 139)',
  border: 'rgb(226, 232, 240)',
  surface: 'rgb(255, 255, 255)',
  green: 'rgb(34, 197, 94)',
  red: 'rgb(239, 68, 68)',
  primary: 'rgb(99, 102, 241)',
  fontFamily: 'system-ui, sans-serif',
};

const DARK_FALLBACK: ChartThemeColors = {
  text: 'rgb(241, 245, 249)',
  muted: 'rgb(148, 163, 184)',
  border: 'rgb(51, 65, 85)',
  surface: 'rgb(30, 41, 59)',
  green: 'rgb(74, 222, 128)',
  red: 'rgb(248, 113, 113)',
  primary: 'rgb(129, 140, 248)',
  fontFamily: 'system-ui, sans-serif',
};

/** Chart.js cannot parse oklch CSS variables — resolve to computed rgb(). */
function cssVarToColor(
  property: 'color' | 'backgroundColor',
  name: string,
  fallback: string,
): string {
  if (typeof document === 'undefined') return fallback;

  const probe = document.createElement('span');
  probe.style.display = 'none';
  probe.style[property] = `var(${name}, ${fallback})`;
  document.body.appendChild(probe);

  const resolved = getComputedStyle(probe)[property];
  document.body.removeChild(probe);

  return resolved || fallback;
}

export function readChartThemeColors(isDark: boolean): ChartThemeColors {
  const fallback = isDark ? DARK_FALLBACK : LIGHT_FALLBACK;

  if (typeof document === 'undefined') return fallback;

  const style = getComputedStyle(document.body);
  const fontFamily =
    style.getPropertyValue('--app-font-family').trim() ||
    style.getPropertyValue('--p-font-family').trim() ||
    fallback.fontFamily;

  return {
    text: cssVarToColor('color', '--p-text-color', fallback.text),
    muted: cssVarToColor('color', '--p-text-muted-color', fallback.muted),
    border: cssVarToColor('color', '--p-content-border-color', fallback.border),
    surface: cssVarToColor('backgroundColor', '--p-content-background', fallback.surface),
    green: cssVarToColor('color', '--p-green-500', fallback.green),
    red: cssVarToColor('color', '--p-red-500', fallback.red),
    primary: cssVarToColor('color', '--p-primary-color', fallback.primary),
    fontFamily,
  };
}

export function chartLayoutPadding(variant: 'doughnut' | 'line' = 'line') {
  if (variant === 'doughnut') {
    return { top: 8, right: 8, bottom: 8, left: 8 };
  }

  return { top: 8, right: 16, bottom: 4, left: 8 };
}

export function formatChartCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function withAlpha(color: string, alpha: number): string {
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}
