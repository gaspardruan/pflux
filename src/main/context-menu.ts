import {
  BrowserWindow,
  ContextMenuParams,
  Menu,
  MenuItemConstructorOptions,
} from 'electron';

import sendIpcEvent from './ipc';
import { IpcEvents } from '../ipc-events';

/**
 * Possibly returns items interacting with the Monaco editor.
 * Our check for "are we in the Monaco editor" is pretty crude -
 * we just assume that we are if we can paste text.
 *
 * @param {ContextMenuParams} { pageURL, editFlags }
 * @returns {Array<MenuItemConstructorOptions>}
 */
export function getMonacoItems({
  editFlags,
}: ContextMenuParams): Array<MenuItemConstructorOptions> {
  if (!editFlags.canPaste) {
    return [];
  }

  return [
    // {
    //   id: "go_to_definition",
    //   label: "Go to Definition",
    //   click() {
    //     const cmd = ["editor.action.revealDefinition"];
    //     sendIpcEvent(IpcEvents.MONACO_EXECUTE_COMMAND, cmd);
    //   },
    // },
    // {
    //   id: "peek_definition",
    //   label: "Peek Definition",
    //   click() {
    //     const cmd = ["editor.action.peekDefinition"];
    //     sendIpcEvent(IpcEvents.MONACO_EXECUTE_COMMAND, cmd);
    //   },
    // },
    // {
    //   id: "references",
    //   label: "Find References",
    //   click() {
    //     const cmd = ["editor.action.referenceSearch.trigger"];
    //     sendIpcEvent(IpcEvents.MONACO_EXECUTE_COMMAND, cmd);
    //   },
    // },
    // {
    //   type: "separator",
    // },
    {
      id: 'palette',
      label: 'Command Palette',
      click() {
        const cmd = ['editor.action.quickCommand'];
        sendIpcEvent(IpcEvents.MONACO_EXECUTE_COMMAND, cmd);
      },
    },
    // { type: "separator" },
    // {
    //   id: "format_document",
    //   label: "Format Document",
    //   click() {
    //     const cmd = ["editor.action.formatDocument"];
    //     sendIpcEvent(IpcEvents.MONACO_EXECUTE_COMMAND, cmd);
    //   },
    // },
    // {
    //   id: "format_selection",
    //   label: "Format Selection",
    //   click() {
    //     const cmd = ["editor.action.formatSelection"];
    //     sendIpcEvent(IpcEvents.MONACO_EXECUTE_COMMAND, cmd);
    //   },
    // },
    { type: 'separator' },
  ];
}

export function createContextMenu(browserWindows: BrowserWindow) {
  browserWindows.webContents.on('context-menu', (_, props) => {
    const { editFlags } = props;

    const template: Array<MenuItemConstructorOptions> = [
      ...getMonacoItems(props),
      {
        id: 'cut',
        label: 'Cut',
        role: 'cut',
        enabled: editFlags.canCut,
      },
      {
        id: 'copy',
        label: 'Copy',
        role: 'copy',
        enabled: editFlags.canCopy,
      },
      {
        id: 'paste',
        label: 'Paste',
        role: 'paste',
        enabled: editFlags.canPaste,
      },
      {
        type: 'separator',
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({});
  });
}
