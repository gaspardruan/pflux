/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import {
  BrowserWindow,
  IpcMainEvent,
  app,
  systemPreferences,
  ipcMain,
  nativeTheme,
} from 'electron';

import setupMenu from './menu';
import setupAboutPanel from './about-panel';
import { createWindow } from './window';
import { setupStructParse } from './core/struct-parse';

import { IpcEvents } from '../ipc-events';
import { setupContent } from './content';
import { setupFileListener } from './files';
import { setupSliceParse } from './core/slice-parse';

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

/**
 * Handle the app's 'ready' event. This is essentially
 * the method that takes care of booting the application.
 */
export async function onReady() {
  setupAboutPanel();
  setupMenu();
  setupTitleBarClickMac();
  setupContent();
  setupFileListener();

  setupStructParse();
  setupSliceParse();

  createWindow();
}

app.whenReady().then(onReady).catch(console.log);

/**
 * Add event listeners...
 */
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * On macOS, set up the custom titlebar click handler.
 */
export function setupTitleBarClickMac() {
  if (process.platform !== 'darwin') {
    return;
  }

  ipcMain.on(IpcEvents.CLICK_TITLEBAR_MAC, (event: IpcMainEvent) => {
    const doubleClickAction = systemPreferences.getUserDefault(
      'AppleActionOnDoubleClick',
      'string',
    );
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (doubleClickAction === 'Minimize') {
        win.minimize();
      } else if (doubleClickAction === 'Maximize') {
        if (!win.isMaximized()) {
          win.maximize();
        } else {
          win.unmaximize();
        }
      }
    }
  });
}

function isNativeThemeSource(
  val: unknown,
): val is typeof nativeTheme.themeSource {
  return typeof val === 'string' && ['dark', 'light', 'system'].includes(val);
}

/**
 * Handle theme changes.
 */
export function setupNativeTheme() {
  ipcMain.on(IpcEvents.SET_NATIVE_THEME, (_, source: string) => {
    if (isNativeThemeSource(source)) {
      nativeTheme.themeSource = source;
    }
  });
}
