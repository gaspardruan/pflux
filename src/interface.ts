import { IRange } from 'monaco-editor';
import { Location } from '@msrvida/python-program-analysis';

export type Files = Map<string, string>;

export enum GlobalSetting {
  isUsingSystemTheme = 'isUsingSystemTheme',
  theme = 'theme',
  fontFamily = 'fontFamily',
  fontFamilyList = 'fontFamilyList',
  fontSize = 'fontSize',
  folderPath = 'folderPath',
  folderName = 'folderName',
}

export type WrapperEditorId = 'sidebar' | 'editors' | 'input';

export interface GenericDialogOptions {
  type: GenericDialogType;
  ok: string;
  cancel?: string;
  wantsInput: boolean;
  defaultInput?: string;
  label: string | React.JSX.Element;
  placeholder?: string;
}

export const enum GenericDialogType {
  'confirm' = 'confirm',
  'warning' = 'warning',
  'success' = 'success',
}

export enum WinType {
  EDITOR = 'Editor',
  ANALYSIS = 'Analysis',
  FLOW = 'Flow',
  SLICE = 'Slice',
  CFG = 'CFG',
  VARDEP = 'VarDep',
  TESTCASE = 'TestCase',
}

export type EditorId = `${string}.${'py'}`;
export type SliceId = `${string}.${'py'}__Slice`;
export type CFGId = `${string}.${'py'}__CFG`;
export type VarDepId = `${string}.${'py'}__VarDep`;
export type FlowId = `${string}.${'py'}__Flow`;
export type AnalysisId = `${string}.${'py'}__Analysis`;
export type TestCaseId = `${string}.${'py'}__TestCase`;
export type GridId =
  | EditorId
  | SliceId
  | FlowId
  | AnalysisId
  | CFGId
  | TestCaseId
  | VarDepId;

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

export interface Link {
  from: number;
  to: number;
  label?: string;
}

export interface Variable {
  name: string;
  line: number;
}

export interface VarDep {
  from: string;
  to: string;
}

export interface SliceResult {
  lines: number[];
  varDepGraph: string;
}

export interface DefUseCollection {
  varName: string;
  defs: Location[];
  uses: Location[];
  lines: number[];
  defLines: number[];
  useLines: number[];
  defUseLines: number[];
  dcPaths: DCPath[];
}

export enum UseType {
  C = 'compute',
  P = 'predicate',
}

export interface DCPath {
  startLine: number;
  endLine: number;
  useType: UseType;
}

export interface TestCaseCollection {
  focusedFuncSignature: string;
  testCases: Map<string, Map<string, string>[]>;
}

export interface DataflowRecord {
  startLine: number;
  endLine: number;
  covered: boolean;
}

export interface DataflowGroupOnlyUse {
  pUses: DataflowRecord[];
  cUses: DataflowRecord[];
}

export interface CoverageStandard {
  allDef: boolean;
  allCUse: boolean;
  allPUse: boolean;
  allCUseSomePUse: boolean;
  allPUseSomeCUse: boolean;
  allUse: boolean;
}

export interface CoverageResult {
  standard: CoverageStandard;
  standard2Mermaid: string;
  execPaths: number[][];
  detail: Map<string, DataflowGroupOnlyUse>;
}
