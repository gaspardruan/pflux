import {
  DefaultThemes,
  FluxTheme,
  LoadedFluxTheme,
  defaultDark,
  defaultLight,
} from '../themes-defaults';

/**
 * Activate a given theme (or the default)
 *
 * @param {LoadedFiddleTheme} theme
 */
export function activateTheme(theme: LoadedFluxTheme) {
  const { monaco } = window;
  monaco.editor.defineTheme('main', theme.editor as any);
  monaco.editor.setTheme('main');
}

export function getTheme(name?: string | null): LoadedFluxTheme {
  console.log(`Themes: getTheme() loading ${name || 'default'}`);
  let theme: LoadedFluxTheme | null;
  switch (name) {
    case DefaultThemes.DARK:
      theme = defaultDark;
      break;
    case DefaultThemes.LIGHT:
      theme = defaultLight;
      break;
    default:
      theme = defaultDark;
  }

  return { ...theme, css: getCssStringForTheme(theme) };
}

/**
 * Get the CSS string for a theme.
 *
 * @param {FluxTheme} theme
 * @returns {Promise<string>}
 */
function getCssStringForTheme(theme: FluxTheme): string {
  let cssContent = '';

  Object.keys(theme.common).forEach((_key) => {
    const key = _key as keyof FluxTheme['common'];
    cssContent += `    --${_key}: ${theme.common[key]};\n`;
  });

  return `\n  html, body {\n${cssContent}  }\n`;
}
