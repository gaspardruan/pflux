import {
  action,
  autorun,
  computed,
  makeObservable,
  observable,
  when,
} from 'mobx';

import { EditorMosaic } from './editor-mosaic';
import {
  GenericDialogOptions,
  GenericDialogType,
  GlobalSetting,
} from '../interface';

/**
 * The application's state. Exported as a singleton.
 *
 * @export
 * @class State
 */
export class AppState {
  // TestButton
  public counter: number = 0;

  // -- Persisted settings -----------------\
  public theme: string | null = localStorage.getItem(GlobalSetting.theme);
  public isUsingSystemTheme = !!(
    this.retrieve<boolean>(GlobalSetting.isUsingSystemTheme) ?? true
  );
  public fontFamily: string | undefined =
    (localStorage.getItem(GlobalSetting.fontFamily) as string) || undefined;
  public fontSize: number | undefined =
    parseInt(localStorage.getItem(GlobalSetting.fontSize)!, 10) || undefined;

  public folderPath: string | null = localStorage.getItem(
    GlobalSetting.folderPath,
  );

  public folderName: string | null = localStorage.getItem(
    GlobalSetting.folderName,
  );

  // -- Various sesstion-only settings ------
  public genericDialogOptions: GenericDialogOptions = {
    type: GenericDialogType.warning,
    // eslint-disable-next-line no-undef
    label: '' as string | React.JSX.Element,
    ok: 'Okay',
    cancel: 'Cancel',
    wantsInput: false,
    placeholder: '',
  };
  public readonly editorMosaic = new EditorMosaic();
  public genericDialogLastResult: boolean | null = null;
  public genericDialogLastInput: string | null = null;

  // -- Various "isShowing" settings --------
  public isGenericDialogShowing = false;
  public isSettingsShowing = false;

  // FileTree
  public fileTreeState: 'add' | 'default' = 'default';

  constructor() {
    makeObservable(this, {
      counter: observable,
      editorMosaic: observable,
      fileTreeState: observable,
      fontFamily: observable,
      fontSize: observable,
      folderPath: observable,
      folderName: observable,
      genericDialogLastInput: observable,
      genericDialogLastResult: observable,
      genericDialogOptions: observable,
      increment: action,
      isGenericDialogShowing: observable,
      isHeaderFocusable: computed,
      isSettingsShowing: observable,
      isUsingSystemTheme: observable,
      setFileTreeState: action,
      setFolderPathAndName: action,
      setGenericDialogLastInput: action,
      setGenericDialogLastResult: action,
      setGenericDialogShowing: action,
      setTheme: action,
      showConfirmDialog: action,
      showErrorDialog: action,
      showGenericDialog: action,
      showInfoDialog: action,
      showInputDialog: action,
      theme: observable,
      title: computed,
      toggleSystemTheme: action,
    });

    // Bind the method to the instance
    this.increment = this.increment.bind(this);

    // Setup auto-runs
    autorun(() => this.save(GlobalSetting.theme, this.theme));
    autorun(() =>
      this.save(GlobalSetting.isUsingSystemTheme, this.isUsingSystemTheme),
    );
    autorun(() => this.save(GlobalSetting.fontFamily, this.fontFamily));
    autorun(() => this.save(GlobalSetting.fontSize, this.fontSize));
    autorun(() => this.save(GlobalSetting.folderPath, this.folderPath));
    autorun(() => this.save(GlobalSetting.folderName, this.folderName));
    // load flux
    this.initEditorMosaic();
  }

  /**
   * @returns {string} the title, e.g. appname, fiddle name, state
   */
  get title(): string {
    const { isSaved } = this.editorMosaic;

    return isSaved ? 'Electron Flux' : 'Electron Flux - Unsaved';
  }

  get isHeaderFocusable(): boolean {
    return !this.isSettingsShowing;
  }

  public increment() {
    this.counter += 1;
  }

  public setTheme(fileName?: string) {
    this.theme = fileName || '';
    window.app.loadTheme(this.theme);
  }

