import { HotkeysProvider } from '@blueprintjs/core';
import { when, reaction } from 'mobx';

import { AppState } from './state';
import { activateTheme, getTheme } from './theme';
import fontList from './font';
import { FileManager } from './file-manager';
import { GlobalSetting } from '../interface';
import { defaultDark, defaultLight } from '../themes-defaults';

// Importing styles files
import '../less/root.less';

/**
 * The top-level class controlling the whole app. This is not a React component,
 * but it does eventually render all components.
 *
 * @class App
 */
export class App {
  public state = new AppState();
  public fileManager = new FileManager(this.state);

  /**
   * Initial setup call
   */
  public async setup() {
    this.loadTheme(this.state.theme || '');
    this.loadFonts();
    this.setupPythonPath();

    const [{ createRoot }, { Dialogs }, { SidebarEditorsWrapper }, { Header }] =
      await Promise.all([
        import('react-dom/client'),
        import('./components/dialogs'),
        import('./components/sidebar-editors-wrapper'),
        import('./components/header'),
      ]);

    await when(() => this.state.editorMosaic.isEditeds.size > 0);

    const app = (
      <div className="container">
        <HotkeysProvider>
          <Dialogs appState={this.state} />
          <Header appState={this.state} />
          <SidebarEditorsWrapper appState={this.state} />
        </HotkeysProvider>
      </div>
    );

    createRoot(document.getElementById('root')!).render(app);

    this.setupThemeListeners();
  }

  public async setupThemeListeners() {
    const setSystemTheme = (prefersDark: boolean) => {
      if (prefersDark) {
        this.state.setTheme(defaultDark.file);
      } else {
        this.state.setTheme(defaultLight.file);
      }
    };

    reaction(
      () => this.state.isUsingSystemTheme,
      () => {
        if (this.state.isUsingSystemTheme) {
          window.ElectronFlux.setNativeTheme('system');
        }
      },
    );

    if (window.matchMedia) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', ({ matches }) => {
          if (this.state.isUsingSystemTheme) {
            setSystemTheme(matches);
          }
        });
    }
  }

  /**
   * Loads theme CSS into the HTML document.
   *
   * @param {string} name
   * @returns {void}
   */
  public loadTheme(name: string): void {
    const tag: HTMLStyleElement | null =
      document.querySelector('style#flux-theme');
    console.log('loadTheme() called getTheme() with name:', name);
    const theme = getTheme(name);
    activateTheme(theme);
    this.state.editorMosaic.resetLayout();

    if (tag && theme.css) {
      tag.innerHTML = theme.css;
    }

    if (theme.isDark || theme.name.includes('dark')) {
      document.body.classList.add('bp5-dark');
      if (!this.state.isUsingSystemTheme) {
        window.ElectronFlux.setNativeTheme('dark');
        console.log("SetNativeTheme('dark')");
      }
    } else {
      document.body.classList.remove('bp5-dark');
      if (!this.state.isUsingSystemTheme) {
        window.ElectronFlux.setNativeTheme('light');
      }
    }
  }

  public loadFonts() {
    // eslint-disable-next-line promise/catch-or-return
    document.fonts.ready.then(() => {
      if (!this.state.fontFamilyList || this.state.fontFamilyList.length <= 3) {
        const fontAvailable = [];

        for (const font of fontList.values()) {
          if (document.fonts.check(`12px "${font}"`)) {
            fontAvailable.push(font);
          }
        }

        if (fontAvailable.length > 0) {
          this.state.setFontFaimlyList(fontAvailable);
          localStorage.setItem(
            GlobalSetting.fontFamilyList,
            JSON.stringify(fontAvailable),
          );
        }
      }
    });
  }

  public setupPythonPath() {
    console.log('setupPythonPath() called');
    // eslint-disable-next-line promise/catch-or-return
    window.ElectronFlux.getPythonPath().then((pythonPath) => {
      if (pythonPath) {
        this.state.setPythonPath(pythonPath);
        console.log('Python path set to', pythonPath);
      }
    });
  }
}
