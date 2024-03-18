import * as MonacoType from 'monaco-editor';
import { action, computed, makeObservable, observable, reaction } from 'mobx';
import { MosaicDirection, MosaicNode, getLeaves } from 'react-mosaic-component';

import {
  DefUseCollection,
  EditorId,
  EditorValues,
  GridId,
  SliceId,
  StructNodeInfo,
} from '../interface';
import { getEmptyContent, sortGrid } from '../utils/editor-utils';

export type Editor = MonacoType.editor.IStandaloneCodeEditor;

interface EditorBackup {
  model: MonacoType.editor.ITextModel;
  viewState?: MonacoType.editor.ICodeEditorViewState | null;
  position?: MonacoType.Position | null;
  mosaic: MosaicNode<GridId>;
  isEdited: boolean;
  structExpandRecord: Map<string, boolean>;
  lineCollection: Array<number>;
  defUseCollection: DefUseCollection;
  cfgMermaid: string;
  varDepGraph: string;
}

export class EditorMosaic {
  // mainEditor includes the whole window except sidebar (not just editor)
  public mainEditor: {
    editor: Editor | null;
    sliceEditor: Editor | null;
    id: EditorId | null;
    mosaic: MosaicNode<GridId> | null;
    isEdited: boolean;
    structExpandRecord: Map<string, boolean> | null;
    lineCollection: Array<number> | null;
    defUseCollection: DefUseCollection | null;
    cfgMermaid: string | null;
    varDepGraph: string | null;
  } = {
    editor: null,
    sliceEditor: null,
    id: null,
    mosaic: null,
    isEdited: false,
    structExpandRecord: null,
    lineCollection: null,
    defUseCollection: null,
    cfgMermaid: null,
    varDepGraph: null,
  };

  public backups = new Map<EditorId, EditorBackup>();
  // there is a middle unconsistent state when switching between files
  // owing to the editor-mosaic trigger-render logic:
  // mosaic changes -> editor render -> editor calling setMainEditor on mounted
  // -> init every thing in setMainEditor
  // so between the mosaic changes and setMainEditor, the mainEditor is not ready
  // I use pendingBackup to keep the mainEditor the same as the last time when
  // switching, and set the pendingBackup to backups in setMainEditor
  // TO IMPROVE: this makes the logic too complex, need to refactor
  private pendingBackup: EditorBackup | null = null;

  // structTree uses the state to decide the behavior to handle exception
  private state: 'created' | 'updated' | 'default' = 'default';

  public get isEditeds() {
    const result = new Map<EditorId, boolean>();
    if (this.mainEditor.id) {
      result.set(this.mainEditor.id, this.mainEditor.isEdited);
    }
    for (const [id, backup] of this.backups) {
      result.set(id, backup.isEdited);
    }
    return result;
  }

  public get isSaved() {
    return ![...this.isEditeds.values()].some((edited) => edited);
  }

  // public get structTree() {
  //   let result: Array<StructNodeInfo> = [];
  //   // eslint-disable-next-line promise/catch-or-return
  //   window.ElectronFlux.parseStruct(this.fileContent2).then((res) => {
  //     result = res;
  //   });
  //   return result;
  //   return `test${this.fileContent2}`;
  // }

  public focusedGridId: GridId | null = null;

  public fileContent2 = '//Empty file\n';

  public structTree: Array<StructNodeInfo> = [];

  public cursorPosition: MonacoType.Position | null = null;
  public cursorWord: MonacoType.editor.IWordAtPosition | null = null;

  public tempLineDecorations: MonacoType.editor.IEditorDecorationsCollection | null =
    null;

  public defUseTempLineDecoration: MonacoType.editor.IEditorDecorationsCollection | null =
    null;

  public cfgPanZoom: SvgPanZoom.Instance | null = null;
  public varPanZoom: SvgPanZoom.Instance | null = null;