  public toggleSystemTheme() {
    this.isUsingSystemTheme = !this.isUsingSystemTheme;
  }

  public setGenericDialogLastInput(input: string | null) {
    this.genericDialogLastInput = input;
  }

  public setGenericDialogLastResult(result: boolean) {
    this.genericDialogLastResult = result;
  }

  public setGenericDialogShowing(isShowing: boolean) {
    this.isGenericDialogShowing = isShowing;
  }

  public async showGenericDialog(
    opts: GenericDialogOptions,
  ): Promise<{ confirm: boolean; input: string }> {
    this.genericDialogLastResult = null;
    this.genericDialogOptions = opts;
    this.isGenericDialogShowing = true;
    await when(() => !this.isGenericDialogShowing);
    return {
      confirm: Boolean(this.genericDialogLastResult),
      input: this.genericDialogLastInput || opts.defaultInput || '',
    };
  }

  public async showInputDialog(opts: {
    cancel?: string;
    defaultInput?: string;
    // eslint-disable-next-line no-undef
    label: string | React.JSX.Element;
    ok: string;
    placeholder: string;
  }): Promise<string | undefined> {
    const { confirm, input } = await this.showGenericDialog({
      ...opts,
      cancel: opts.cancel || 'Cancel',
      type: GenericDialogType.confirm,
      wantsInput: true,
    });
    return confirm ? input : undefined;
  }

  public showConfirmDialog = async (opts: {
    cancel?: string;
    // eslint-disable-next-line no-undef
    label: string | React.JSX.Element;
    ok: string;
  }): Promise<boolean> => {
    const { confirm } = await this.showGenericDialog({
      ...opts,
      cancel: opts.cancel || 'Cancel',
      wantsInput: false,
      type: GenericDialogType.confirm,
    });
    return confirm;
  };

  public async showInfoDialog(
    // eslint-disable-next-line no-undef
    label: string | React.JSX.Element,
  ): Promise<void> {
    await this.showGenericDialog({
      label,
      ok: 'Close',
      type: GenericDialogType.success,
      wantsInput: false,
    });
  }

  public async showErrorDialog(
    // eslint-disable-next-line no-undef
    label: string | React.JSX.Element,
  ): Promise<void> {
    await this.showGenericDialog({
      label,
      ok: 'Close',
      type: GenericDialogType.warning,
      wantsInput: false,
    });
  }

  public setFileTreeState(state: 'add' | 'default') {
    this.fileTreeState = state;
  }

  public setFolderPathAndName(
    folderPath: string | null,
    folderName: string | null,
  ) {
    this.folderPath = folderPath;
    this.folderName = folderName;
  }

  public async initEditorMosaic() {
    if (this.folderPath) {
      if (window.ElectronFlux.pathExists(this.folderPath)) {
        const values = await window.ElectronFlux.getFiles(this.folderPath);
        this.editorMosaic.set(values);
      } else {
        this.setFolderPathAndName(null, null);
        const { files } = await import('../utils/example-file');
        this.editorMosaic.set(files);
      }
    } else {
      const { files } = await import('../utils/example-file');
      this.editorMosaic.set(files);
    }
  }

  /**
   * Save a key/value to localStorage.
   *
   * @param {GlobalSetting} key
   * @param {(string | number | Array<any> | Record<string, unknown> | null | boolean)} [value]
   */
  private save(
    key: GlobalSetting,
    _value?:
      | string
      | number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | Array<any>
      | Record<string, unknown>
      | null
      | boolean,
  ) {
    if (_value !== null && _value !== undefined) {
      const value =
        typeof _value === 'object' ? JSON.stringify(_value) : _value.toString();

      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }

  /**
   * Fetch data from localStorage.
   *
   * @template T
   * @param {GlobalSetting | WindowSpecificSetting} key
   * @returns {(T | string | null)}
   */
  private retrieve<T>(key: GlobalSetting): T | string | null {
    const value = localStorage.getItem(key);

    return JSON.parse(value || 'null') as T;
  }
}
