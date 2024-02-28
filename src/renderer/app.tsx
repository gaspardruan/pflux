import { when, reaction } from 'mobx';

import { AppState } from './state';
import { activateTheme, getTheme } from './theme';

import { defaultDark, defaultLight } from '../themes-defaults';

// Importing styles files
import '../less/root.less';
import { FileManager } from './file-manager';

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
        <Dialogs appState={this.state} />
        <Header appState={this.state} />
        <SidebarEditorsWrapper appState={this.state} />
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
          console.log('Using system theme');
          window.ElectronFlux.setNativeTheme('system');

          if (window.matchMedia) {
            const { matches } = window.matchMedia(
              '(prefers-color-scheme: dark)',
            );
            setSystemTheme(matches);
          }
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
    const theme = getTheme(name);
    activateTheme(theme);

    if (tag && theme.css) {
      tag.innerHTML = theme.css;
    }

    if (theme.isDark || theme.name.includes('dark')) {
      document.body.classList.add('bp5-dark');
      if (!this.state.isUsingSystemTheme) {
        window.ElectronFlux.setNativeTheme('dark');
      }
    } else {
      document.body.classList.remove('bp5-dark');
      if (!this.state.isUsingSystemTheme) {
        window.ElectronFlux.setNativeTheme('light');
      }
    }
  }
}
