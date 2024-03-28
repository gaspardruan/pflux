import path from 'path';
import { app, BrowserWindow, shell } from 'electron';

import { resolveHtmlPath } from './util';
import { createContextMenu } from './context-menu';

/**
 * Get default main window options
 *
 * @returns {Electron.BrowserWindowConstructorOptions}
 */
export function getMainWindowOptions(): Electron.BrowserWindowConstructorOptions {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  return {
    width: 1400,
    height: 900,
    minHeight: 600,
    minWidth: 600,
    backgroundColor: '#1d2427',
    icon: getAssetPath('icons/32x32.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  };
}

export async function createWindow() {
  console.log('Creating main window');
  let mainWindow: BrowserWindow | null;
  mainWindow = new BrowserWindow(getMainWindowOptions());
  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.webContents.once('dom-ready', () => {
    if (mainWindow) {
      createContextMenu(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
}
