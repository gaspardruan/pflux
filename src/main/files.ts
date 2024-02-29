import path from 'path';
import * as fs from 'fs-extra';
import { BrowserWindow, app, dialog, ipcMain } from 'electron';
import { getFiles } from './utils/get-files';
import { EditorValues, Files } from '../interface';
import { IpcEvents } from '../ipc-events';
import { isSupportedFile } from '../utils/editor-utils';
import { readFlux } from './utils/read-flux';

export function setupFileListener() {
  ipcMain.on(IpcEvents.PATH_EXISTS, (event, p: string) => {
    event.returnValue = fs.existsSync(p);
  });

  ipcMain.handle(
    IpcEvents.FS_DELETE_FILE,
    async (_event, folder: string, file: string) => {
      const fullPath = path.join(folder, file);
      if (!fs.existsSync(fullPath)) {
        return true;
      }
      return removeFile(fullPath);
    },
  );
}

export async function saveFlux() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    const { folderPath, files } = await getFiles(window);
    if (folderPath) {
      await saveFiles(window, folderPath, files);
    } else {
      const newPath = await showSaveDialog();
      if (newPath) {
        await saveFiles(window, newPath, files);
      }
    }
  }
}

export async function saveFluxAs() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    const { folderPath, files } = await getFiles(window, true);
    const newPath = await showSaveDialog(true);
    if (newPath && newPath !== folderPath) {
      await saveFiles(window, newPath, files);
    }
  }
}

export async function saveFiles(
  window: BrowserWindow,
  folderPath: string,
  files: Files,
) {
  console.log(`saveFiddleWithTransforms: Asked to save to ${folderPath}`);

  for (const [fileName, content] of files) {
    const savePath = path.join(folderPath, fileName);
    // eslint-disable-next-line no-await-in-loop
    await saveFile(savePath, content);
  }

  window.webContents.send(
    IpcEvents.SAVED_LOCAL_FLUX,
    folderPath,
    path.basename(folderPath),
  );
}

/**
 * Safely attempts to save a file, doesn't crash the app if
 * it fails.
 */
// eslint-disable-next-line consistent-return
async function saveFile(filePath: string, content: string): Promise<void> {
  try {
    return await fs.outputFile(filePath, content, { encoding: 'utf-8' });
  } catch (error) {
    console.log(`saveFile: Could not save ${filePath}`, error);
  }
}

/**
 * Safely attempts to remove a file, doesn't crash the app if
 * it fails.
 */
// eslint-disable-next-line consistent-return, @typescript-eslint/no-unused-vars
async function removeFile(filePath: string): Promise<boolean> {
  try {
    await fs.remove(filePath);
  } catch (error) {
    console.log(`removeFile: Could not remove ${filePath}`, error);
    return false;
  }
  return true;
}

/**
 * Shows the "Open Fiddle" dialog and forwards
 * the path to the renderer
 */
export async function showOpenDialog() {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Open Flux',
    properties: ['openDirectory'],
  });

  if (!filePaths || filePaths.length < 1) {
    return;
  }
  app.addRecentDocument(filePaths[0]);
  const window = BrowserWindow.getFocusedWindow();
  const files = await openFiddle(filePaths[0]);
  if (window)
    window.webContents.send(
      IpcEvents.FS_OPEN_FLUX,
      filePaths[0],
      path.basename(filePaths[0]),
      files,
    );
}

/**
 * Shows the "Save Fiddle" dialog and returns the path
 */
export async function showSaveDialog(
  as: boolean = false,
): Promise<undefined | string> {
  // We want to save to a folder, so we'll use an open dialog here
  const filePaths = dialog.showOpenDialogSync({
    buttonLabel: 'Save here',
    properties: ['openDirectory', 'createDirectory'],
    title: `Save Flux ${as ? `As` : ''}`,
  });

  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return;
  }

  console.log(`Asked to save to ${filePaths[0]}`);

  // Let's confirm real quick if we want this
  if (await isOkToSaveAt(filePaths[0])) {
    // eslint-disable-next-line consistent-return
    return filePaths[0];
  }

  // eslint-disable-next-line no-useless-return
  return;
}

/**
 * Confirm it's OK to save files in `folder`
 *
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isOkToSaveAt(filePath: string): Promise<boolean> {
  return (
    !(await fs.pathExists(filePath)) ||
    (await fs.readdir(filePath)).filter(isSupportedFile).length === 0 ||
    // eslint-disable-next-line no-return-await
    (await confirmFileOverwrite(filePath))
  );
}

/**
 * Pops open a confirmation dialog, asking the user if they really
 * want to overwrite an existing file
 *
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function confirmFileOverwrite(filePath: string): Promise<boolean> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancel', 'Yes'],
    message: 'Overwrite files?',
    detail: `The file ${filePath} already exists. Do you want to overwrite it?`,
  });

  return result.response === 1;
}

/**
 * Tries to open a fiddle.
 */
export async function openFiddle(filePath: string): Promise<EditorValues> {
  console.log(`openFlux: Asked to open`, filePath);
  return readFlux(filePath);
}
