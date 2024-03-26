import { ipcMain } from 'electron';
import {
  ASSIGN,
  Assignment,
  CALL,
  ControlFlowGraph,
  DEF,
  DataflowAnalyzer,
  Def,
  Location,
  MODULE,
  Module,
  Parameter,
  parse,
  walk,
} from '@msrvida/python-program-analysis';
import { findSeedName, within } from './common';
import { DefUseCollection, DCPath, UseType } from '../../interface';
import { IpcEvents } from '../../ipc-events';

export function findFunctionAtLocation(
  code: string,
  location: Location,
): Module {
  const funcs: Def[] = [];
  const tree = parse(code);
  walk(tree, {
    onEnterNode: (node) => {
      if (node.type === DEF && within(location, node.location!)) {
        funcs.push(node);
      }
    },
  });
  if (funcs.length === 0) {
    return tree;
  }
  if (funcs.length === 1) {
    const func = funcs[0];
    fixFunction(func);
    return {
      type: MODULE,
      code: func.code,
      location: func.location,
    };
  }
  let index = 0;
  let firstLine = 0;
  funcs.forEach((func, i) => {
    if (func.location!.first_line > firstLine) {
      index = i;
      firstLine = func.location!.first_line;
    }
  });
  const func = funcs[index];
  fixFunction(func);
  return {
    type: MODULE,
    code: func.code,
    location: func.location,
  };
}

export function fixFunction(func: Def) {
  // console.log(JSON.stringify(func, null, 2));
  const params = parseFuncHeader(
    func.location!.first_line,
    func.location!.first_column,
    func.params,
  );
  const paramsLoc = func.params.map((p) => p.location!);
  if (params) {
    fixVarLocation(params, paramsLoc);
    func.code.unshift(params);
  }
  return params !== null;
}

export function parseFuncHeader(
  funcLine: number,
  funcColumn: number,
  params: Parameter[],
): Assignment | null {
  if (params.length === 0) return null;
  const left = params.map((p) => p.name).join(', ');
  const right = params.map(() => '0').join(', ');
  const code = `${left} = ${right}`;
  const ast = parse(code);
  // console.log(JSON.stringify(ast, null, 2));
  fixLocation(ast, funcLine, funcColumn);
  return ast.code[0] as Assignment;
}
export function fixVarLocation(ast: Assignment, locations: Location[]) {
  ast.targets.forEach((target, i) => {
    target.location = locations[i];
  });
}

export function fixLocation(ast: Module, line: number, column: number) {
  walk(ast, {
    onEnterNode: (node) => {
      if (node.location) {
        node.location.first_line += line - 1;
        node.location.last_line += line - 1;
        if (node.type !== MODULE) {
          node.location.first_column += column + 2;
          node.location.last_column += column + 2;
        }
      }
    },
  });
}

export function getDefUseLines(
  code: string,
  location: Location,
): DefUseCollection {
  const module = findFunctionAtLocation(code, location);
  const cfg = new ControlFlowGraph(module);
  const dataflowAnalyzer = new DataflowAnalyzer();
  const dfa = dataflowAnalyzer.analyze(cfg).dataflows;

  const varName = findSeedName(module, location);
  const defSet = new Set<Location>();
  const useSet = new Set<Location>();
  const defLineSet = new Set<number>();
  const useLineSet = new Set<number>();
  const lineSet = new Set<number>();
  const dcPaths: DCPath[] = [];

  dfa.items.forEach((flow) => {
    if (
      flow.fromRef &&
      flow.toRef &&
      flow.fromRef.name === varName &&
      flow.toRef.name === varName
    ) {
      defSet.add(flow.fromRef.location);
      useSet.add(flow.toRef.location);
      defLineSet.add(flow.fromRef.location.first_line);
      useLineSet.add(flow.toRef.location.first_line);
      lineSet.add(flow.fromRef.location.first_line);
      lineSet.add(flow.toRef.location.first_line);

      dcPaths.push({
        startLine: flow.fromRef.location.first_line,
        endLine: flow.toRef.location.first_line,
        useType:
          flow.toRef.node.type === ASSIGN || flow.toRef.node.type === CALL
            ? UseType.C
            : UseType.P,
      });
    }
  });

  const defs = Array.from(defSet);
  defs.forEach((def) => {
    def.first_column += 1;
    def.last_column += 1;
  });

  const uses = Array.from(useSet);
  uses.forEach((use) => {
    use.first_column += 1;
    use.last_column += 1;
  });

  const defUseLines: number[] = [];
  defLineSet.forEach((line) => {
    if (useLineSet.has(line)) {
      defUseLines.push(line);
    }
  });
  defUseLines.forEach((line) => {
    defLineSet.delete(line);
    useLineSet.delete(line);
  });

  return {
    varName,
    defs,
    uses,
    lines: Array.from(lineSet),
    defLines: Array.from(defLineSet),
    useLines: Array.from(useLineSet),
    defUseLines,
    dcPaths,
  };
}

export function setupDefUseLines() {
  ipcMain.handle(
    IpcEvents.DEF_USE_LINES,
    (_event, code: string, location: Location) => {
      try {
        return getDefUseLines(code, location);
      } catch (e) {
        console.error(e);
        return {
          varName: '',
          defs: [],
          uses: [],
          lines: [],
          defLines: [],
          useLines: [],
          defUseLines: [],
          dcPaths: [],
        };
      }
    },
  );
}
