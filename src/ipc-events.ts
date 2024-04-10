export enum IpcEvents {
  CLICK_TITLEBAR_MAC = 'CLICK_TITLEBAR_MAC',
  CONTROL_FLOW = 'CONTROL_FLOW',
  COVERAGE_STANDARD = 'COVERAGE_STANDARD',
  DEF_USE_LINES = 'DEF_USE_LINES',
  FS_DELETE_FILE = 'FS_DELETE_FILE',
  FS_GET_FILES = 'FS_GET_FILES',
  FS_OPEN_FLUX = 'FS_OPEN_FLUX',
  FS_RENAME_FILE = 'FS_RENAME_FILE',
  GET_FILES = 'GET_FILES',
  GET_PYTHON_PATH = 'GET_PYTHON_PATH',
  MONACO_EXECUTE_COMMAND = 'MONACO_EXECUTE_COMMAND',
  MONACO_TOGGLE_OPTION = 'MONACO_TOGGLE_OPTION',
  OPEN_SETTINGS = 'OPEN_SETTINGS',
  PARSE_STRUCT = 'PARSE_STRUCT',
  PARSE_SLICE = 'PARSE_SLICE',
  PATH_EXISTS = 'PATH_EXISTS',
  REDO_IN_EDITOR = 'REDO_IN_EDITOR',
  RELOAD_WINDOW = 'RELOAD_WINDOW',
  SAVED_LOCAL_FLUX = 'SAVED_LOCAL_FLUX',
  SAY_HELLO = 'SAY_HELLO',
  SELECT_ALL_IN_EDITOR = 'SELECT_ALL_IN_EDITOR',
  SET_NATIVE_THEME = 'SET_NATIVE_THEME',
  UNDO_IN_EDITOR = 'UNDO_IN_EDITOR',
}

export const ipcMainEvents = [
  IpcEvents.CLICK_TITLEBAR_MAC,
  IpcEvents.CONTROL_FLOW,
  IpcEvents.COVERAGE_STANDARD,
  IpcEvents.DEF_USE_LINES,
  IpcEvents.FS_DELETE_FILE,
  IpcEvents.FS_GET_FILES,
  IpcEvents.FS_RENAME_FILE,
  IpcEvents.GET_PYTHON_PATH,
  IpcEvents.PARSE_STRUCT,
  IpcEvents.PARSE_SLICE,
  IpcEvents.RELOAD_WINDOW,
  IpcEvents.SAY_HELLO,
  IpcEvents.SET_NATIVE_THEME,
];
