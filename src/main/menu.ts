import {
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  app,
  shell,
} from 'electron';
import defaultMenu from 'electron-default-menu';

import sendIpcEvent from './ipc';
import { IpcEvents } from '../ipc-events';

/**
 * Is the passed object a constructor for an Electron Menu?
 *
 * @param {(Array<Electron.MenuItemConstructorOptions> | Electron.Menu)} [submenu]
 * @returns {submenu is Array<Electron.MenuItemConstructorOptions>}
 */
function isSubmenu(
  submenu?: Array<MenuItemConstructorOptions> | Menu,
): submenu is Array<MenuItemConstructorOptions> {
  return !!submenu && Array.isArray(submenu);
}

/**
 * Returns additional items for the help menu
 *
 * @returns {Array<Electron.MenuItemConstructorOptions>}
 */
function getHelpItems(): Array<MenuItemConstructorOptions> {
  const items: MenuItemConstructorOptions[] = [];

  items.push(
    {
      type: 'separator',
    },
    {
      label: 'Toggle Developer Tools',
      accelerator: 'CmdOrCtrl+Option+i',
      click() {
        const browserWindow = BrowserWindow.getFocusedWindow();

        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.toggleDevTools();
        }
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Open Flux Repository...',
      click() {
        shell.openExternal('https://github.com/electron/fiddle');
      },
    },
  );

  // on macOS, there's already the About Electron Fiddle menu item
  // under the first submenu set by the electron-default-menu package
  if (process.platform !== 'darwin') {
    items.push(
      {
        type: 'separator',
      },
      {
        label: 'About Electron Fiddle',
        click() {
          app.showAboutPanel();
        },
      },
    );
  }

  return items;
}

/**
 * Depending on the OS, the `Preferences` either go into the `Fiddle`
 * menu (macOS) or under `File` (Linux, Windows)
 *
 * @returns {Array<Electron.MenuItemConstructorOptions>}
 */
function getPreferencesItems(): Array<MenuItemConstructorOptions> {
  return [
    {
      type: 'separator',
    },
    {
      label: 'Preferences',
      accelerator: 'CmdOrCtrl+,',
      click() {
        sendIpcEvent(IpcEvents.OPEN_SETTINGS);
      },
    },
    {
      type: 'separator',
    },
  ];
}

/**
 * Returns the Exit items
 *
 * @returns {Array<Electron.MenuItemConstructorOptions>}
 */
function getQuitItems(): Array<MenuItemConstructorOptions> {
  return [
    {
      type: 'separator',
    },
    {
      role: 'quit',
    },
  ];
}

function getFileMenu(): MenuItemConstructorOptions {
  const fileMenu: Array<MenuItemConstructorOptions> = [
    {
      label: 'Open',
      click() {
        // eslint-disable-next-line no-console
        console.log('File -> Open');
      },
      accelerator: 'CmdOrCtrl+O',
    },
    {
      type: 'separator',
    },
    {
      label: 'Save',
      click() {
        // eslint-disable-next-line no-console
        console.log('File -> Save');
      },
      accelerator: 'CmdOrCtrl+S',
    },
    {
      label: 'Save As',
      click() {
        // eslint-disable-next-line no-console
        console.log('File -> Save As');
      },
      accelerator: 'CmdOrCtrl+Shift+S',
    },
  ];

  // macOS has these items in the "Fiddle" menu
  if (process.platform !== 'darwin') {
    fileMenu.splice(
      fileMenu.length,
      0,
      ...getPreferencesItems(),
      ...getQuitItems(),
    );
  }

  return {
    label: 'File',
    submenu: fileMenu,
  };
}

/**
 * Create the app's window menu
 */
export default function setupMenu() {
  const menu = (
    defaultMenu(app, shell) as Array<MenuItemConstructorOptions>
  ).map((item) => {
    const { label } = item;

    // Append the "Settings" item
    if (
      process.platform === 'darwin' &&
      label === app.name &&
      isSubmenu(item.submenu)
    ) {
      item.submenu.splice(2, 0, ...getPreferencesItems());
    }

    // Custom handler fro "Select ALl", "Undo", "Redo"
    if (label === 'Edit' && isSubmenu(item.submenu)) {
      const selectAll = item.submenu.find((i) => i.label === 'Select All')!;
      delete selectAll.role; // override default role
      selectAll.click = () => {
        sendIpcEvent(IpcEvents.SELECT_ALL_IN_EDITOR);

        // Allow selection to occur in text fields outside the editors.
        if (process.platform === 'darwin') {
          Menu.sendActionToFirstResponder('selectAll:');
        }
      };

      const undo = item.submenu.find((i) => i.label === 'Undo')!;
      delete undo.role; // override default role
      undo.click = () => {
        sendIpcEvent(IpcEvents.UNDO_IN_EDITOR);

        // Allow undo to occur in text fields outside the editors.
        if (process.platform === 'darwin') {
          Menu.sendActionToFirstResponder('undo:');
        }
      };

      const redo = item.submenu.find((i) => i.label === 'Redo')!;
      delete redo.role; // override default role
      redo.click = () => {
        sendIpcEvent(IpcEvents.REDO_IN_EDITOR);

        // Allow redo to occur in text fields outside the editors.
        if (process.platform === 'darwin') {
          Menu.sendActionToFirstResponder('redo:');
        }
      };
    }

    // Tweak "View" menu
    if (label === 'View' && isSubmenu(item.submenu)) {
      // remove "Reload" and "Toggle Developer Tools" items
      item.submenu = item.submenu.filter(
        (subItem) =>
          subItem.label !== 'Toggle Developer Tools' &&
          subItem.label !== 'Reload',
      );
      item.submenu.push(
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      );
      item.submenu.push(
        { type: 'separator' },
        {
          label: 'Toggle Soft Wrap',
          click: () =>
            sendIpcEvent(IpcEvents.MONACO_TOGGLE_OPTION, ['wordWrap']),
        },
      );
      item.submenu.push(
        { type: 'separator' },
        {
          label: 'Toggle Mini Map',
          click: () =>
            sendIpcEvent(IpcEvents.MONACO_TOGGLE_OPTION, ['minimap.enabled']),
        },
      );
    }

    // Append items to "Help"
    if (label === 'Help' && isSubmenu(item.submenu)) {
      item.submenu = getHelpItems();
    }

    return item;
  });

  menu.splice(process.platform === 'darwin' ? 1 : 0, 0, getFileMenu());

  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
}
