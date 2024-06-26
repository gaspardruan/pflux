import {
  action,
  autorun,
  computed,
  makeObservable,
  observable,
  reaction,
  when,
} from 'mobx';
import * as MonacoType from 'monaco-editor';
import { getLeaves } from 'react-mosaic-component';
import { EditorMosaic } from './editor-mosaic';
import {
  GenericDialogOptions,
  GenericDialogType,
  GlobalSetting,
  SliceResult,
  WinType,
} from '../interface';
import { getGridId } from '../utils/editor-utils';
import { LoadedFluxTheme } from '../themes-defaults';
import { getTheme } from './theme';

/**
 * The application's state. Exported as a singleton.
 *
 * @export
 * @class State
 */
export class AppState {
  // -- Persisted settings -----------------\
  public theme: string | null = localStorage.getItem(GlobalSetting.theme);
  public isUsingSystemTheme = !!(
    this.retrieve<boolean>(GlobalSetting.isUsingSystemTheme) ?? true
  );
  public selectedTheme = getTheme(this.theme);
  public fontFamily: string | undefined =
    (localStorage.getItem(GlobalSetting.fontFamily) as string) || undefined;
  public fontSize: number | undefined =
    parseInt(localStorage.getItem(GlobalSetting.fontSize)!, 10) || undefined;

  public fontFamilyList: string[] = localStorage.getItem(
    GlobalSetting.fontFamilyList,
  )
    ? JSON.parse(localStorage.getItem(GlobalSetting.fontFamilyList)!)
    : ['Consolas', 'Courier New', 'monospace'];

  public folderPath: string | null = localStorage.getItem(
    GlobalSetting.folderPath,
  );

  public folderName: string | null = localStorage.getItem(
    GlobalSetting.folderName,
  );

  public pythonPath: string | null = localStorage.getItem(
    GlobalSetting.pythonPath,
  );

