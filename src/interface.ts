export enum GlobalSetting {
  isUsingSystemTheme = 'isUsingSystemTheme',
  theme = 'theme',
  fontFamily = 'fontFamily',
  fontSize = 'fontSize',
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

export type EditorId = `${string}.${'py'}`;
export type SliceId = `Slice__${string}.${'py'}`;
export type FlowId = `Flow__${string}.${'py'}`;
export type AnalysisId = `Analysis__${string}.${'py'}`;
export type GridId = EditorId | SliceId | FlowId | AnalysisId;

export type EditorValues = Record<EditorId, string>;

export type FluxEvent =
  | 'execute-monaco-command'
  | 'open-settings'
  | 'redo-in-editor'
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
}
