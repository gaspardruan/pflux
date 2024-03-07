import { IRange } from 'monaco-editor';

export type Files = Map<string, string>;

export enum GlobalSetting {
  isUsingSystemTheme = 'isUsingSystemTheme',
  theme = 'theme',
  fontFamily = 'fontFamily',
  fontSize = 'fontSize',
  folderPath = 'folderPath',
  folderName = 'folderName',
}

export interface GenericDialogOptions {
  type: GenericDialogType;
  ok: string;
  cancel?: string;
  wantsInput: boolean;
  defaultInput?: string;
  // eslint-disable-next-line no-undef
  label: string | React.JSX.Element;
  placeholder?: string;
}

export const enum GenericDialogType {
  'confirm' = 'confirm',
  'warning' = 'warning',
  'success' = 'success',
}

export enum WinType {
  ANALYSIS = 'Analysis',
  FLOW = 'Flow',
  SLICE = 'Slice',
}

export type EditorId = `${string}.${'py'}`;
export type SliceId = `${string}.${'py'}__Slice`;
export type FlowId = `${string}.${'py'}__Flow`;
export type AnalysisId = `${string}.${'py'}__Analysis`;
export type GridId = EditorId | SliceId | FlowId | AnalysisId;

export type EditorValues = Record<EditorId, string>;

export type FluxEvent =
  | 'execute-monaco-command'
  | 'open-flux'
  | 'open-settings'
  | 'redo-in-editor'
  | 'saved-local-flux'
  | 'select-all-in-editor'
  | 'toggle-monaco-option'
  | 'undo-in-editor';

export type NodeType =
  | 'class'
  | 'method'
  | 'property'
  | 'attribute'
  | 'function'
  | 'variable';

export interface StructNodeInfo {
  type: NodeType;
  text: string;
  code: Array<StructNodeInfo>;
  range: IRange;
}
