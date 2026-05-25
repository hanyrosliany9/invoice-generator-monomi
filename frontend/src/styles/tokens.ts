/**
 * Runtime mirror of CSS tokens.
 * Use when you need token values in JS (charts, conditional styling).
 * For static styling, prefer Tailwind classes that reference these.
 */
export const tokens = {
  brand: {
    navy:  '#131936',
    black: '#030303',
    cream: '#F6F3E8',
    white: '#FFFFFF',
  },
  bg: {
    base:        '#030303',
    elevated:    'rgba(19, 25, 54, 0.55)',
    overlay:     'rgba(19, 25, 54, 0.78)',
    glass:       'rgba(255, 255, 255, 0.025)',
    glassStrong: 'rgba(255, 255, 255, 0.045)',
  },
  text: {
    primary:   '#F6F3E8',
    secondary: 'rgba(246, 243, 232, 0.65)',
    tertiary:  'rgba(246, 243, 232, 0.4)',
    disabled:  'rgba(246, 243, 232, 0.25)',
  },
  border: {
    subtle:  'rgba(246, 243, 232, 0.06)',
    default: 'rgba(246, 243, 232, 0.12)',
    strong:  'rgba(246, 243, 232, 0.22)',
  },
  semantic: {
    success: '#6EE7B7',
    warning: '#FCD34D',
    danger:  '#FCA5A5',
    info:    '#93C5FD',
  },
  radius: {
    sm:   '6px',
    md:   '10px',
    lg:   '16px',
    xl:   '24px',
    full: '9999px',
  },
  blur: {
    light:   'blur(12px) saturate(140%)',
    default: 'blur(24px) saturate(180%)',
    strong:  'blur(36px) saturate(200%)',
  },
} as const;

export type Token = typeof tokens;
