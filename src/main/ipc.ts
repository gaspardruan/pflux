import { BrowserWindow } from 'electron';

import { IpcEvents } from '../ipc-events';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function sendIpcEvent(event: IpcEvents, _args?: Array<any>) {
  const browserWindow = BrowserWindow.getFocusedWindow();
  const args = _args || [];
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.webContents.send(event, ...args);
  }
}