  constructor() {
    makeObservable(this, {
      addFile: action,
      addNewFile: action,
      backups: observable,
      cursorPosition: observable,
      cursorWord: observable,
      disposeSliceEditor: action,
      fileContent2: observable,
      focusedGridId: observable,
      hide: action,
      isEditeds: computed,
      isSaved: computed,
      mainEditor: observable,
      onAllSaved: action,
      replaceFile: action,
      remove: action,
      renameFile: action,
      resetLayout: action,
      set: action,
      setCFGMermaid: action,
      setCursorWord: action,
      setDefUseCollection: action,
      setFileContent2: action,
      setFocusedGridId: action,
      setIsEdited: action,
      setLineCollection: action,
      setMainEditor: action,
      setSliceEditor: action,
      setStructTree: action,
      setStructExpand: action,
      setVarDepGraph: action,
      setVisible: action,
      show: action,
      structTree: observable,
      updateMosaic: action,
    });

    this.disposeSliceEditor = this.disposeSliceEditor.bind(this);
    this.hide = this.hide.bind(this);
    this.replaceSliceEditorModel = this.replaceSliceEditorModel.bind(this);
    this.setStructExpand = this.setStructExpand.bind(this);
    this.show = this.show.bind(this);
    this.setVisible = this.setVisible.bind(this);
    this.setPanZoom = this.setPanZoom.bind(this);

    reaction(
      () => this.mainEditor.mosaic,
      () => this.layout(),
    );

    reaction(
      () => this.fileContent2,
      () => {
        // eslint-disable-next-line promise/catch-or-return
        window.ElectronFlux.parseStruct(this.fileContent2)
          .then((res) => {
            if (
              res.length > 0 ||
              (res.length === 0 && this.state === 'created')
            )
              this.setStructTree(res);
          })
          .catch(() => {
            // do nothing
          });
      },
    );
  }

  public setStructTree(tree: Array<StructNodeInfo>) {
    this.structTree = tree;
  }

  public setFileContent2(content: string) {
    this.fileContent2 = content;
  }

  public setIsEdited(val: boolean) {
    this.mainEditor.isEdited = val;
  }

  public onAllSaved() {
    // backup 中的 isEdited 都设置为 false
    for (const backup of this.backups.values()) {
      backup.isEdited = false;
    }
    this.mainEditor.isEdited = false;
  }

  public setStructExpand(id: string, val: boolean) {
    this.mainEditor.structExpandRecord!.set(id, val);
  }

  public setLineCollection(val: Array<number>) {
    this.mainEditor.lineCollection = val;
  }

  public setDefUseCollection(val: DefUseCollection) {
    this.mainEditor.defUseCollection = val;
  }

  public setVarDepGraph(val: string) {
    this.mainEditor.varDepGraph = val;
  }

  public updateMosaic(mosaic: MosaicNode<GridId> | null) {
    this.mainEditor.mosaic = mosaic;
  }

  public setFocusedGridId(id: GridId) {
    this.focusedGridId = id;
    if (this.mainEditor.id === id) {
      this.mainEditor.editor!.focus();
    }
  }

  public setCursorWord(
    position: MonacoType.Position,
    word: MonacoType.editor.IWordAtPosition | null,
  ) {
    this.cursorPosition = position;
    this.cursorWord = word;
  }

  public setPanZoom(panZoom: SvgPanZoom.Instance, type = 'cfg') {
    if (type === 'cfg') this.cfgPanZoom = panZoom;
    else if (type === 'varDep') this.varPanZoom = panZoom;
  }

  public setCFGMermaid(mermaid: string) {
    this.mainEditor.cfgMermaid = mermaid;
  }

  public resetLayout() {
    this.mainEditor.mosaic = this.mainEditor.id!;
  }

  // Set the contents of the mosaic
  public set(valuesIn: EditorValues) {
    this.backups.clear();

    const values = new Map(Object.entries(valuesIn)) as Map<EditorId, string>;
    for (const [id, value] of values) {
      this.addFile(id, value);
    }

    this.firstLoadFile();
  }

  private firstLoadFile() {
    const id = this.getFirstBackupId();
    if (id === this.mainEditor.id) {
      this.setMainEditor(id, this.mainEditor.editor!);
    } else {
      const backup = this.backups.get(id) as EditorBackup;
      this.mainEditor.mosaic = backup.mosaic;
      this.mainEditor.structExpandRecord = backup.structExpandRecord;
      this.mainEditor.lineCollection = backup.lineCollection;
      this.mainEditor.defUseCollection = backup.defUseCollection;
      this.mainEditor.varDepGraph = backup.cfgMermaid;
      this.mainEditor.cfgMermaid = backup.cfgMermaid;
    }
  }

