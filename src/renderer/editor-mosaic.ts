import * as MonacoType from 'monaco-editor';
import { action, computed, makeObservable, observable, reaction } from 'mobx';
import { MosaicDirection, MosaicNode, getLeaves } from 'react-mosaic-component';

import { EditorId, EditorValues, GridId, StructNodeInfo } from '../interface';
import { getEmptyContent, sortGrid } from '../utils/editor-utils';

export type Editor = MonacoType.editor.IStandaloneCodeEditor;

interface EditorBackup {
  model: MonacoType.editor.ITextModel;
  viewState?: MonacoType.editor.ICodeEditorViewState | null;
  position?: MonacoType.Position | null;
  mosaic: MosaicNode<GridId>;
  isEdited: boolean;
  structExpandRecord: Map<string, boolean>;
}

export class EditorMosaic {
  public mainEditor: {
    editor: Editor | null;
    id: EditorId | null;
    mosaic: MosaicNode<GridId> | null;
    isEdited: boolean;
    structExpandRecord: Map<string, boolean> | null;
  } = {
    editor: null,
    id: null,
    mosaic: null,
    isEdited: false,
    structExpandRecord: null,
  };

  public backups = new Map<EditorId, EditorBackup>();

  private pendingBackup: EditorBackup | null = null;

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

  // Slice Parse
  public lineCollection: Array<number> | null = null;

  constructor() {
    makeObservable(this, {
      addFile: action,
      addNewFile: action,
      backups: observable,
      cursorPosition: observable,
      cursorWord: observable,
      fileContent2: observable,
      focusedGridId: observable,
      isEditeds: computed,
      isSaved: computed,
      mainEditor: observable,
      onAllSaved: action,
      replaceFile: action,
      remove: action,
      renameFile: action,
      resetLayout: action,
      set: action,
      setCursorWord: action,
      setFileContent2: action,
      setFocusedGridId: action,
      setIsEdited: action,
      setMainEditor: action,
      setStructTree: action,
      setStructExpand: action,
      setVisible: action,
      show: action,
      structTree: observable,
      updateMosaic: action,
    });

    this.setStructExpand = this.setStructExpand.bind(this);
    this.parseSlice = this.parseSlice.bind(this);

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
        mosaic: this.mainEditor.mosaic!,
        position: this.mainEditor.editor!.getPosition(),
        isEdited: this.mainEditor.isEdited,
        structExpandRecord: this.mainEditor.structExpandRecord!,
      };
    this.mainEditor.mosaic = backup.mosaic;
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

  // public hide(id: GridId) {}

  public remove(id: EditorId) {
    if (id === this.mainEditor.id) {
      const nextId = this.getFirstBackupId();
      this.replaceFile(nextId, true);
    } else {
      this.backups.delete(id);
    }
  }

  public parseSlice() {
    const loc = {
      first_line: this.cursorPosition!.lineNumber,
      last_line: this.cursorPosition!.lineNumber,
      first_column: this.cursorWord!.startColumn - 1,
      last_column: this.cursorWord!.endColumn - 1,
    };
    window.ElectronFlux.parseSlice(this.fileContent2, loc)
      .then((res) => {
        this.lineCollection = res;
        console.log(res);
      })
      .catch(() => {
        // do nothing
      });
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