  // -- Various sesstion-only settings ------
  public genericDialogOptions: GenericDialogOptions = {
    type: GenericDialogType.warning,
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

  // Slice Parse

  // Control Flow

  constructor() {
    makeObservable(this, {
      cfgButtonEnabled: computed,
      clearSlice: action,
      clearDefUse: action,
      clearCoverageAnalysis: action,
      controlFlowActive: computed,
      dcPathExtractActive: computed,
      dcPathMermaidActive: computed,
      defUseActive: computed,
      editorMosaic: observable,
      fileTreeState: observable,
      fontFamily: observable,
      fontSize: observable,
      folderPath: observable,
      folderName: observable,
      genericDialogLastInput: observable,
      genericDialogLastResult: observable,
      genericDialogOptions: observable,
      isGenericDialogShowing: observable,
      isTestCaseActive: computed,
      isSettingsShowing: observable,
      isUsingSystemTheme: observable,
      pythonPath: observable,
      resetView: action,
      selectedTheme: observable,
      setFileTreeState: action,
      setFolderPathAndName: action,
      setFontFamily: action,
      setFontSize: action,
      setGenericDialogLastInput: action,
      setGenericDialogLastResult: action,
      setGenericDialogShowing: action,
      setIsUsingSystemTheme: action,
      setIsSettingsShowing: action,
      setPythonPath: action,
      setSelectedTheme: action,
      setTheme: action,
      showConfirmDialog: action,
      showErrorDialog: action,
      showGenericDialog: action,
      showInfoDialog: action,
      showInputDialog: action,
      sliceActive: computed,
      sliceExtractActive: computed,
      testCaseButtonEnabled: computed,
      toggleSettings: action,
      theme: observable,
      title: computed,
      toggleSystemTheme: action,
      varDepActive: computed,
    });

    // Bind the method to the instance
    this.parseSlice = this.parseSlice.bind(this);
    this.clearSlice = this.clearSlice.bind(this);
    this.setupControlFlow = this.setupControlFlow.bind(this);
    this.setupDefUse = this.setupDefUse.bind(this);
    this.setTheme = this.setTheme.bind(this);
    this.setFontFamily = this.setFontFamily.bind(this);
    this.setFontSize = this.setFontSize.bind(this);
    this.setIsUsingSystemTheme = this.setIsUsingSystemTheme.bind(this);
    this.setIsSettingsShowing = this.setIsSettingsShowing.bind(this);
    this.setPythonPath = this.setPythonPath.bind(this);
    this.setSelectedTheme = this.setSelectedTheme.bind(this);
    this.analyzeCoverage = this.analyzeCoverage.bind(this);
    this.clearDefUse = this.clearDefUse.bind(this);
    this.clearCoverageAnalysis = this.clearCoverageAnalysis.bind(this);
    this.toggleSettings = this.toggleSettings.bind(this);

    // Setup auto-runs
    autorun(() => this.save(GlobalSetting.theme, this.theme));
    autorun(() =>
      this.save(GlobalSetting.isUsingSystemTheme, this.isUsingSystemTheme),
    );
    autorun(() => this.save(GlobalSetting.fontFamily, this.fontFamily));
    autorun(() => this.save(GlobalSetting.fontSize, this.fontSize));
    autorun(() => this.save(GlobalSetting.folderPath, this.folderPath));
    autorun(() => this.save(GlobalSetting.folderName, this.folderName));
    autorun(() => this.save(GlobalSetting.pythonPath, this.pythonPath));

    // reaction
    reaction(
      () => this.theme,
      () => {
        const t = getTheme(this.theme);
        this.setSelectedTheme(t);
      },
    );

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

  get sliceActive(): boolean {
    return this.editorMosaic.mainEditor.lineCollection!.length > 0;
  }

  get sliceExtractActive(): boolean {
    const { mosaic, id } = this.editorMosaic.mainEditor;
    return getLeaves(mosaic).some((v) => v === getGridId(WinType.SLICE, id!));
  }

  get varDepActive(): boolean {
    const { mosaic, id } = this.editorMosaic.mainEditor;
    return getLeaves(mosaic).some((v) => v === getGridId(WinType.VARDEP, id!));
  }

  get dcPathMermaidActive(): boolean {
    const { mosaic, id } = this.editorMosaic.mainEditor;
    return getLeaves(mosaic).some(
      (v) => v === getGridId(WinType.FLOWGRAPH, id!),
    );
  }

  get controlFlowActive(): boolean {
    const { mosaic, id } = this.editorMosaic.mainEditor;
    return getLeaves(mosaic).some((v) => v === getGridId(WinType.CFG, id!));
  }

  get cfgButtonEnabled() {
    const em = this.editorMosaic;
    if (em.cursorPosition) {
      const line = em.cursorPosition.lineNumber;
      const content = em.mainEditor.editor!.getModel()!.getLineContent(line);
      return content.trim().startsWith('def');
    }
    return false;
  }

  get testCaseButtonEnabled() {
    const em = this.editorMosaic;
    if (em.cursorPosition) {
      const line = em.cursorPosition.lineNumber;
      const content = em.mainEditor.editor!.getModel()!.getLineContent(line);
      const signature = content.trim();
      return (
        this.isPythonFunctionHeader(signature) &&
        signature
          .split('(')[1]
          .split(')')[0]
          .split(',')
          .filter((v) => v.trim().length > 0).length > 0
      );
    }
    return false;
  }

  private isPythonFunctionHeader(str: string) {
    const pattern = /^def [a-zA-Z_][a-zA-Z0-9_]*\(.*\):$/;
    return pattern.test(str);
  }

  get defUseActive() {
    return this.editorMosaic.mainEditor.defUseCollection!.lines.length > 0;
  }

  get dcPathExtractActive() {
    const { mosaic, id } = this.editorMosaic.mainEditor;
    return getLeaves(mosaic).some((v) => v === getGridId(WinType.FLOW, id!));
  }

  get isTestCaseActive() {
    const { mosaic, id } = this.editorMosaic.mainEditor;
    return getLeaves(mosaic).some(
      (v) => v === getGridId(WinType.TESTCASE, id!),
    );
  }

  get isCoverageAnalysisActive() {
    const { mosaic, id } = this.editorMosaic.mainEditor;
    return getLeaves(mosaic).some(
      (v) => v === getGridId(WinType.ANALYSIS, id!),
    );
  }

  public toggleSettings() {
    (document.activeElement as HTMLInputElement).blur();
    this.resetView({ isSettingsShowing: !this.isSettingsShowing });
  }

  /**
   * Show or close secondary windows such as settings and dialogs.
   */
  public resetView(
    opts: {
      isGenericDialogShowing?: boolean;
      isSettingsShowing?: boolean;
    } = {},
  ) {
    this.isGenericDialogShowing = Boolean(opts.isGenericDialogShowing);
    this.isSettingsShowing = Boolean(opts.isSettingsShowing);
    this.setPageHash();
  }

  /**
   * Updates the pages url with a hash element that allows the main
   * process to quickly determine if there's a view open.
   *
   * @private
   * @memberof AppState
   */
  private setPageHash() {
    let hash = '';

    if (this.isSettingsShowing) {
      hash = 'settings';
    }

    window.location.hash = hash;
  }

  public setTheme(fileName?: string) {
    this.theme = fileName || '';
    window.app.loadTheme(this.theme);
  }

  public setFontFamily(fontFamily: string | undefined) {
    this.fontFamily = fontFamily;
  }

  public setFontFaimlyList(fontFamilyList: string[]) {
    this.fontFamilyList = fontFamilyList;
  }

  public setFontSize(fontSize: number | undefined) {
    this.fontSize = fontSize;
  }

  public setIsUsingSystemTheme(isUsingSystemTheme: boolean) {
    this.isUsingSystemTheme = isUsingSystemTheme;
  }

  public setSelectedTheme(theme: LoadedFluxTheme) {
    this.selectedTheme = theme;
  }

  public setIsSettingsShowing(isSettingsShowing: boolean) {
    this.isSettingsShowing = isSettingsShowing;
  }

  public setPythonPath(pythonPath: string) {
    this.pythonPath = pythonPath;
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

  public parseSlice() {
    const em = this.editorMosaic;
    const loc = {
      first_line: em.cursorPosition!.lineNumber,
      last_line: em.cursorPosition!.lineNumber,
      first_column: em.cursorWord!.startColumn - 1,
      last_column: em.cursorWord!.endColumn - 1,
    };
    window.ElectronFlux.parseSlice(em.fileContent2, loc)
      .then((res: SliceResult) => {
        if (res.lines.length === 0)
          this.showErrorDialog('Please select a variable to slice.');
        else {
          this.editorMosaic.setLineCollection(res.lines);
          this.editorMosaic.setVarDepGraph(res.varDepGraph);
          this.editorMosaic.replaceSliceEditorModel();
          const decorations = res.lines.map((line) => {
            return {
              range: new MonacoType.Range(line, 1, line, 2),
              options: { blockClassName: 'sliced-line-highlight' },
            };
          });
          this.editorMosaic.tempLineDecorations = // not observable
            em.mainEditor.editor!.createDecorationsCollection(decorations);
        }
      })
      .catch(() => {
        // do nothing
      });
  }

  public clearSlice() {
    this.editorMosaic.mainEditor.lineCollection = [];
    if (this.editorMosaic.mainEditor.sliceEditor)
      this.editorMosaic.mainEditor.sliceEditor.setValue('');
    this.editorMosaic.mainEditor.varDepGraph = '';
    if (this.editorMosaic.tempLineDecorations) {
      this.editorMosaic.tempLineDecorations.clear();
      this.editorMosaic.tempLineDecorations = null;
    }
  }

  public setupDefUse() {
    const em = this.editorMosaic;
    const loc = {
      first_line: em.cursorPosition!.lineNumber,
      last_line: em.cursorPosition!.lineNumber,
      first_column: em.cursorWord!.startColumn - 1,
      last_column: em.cursorWord!.endColumn - 1,
    };
    window.ElectronFlux.getDefUseLines(em.fileContent2, loc)
      .then((res) => {
        if (res.lines.length === 0) {
          this.showErrorDialog(
            'Please click on a variable name which has DEF and USE lines.',
          );
        } else {
          em.setDefUseCollection(res);
          const decorations = em.getDefUseDecorations(res);
          em.defUseTempLineDecoration = // not observable
            em.mainEditor.editor!.createDecorationsCollection(decorations);
        }
      })
      .catch(() => {
        // do nothing
      });
  }

  public clearDefUse() {
    this.editorMosaic.mainEditor.defUseCollection = {
      varName: '',
      defs: [],
      uses: [],
      lines: [],
      defLines: [],
      useLines: [],
      defUseLines: [],
      dcPaths: [],
      dcMermaid: '',
    };
    if (this.editorMosaic.defUseTempLineDecoration) {
      this.editorMosaic.defUseTempLineDecoration.clear();
      this.editorMosaic.defUseTempLineDecoration = null;
    }
  }

  public setupControlFlow() {
    const em = this.editorMosaic;
    if (!em.cursorPosition) return;
    window.ElectronFlux.getControlFlow(
      em.fileContent2,
      em.cursorPosition.lineNumber,
    )
      .then((res) => {
        if (res) {
          em.setCFGMermaid(res);
          if (!this.controlFlowActive) {
            em.show(getGridId(WinType.CFG, em.mainEditor.id!));
          }
        } else {
          this.showErrorDialog('Please click on a line of function name');
        }
      })
      .catch(() => {
        // do nothing
      });
  }

  public analyzeCoverage = () => {
    if (!this.pythonPath) {
      this.showErrorDialog(
        '1. make sure `python --version` is available in the shell. Or, set the python path in the settings.\n2. Reopen the app.',
      );
      return;
    }

    const em = this.editorMosaic;
    const { focusedFuncSignature } = em.mainEditor.testCaseCollection!;
    const range = em.getDefFromStructTree(em.structTree, focusedFuncSignature);
    if (!range) {
      console.error('Function not found');
      return;
    }
    const funcDef = em.getFocusedFuncBody(range);
    const testCase = em.getTestCase();
    if (!testCase || testCase.length === 0) {
      console.error('No test case found');
      return;
    }
    const testCaseExecs = em.getTestcaseExec(focusedFuncSignature, testCase);

    window.ElectronFlux.analyzeCoverage(
      em.fileContent2,
      range.startLineNumber,
      funcDef,
      testCaseExecs,
      this.pythonPath,
    )
      .then((res) => {
        em.setCoverageAnalysis(res);
        if (!this.isCoverageAnalysisActive)
          em.show(getGridId(WinType.ANALYSIS, em.mainEditor.id!));
      })
      .catch(() => {
        // do nothing
      });
  };

  public clearCoverageAnalysis() {
    this.editorMosaic.mainEditor.coverageAnalysis = null;
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
