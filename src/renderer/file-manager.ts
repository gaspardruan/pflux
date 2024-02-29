import { EditorValues, Files } from '../interface';
import { AppState } from './state';

export class FileManager {
  constructor(private readonly appState: AppState) {
    this.getFiles = this.getFiles.bind(this);

    window.ElectronFlux.removeAllListeners('open-flux');
    window.ElectronFlux.removeAllListeners('saved-local-flux');

    window.ElectronFlux.addEventListener(
      'open-flux',
      (folderPath, folderName, files) => {
        this.openFlux(folderPath, folderName, files);
      },
    );

    window.ElectronFlux.addEventListener(
      'saved-local-flux',
      (folderPath, folderName) => {
        if (this.appState.folderPath !== folderPath) {
          this.appState.setFolderPathAndName(folderPath, folderName);
          this.appState.editorMosaic.onAllSaved();
        }
        this.appState.editorMosaic.setIsEdited(false);
      },
    );

    window.ElectronFlux.onGetFiles(this.getFiles);
  }

  public async openFlux(
    folderPath: string,
    folderName: string,
    files: EditorValues,
  ) {
    console.log(`FileManager: Asked to open`, folderPath);
    // eslint-disable-next-line no-useless-return
    if (
      !folderPath ||
      typeof folderPath !== 'string' ||
      this.appState.folderPath === folderPath
    )
      return false;

    const { editorMosaic } = this.appState;
    if (!editorMosaic.isSaved && !(await this.confirmReplaceUnsaved())) {
      return false;
    }

    this.appState.setFolderPathAndName(folderPath, folderName);
    editorMosaic.set(files);

    return true;
  }

  private confirmReplaceUnsaved(): Promise<boolean> {
    return this.appState.showConfirmDialog({
      label: `Opening this Flux will replace your unsaved changes. Do you want to proceed?`,
      ok: 'Open',
    });
  }

  /**
   * If folderPath is null, then return all the files,
   * otherwise, return the focused editor file. Both are
   * returned as a map.
   */
  public async getFiles(getAll: boolean): Promise<{
    folderPath: string | null;
    files: Files;
  }> {
    if (this.appState.folderPath && !getAll) {
      const files = new Map<string, string>();
      const { id } = this.appState.editorMosaic.mainEditor;
      const { fileContent2 } = this.appState.editorMosaic;
      files.set(id as string, fileContent2);
      return { folderPath: this.appState.folderPath, files };
    }
    const values = this.appState.editorMosaic.values();
    const files = new Map<string, string>(Object.entries(values));
    return { folderPath: null, files };
  }
}