  public getFirstBackupId() {
    if (this.backups.size === 0) {
      throw new Error('No files to load');
    }
    return [...this.backups.keys()].sort()[0];
  }

  // drivered by the clicking file event in the editor.tsx
  public replaceFile(id: EditorId, remove = false) {
    if (this.mainEditor.id === id) {
      this.mainEditor.editor!.focus();
      return;
    }
    const backup = this.backups.get(id);
    if (!backup) {
      throw new Error(`No backup found for "${id}"`);
    }
    if (!remove)
      this.pendingBackup = {
        model: this.mainEditor.editor!.getModel()!,
        viewState: this.mainEditor.editor!.saveViewState(),
        mosaic: this.getTidyMosaic(),
        position: this.mainEditor.editor!.getPosition(),
        isEdited: this.mainEditor.isEdited,
        structExpandRecord: this.mainEditor.structExpandRecord!,
        lineCollection: this.mainEditor.lineCollection!,
        defUseCollection: this.mainEditor.defUseCollection!,
        cfgMermaid: this.mainEditor.cfgMermaid!,
        varDepGraph: this.mainEditor.varDepGraph!,
      };
    this.mainEditor.cfgMermaid = backup.cfgMermaid;
    this.mainEditor.varDepGraph = backup.varDepGraph;
    this.mainEditor.sliceEditor = null;
    this.mainEditor.mosaic = backup.mosaic;
  }

  public getTidyMosaic() {
    const sliceNotActive = this.mainEditor.lineCollection!.length === 0;
    let leaves = getLeaves(this.mainEditor.mosaic);
    if (sliceNotActive) {
      leaves = leaves.filter(
        (v) => !v.endsWith('__VarDep') && !v.endsWith('__Slice'),
      );
    }
    leaves = sortGrid(leaves);
    return this.createMosaic(leaves);
  }

  public renameFile(oldId: EditorId, newId: EditorId) {
    if (oldId === newId) return;

    if (this.backups.has(newId)) {
      throw new Error(`File "${newId}" already exists`);
    }

    if (oldId !== this.mainEditor.id) {
      const backup = this.backups.get(oldId);
      if (!backup) {
        throw new Error(`No backup found for "${oldId}"`);
      }
      backup.mosaic = newId;
      this.backups.delete(oldId);
      this.backups.set(newId, backup);
    } else {
      this.backups.set(newId, {
        model: this.mainEditor.editor!.getModel()!,
        viewState: this.mainEditor.editor!.saveViewState(),
        mosaic: newId, // TODO to refactor
        position: this.mainEditor.editor!.getPosition(),
        isEdited: this.mainEditor.isEdited,
        structExpandRecord: this.mainEditor.structExpandRecord!,
        lineCollection: this.mainEditor.lineCollection!,
        defUseCollection: this.mainEditor.defUseCollection!,
        cfgMermaid: this.mainEditor.cfgMermaid!,
        varDepGraph: this.mainEditor.varDepGraph!,
      });
      this.mainEditor.mosaic = newId;
    }
  }

