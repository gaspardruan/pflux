import * as MonacoType from 'monaco-editor';
import { action, computed, makeObservable, observable, reaction } from 'mobx';
import { MosaicDirection, MosaicNode, getLeaves } from 'react-mosaic-component';

import { EditorId, EditorValues, GridId } from '../interface';
import { getEmptyContent, sortGrid } from './utils/editor-utils';

export type Editor = MonacoType.editor.IStandaloneCodeEditor;

interface EditorBackup {
  model: MonacoType.editor.ITextModel;
  viewState?: MonacoType.editor.ICodeEditorViewState | null;
  position?: MonacoType.Position | null;
  mosaic: MosaicNode<GridId>;
  isEdited: boolean;
}

export class EditorMosaic {
  public folderName: string = '';

  public mainEditor: {
    editor: Editor | null;
    id: EditorId | null;
    mosaic: MosaicNode<GridId> | null;
    isEdited: boolean;
  } = { editor: null, id: null, mosaic: null, isEdited: false };

  public backups = new Map<EditorId, EditorBackup>();

  private pendingBackup: EditorBackup | null = null;

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

  public focusedGridId: GridId | null = null;

  constructor() {
    makeObservable(this, {
      addFile: action,
      addNewFile: action,
      backups: observable,
      focusedGridId: observable,
      folderName: observable,
      isEditeds: computed,
      isSaved: computed,
      mainEditor: observable,
      replaceFile: action,
      remove: action,
      resetLayout: action,
      setFocusedGridId: action,
      set: action,
      setMainEditor: action,
      setVisible: action,
      show: action,
      updateMosaic: action,
    });

    reaction(
      () => this.mainEditor.mosaic,
      () => this.layout(),
    );
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

  public resetLayout() {
    this.mainEditor.mosaic = this.mainEditor.id!;
  }

  // Set the contents of the mosaic
  public set(valuesIn: EditorValues, folderName: string = 'Files') {
    this.folderName = folderName;

    this.backups.clear();
    this.mainEditor = { editor: null, id: null, mosaic: null, isEdited: false };

    const values = new Map(Object.entries(valuesIn)) as Map<EditorId, string>;
    for (const [id, value] of values) {
      this.addFile(id, value);
    }

    this.firstLoadFile();
  }

  private firstLoadFile() {
    const backup = this.backups.get(this.getFirstBackupId()) as EditorBackup;
    this.mainEditor.mosaic = backup.mosaic;
  }

  private getFirstBackupId() {
    if (this.backups.size === 0) {
      throw new Error('No files to load');
    }
    return [...this.backups.keys()].sort()[0];
  }

  // drivered by the clicking file event in the editor.tsx
  public replaceFile(id: EditorId) {
    if (this.mainEditor.id === id) {
      this.mainEditor.editor!.focus();
      return;
    }
    const backup = this.backups.get(id);
    if (!backup) {
      throw new Error(`No backup found for "${id}"`);
    }
    this.pendingBackup = {
      model: this.mainEditor.editor!.getModel()!,
      viewState: this.mainEditor.editor!.saveViewState(),
      mosaic: this.mainEditor.mosaic!,
      position: this.mainEditor.editor!.getPosition(),
      isEdited: this.mainEditor.isEdited,
    };
    this.mainEditor.mosaic = backup.mosaic;
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
    if (!this.mainEditor.isEdited) {
      this.observeEdit();
    }
    this.mainEditor.editor.focus();
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

  public addFile(id: EditorId, value: string) {
    if (!id.endsWith('.py')) {
      throw new Error(
        `Cannot add file "${id}": Only Python files are supported`,
      );
    }

    const { monaco } = window;
    const model = monaco.editor.createModel(value, 'python');
    model.updateOptions({ tabSize: 2 });

    const backup: EditorBackup = { model, mosaic: id, isEdited: false };
    this.backups.set(id, backup);
  }

  public addNewFile(id: EditorId, value: string = getEmptyContent()) {
    if (this.backups.has(id)) {
      throw new Error(`File "${id}" already exists`);
    }

    this.addFile(id, value);
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
    if (this.mainEditor.id === id) {
      const nextId = this.getFirstBackupId();
      this.replaceFile(nextId);
    }
    this.backups.delete(id);
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
      this.mainEditor.isEdited = true;
      disposable.dispose();
    });
  }
}
