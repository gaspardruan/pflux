// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Location } from '@msrvida/python-program-analysis';

import { EditorValues, Files, FluxEvent } from '../interface';
import { IpcEvents } from '../ipc-events';

const channelMapping: Record<FluxEvent, IpcEvents> = {
  // 'before-quit': IpcEvents.BEFORE_QUIT,
  'execute-monaco-command': IpcEvents.MONACO_EXECUTE_COMMAND,
  'open-flux': IpcEvents.FS_OPEN_FLUX,
  'open-settings': IpcEvents.OPEN_SETTINGS,
  'redo-in-editor': IpcEvents.REDO_IN_EDITOR,
  'saved-local-flux': IpcEvents.SAVED_LOCAL_FLUX,
  'select-all-in-editor': IpcEvents.SELECT_ALL_IN_EDITOR,
  'toggle-monaco-option': IpcEvents.MONACO_TOGGLE_OPTION,
  'undo-in-editor': IpcEvents.UNDO_IN_EDITOR,
} as const;

const electronHandler = {
  addEventListener(
    type: FluxEvent,
    listener: (...args: any[]) => void,
    options?: { signal: AbortSignal },
  ) {
    const channel = channelMapping[type];
    if (channel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ipcListener = (_event: IpcRendererEvent, ...args: any[]) => {
        listener(...args);
      };
      ipcRenderer.on(channel, ipcListener);
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          ipcRenderer.off(channel, ipcListener);
        });
      }
    }
  },
  deleteFile(folderPath: string, fileName: string): Promise<boolean> {
    return ipcRenderer.invoke(IpcEvents.FS_DELETE_FILE, folderPath, fileName);
  },
  renameFile(
    folderPath: string,
    oldName: string,
    newName: string,
  ): Promise<boolean> {
    return ipcRenderer.invoke(
      IpcEvents.FS_RENAME_FILE,
      folderPath,
      oldName,
      newName,
    );
  },
  getControlFlow(code: string, line: number) {
    return ipcRenderer.invoke(IpcEvents.CONTROL_FLOW, code, line);
  },
  getFiles(folder: string): Promise<EditorValues> {
    return ipcRenderer.invoke(IpcEvents.FS_GET_FILES, folder);
  },
  macTitlebarClicked() {
    ipcRenderer.send(IpcEvents.CLICK_TITLEBAR_MAC);
  },
  onGetFiles(
    callback: (
      getAll: boolean,
    ) => Promise<{ folderPath: string | null; files: Files }>,
  ) {
    ipcRenderer.removeAllListeners(IpcEvents.GET_FILES);
    ipcRenderer.on(IpcEvents.GET_FILES, async (e, { getAll }) => {
      const { folderPath, files } = await callback(getAll);
      e.ports[0].postMessage({ folderPath, files: [...files.entries()] });
    });
  },
  parseStruct(code: string) {
    return ipcRenderer.invoke(IpcEvents.PARSE_STRUCT, code);
  },
  parseSlice(code: string, location: Location) {
    return ipcRenderer.invoke(IpcEvents.PARSE_SLICE, code, location);
  },
  pathExists: (path: string) =>
    ipcRenderer.sendSync(IpcEvents.PATH_EXISTS, path),
  platform: process.platform,
  removeAllListeners(type: FluxEvent) {
    const channel = channelMapping[type];
    if (channel) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  sayHello(msg: string) {
    ipcRenderer.send(IpcEvents.SAY_HELLO, msg);
  },
  setNativeTheme(theme: 'light' | 'dark' | 'system') {
    ipcRenderer.send(IpcEvents.SET_NATIVE_THEME, theme);
  },
};

contextBridge.exposeInMainWorld('ElectronFlux', electronHandler);

export type ElectronHandler = typeof electronHandler;