  // called by the editor.tsx on mounted
  public setMainEditor(id: EditorId, editor: Editor) {
    const backup = this.backups.get(id);
    if (!backup) {
      throw new Error(`No backup found for "${id}"`);
    }
    this.backups.delete(id);

    if (this.pendingBackup) {
      this.backups.set(this.mainEditor.id!, this.pendingBackup);
      this.pendingBackup = null;
    }

    this.mainEditor.id = id;
    this.mainEditor.editor = editor;
    this.mainEditor.editor.setModel(backup.model);
    if (backup.viewState) {
      this.mainEditor.editor.restoreViewState(backup.viewState);
    }
    if (backup.position) {
      this.mainEditor.editor.revealPositionInCenter(backup.position);
    }
    this.mainEditor.isEdited = backup.isEdited;
    this.mainEditor.structExpandRecord = backup.structExpandRecord;
    this.mainEditor.lineCollection = backup.lineCollection;
    this.mainEditor.defUseCollection = backup.defUseCollection;
    if (this.mainEditor.lineCollection.length > 0) {
      const decorations = this.mainEditor.lineCollection.map((line) => {
        return {
          range: new MonacoType.Range(line, 1, line, 2),
          options: { blockClassName: 'sliced-line-highlight' },
        };
      });
      this.tempLineDecorations =
        this.mainEditor.editor!.createDecorationsCollection(decorations);
    }
    if (this.mainEditor.defUseCollection.lines.length > 0) {
      const decorations = this.getDefUseDecorations(
        this.mainEditor.defUseCollection,
      );
      this.defUseTempLineDecoration =
        this.mainEditor.editor!.createDecorationsCollection(decorations);
    }
    if (!this.mainEditor.isEdited) {
      this.observeEdit();
    }
    this.mainEditor.editor.focus();

    this.fileContent2 = this.mainEditor.editor.getValue();
    this.state = 'created';
    this.mainEditor.editor.onDidChangeModelContent(() => {
      this.setFileContent2(this.mainEditor.editor!.getValue());
      this.state = 'updated';
    });

    const pos = this.mainEditor.editor.getPosition();
    if (pos) {
      this.setCursorWord(
        pos,
        this.mainEditor.editor.getModel()!.getWordAtPosition(pos),
      );
    }
    this.mainEditor.editor.onDidChangeCursorPosition((e) => {
      this.setCursorWord(
        e.position,
        this.mainEditor.editor!.getModel()!.getWordAtPosition(e.position),
      );
    });

    this.focusedGridId = id;
  }

  public getDefUseDecorations(
    defUseCollection: DefUseCollection,
  ): MonacoType.editor.IModelDeltaDecoration[] {
    const decorations: MonacoType.editor.IModelDeltaDecoration[] = [];
    for (const line of defUseCollection.lines) {
      const range = new MonacoType.Range(line, 1, line, 2);
      decorations.push({
        range,
        options: {
          isWholeLine: true,
          blockClassName: 'def-use-line-highlight',
        },
      });
    }
    for (const loc of defUseCollection.defs) {
      const range = new MonacoType.Range(
        loc.first_line,
        loc.first_column,
        loc.last_line,
        loc.last_column,
      );
      decorations.push({
        range,
        options: {
          inlineClassName: 'def-var-highlight',
        },
      });
    }
    for (const loc of defUseCollection.uses) {
      const range = new MonacoType.Range(
        loc.first_line,
        loc.first_column,
        loc.last_line,
        loc.last_column,
      );
      decorations.push({
        range,
        options: {
          inlineClassName: 'use-var-highlight',
        },
      });
    }
    for (const line of defUseCollection.defLines) {
      const range = new MonacoType.Range(line, 1, line, 2);
      decorations.push({
        range,
        options: {
          isWholeLine: true,
          linesDecorationsClassName: 'def-line-left-mark',
        },
      });
    }
    for (const line of defUseCollection.useLines) {
      const range = new MonacoType.Range(line, 1, line, 2);
      decorations.push({
        range,
        options: {
          isWholeLine: true,
          linesDecorationsClassName: 'use-line-left-mark',
        },
      });
    }
    for (const line of defUseCollection.defUseLines) {
      const range = new MonacoType.Range(line, 1, line, 2);
      decorations.push({
        range,
        options: {
          isWholeLine: true,
          linesDecorationsClassName: 'def-use-line-left-mark',
        },
      });
    }
    return decorations;
  }

  public setSliceEditor(id: SliceId, editor: Editor) {
    this.mainEditor.sliceEditor = editor;
    editor.setModel(this.getSlicedCodeModel());
  }

  public replaceSliceEditorModel() {
    if (this.mainEditor.sliceEditor)
      this.mainEditor.sliceEditor!.setModel(this.getSlicedCodeModel());
  }

  public disposeSliceEditor() {
    console.log('disposeSliceEditor');
    this.mainEditor.sliceEditor = null;
  }

