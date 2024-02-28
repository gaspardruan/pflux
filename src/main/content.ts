import { ipcMain } from 'electron';
import { IpcEvents } from '../ipc-events';
import { readFlux } from './utils/read-flux';

export async function setupContent() {
  ipcMain.handle(IpcEvents.FS_GET_FILES, async (_event, folder: string) =>
    readFlux(folder),
  );
}
