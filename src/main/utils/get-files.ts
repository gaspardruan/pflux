import { MessageChannelMain } from 'electron';
import { Files } from '../../interface';
import { IpcEvents } from '../../ipc-events';

export function getFiles(
  window: Electron.BrowserWindow,
  getAll: boolean = false,
): Promise<{ folderPath: string | null; files: Files }> {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannelMain();
    window.webContents.postMessage(IpcEvents.GET_FILES, { getAll }, [port1]);
    port2.once('message', (event) => {
      resolve(event.data);
      port2.close();
    });
    port2.start();
  });
}