  private getSlicedCodeModel() {
    const codes = [];
    if (this.mainEditor.editor && this.mainEditor.lineCollection!.length > 0) {
      for (const line of this.mainEditor.lineCollection!) {
        codes.push(this.mainEditor.editor.getModel()!.getLineContent(line));
      }
    }
    return window.monaco.editor.createModel(codes.join('\n'), 'python');
  }

  // private setEditorFromBackup(backup: EditorBackup) {
  //   this.ignoreEdit();
  //   if (backup.viewState) {
  //     this.mainEditor.editor!.restoreViewState(backup.viewState);
  //   }
  //   this.mainEditor.editor!.setModel(backup.model);

  //   if (!backup.isEdited) {
  //     this.observeEdit();
  //   }
  // }

  public addFile(id: EditorId, value: string, isEdited = false) {
    if (!id.endsWith('.py')) {
      throw new Error(
        `Cannot add file "${id}": Only Python files are supported`,
      );
    }

    const { monaco } = window;
    const model = monaco.editor.createModel(value, 'python');
    model.updateOptions({ tabSize: 2 });

    const backup: EditorBackup = {
      model,
      mosaic: id,
      isEdited,
      structExpandRecord: new Map(),
      lineCollection: [],
      defUseCollection: {
        lines: [],
        defs: [],
        uses: [],
        defLines: [],
        useLines: [],
        defUseLines: [],
      },
      cfgMermaid: '',
      varDepGraph: '',
    };
    this.backups.set(id, backup);
  }

  public addNewFile(id: EditorId, _value?: string) {
    const value = _value || getEmptyContent(id);
    if (this.backups.has(id)) {
      throw new Error(`File "${id}" already exists`);
    }

    this.addFile(id, value, true);
  }

  public show(id: GridId) {
    this.setVisible([...getLeaves(this.mainEditor.mosaic), id]);
  }

  public setVisible(_visible: GridId[]) {
    const visible = sortGrid([...new Set(_visible)]);
    const mosaic = this.createMosaic(visible);
    this.mainEditor.mosaic = mosaic;
  }

  private createMosaic(
    input: GridId[],
    direction: MosaicDirection = 'row',
  ): MosaicNode<GridId> {
    if (input.length < 2) return input[0];

    const secondHalf = [...input];
    const firstHalf = secondHalf.splice(0, Math.floor(secondHalf.length / 2));
    return {
      direction,
      first: this.createMosaic(firstHalf, 'column'),
      second: this.createMosaic(secondHalf, 'column'),
    };
  }

  public hide(id: GridId) {
    const visible = getLeaves(this.mainEditor.mosaic).filter((v) => v !== id);
    this.setVisible(visible);
  }

  public remove(id: EditorId) {
    if (id === this.mainEditor.id) {
      const nextId = this.getFirstBackupId();
      this.replaceFile(nextId, true);
    } else {
      this.backups.delete(id);
    }
  }

  public value(id: EditorId) {
    return (
      this.backups.get(id)?.model.getValue() ||
      this.mainEditor.editor?.getValue() ||
      ''
    );
  }

  public values(): EditorValues {
    return Object.fromEntries(
      [...this.isEditeds].map(([id]) => [id, this.value(id)]),
    );
  }

  public updateOptions(options: MonacoType.editor.IEditorOptions) {
    this.mainEditor.editor!.updateOptions(options);
  }

  private layoutDebounce: ReturnType<typeof setTimeout> | undefined;

  public layout = () => {
    const DEBOUNCE_MSEC = 50;
    if (!this.layoutDebounce) {
      this.layoutDebounce = setTimeout(() => {
        if (this.mainEditor.editor) {
          this.mainEditor.editor.layout();
        }
        this.cfgPanZoom?.resize();
        this.mainEditor.sliceEditor?.layout();

        delete this.layoutDebounce;
      }, DEBOUNCE_MSEC);
    }
  };

  public ignoreEdit() {
    this.mainEditor.editor!.onDidChangeModelContent(() => {
      // no-op
    });
  }

  public observeEdit() {
    const disposable = this.mainEditor.editor!.onDidChangeModelContent(() => {
      this.setIsEdited(true);
      disposable.dispose();
    });
  }
}
