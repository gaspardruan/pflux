import { ipcMain } from 'electron';
import {
  ASSIGN,
  Assignment,
  Block,
  CALL,
  ControlFlowGraph,
  DEF,
  DataflowAnalyzer,
  Def,
  Location,
  MODULE,
  Module,
  NAME,
  PASS,
  Parameter,
  parse,
  printNode,
  walk,
} from '@msrvida/python-program-analysis';
import { findSeedName, within } from './common';
import { DefUseCollection, DCPath, UseType, Link } from '../../interface';
import { IpcEvents } from '../../ipc-events';
import { getShape, findFunctionAtLine, readBlocks } from './control-flow';

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

export function dcPathInMermaid(
  blocks: Block[],
  conn: Link[],
  isFixed: boolean,
  dcPaths: DCPath[],
): string {
  let linkCount = 0;

  const nodes = blocks.map((b, bIndex) => {
    const str =
      b.statements
        .map((s, sIndex) => {
          if (isFixed && bIndex === 0 && sIndex === 0) {
            if (s.type === ASSIGN) {
              const params = s.targets
                .map((t) => {
                  if (t.type === NAME) return t.id;
                  throw new Error('Function params parsing error');
                })
                .join(', ');
              return `${s.location?.first_line}: Params: ${params}`;
            }
            throw new Error('Function params parsing error');
          }
          return `${s.location?.first_line}: ${
            s.type === PASS ? 'pass' : printNode(s)
          }`;
        })
        .join('\n')
        .replace(/"/g, '#quot;')
        .replace(/</g, ' < ') || (b.hint === 'entry' ? 'Start' : ' ');
    const [start, end] = getShape(b.hint, str === ' ', str === 'Start');
    if (str === ' ' || str === 'Start')
      return `  BLOCK_${b.id}${start}"\`${
        b.hint === 'for loop head' ? '(for loop)\n' : ''
      }${str}\`"${end}`;

    const lineNums: string[] = [];
    const subgraph = str.split('\n').map((s) => {
      const lineNum = s.split(':')[0];
      lineNums.push(lineNum);
      return `  LINE_${lineNum}${start}"\`${
        b.hint === 'for loop head' ? '(for loop)\n' : ''
      }${s}\`"${end}`;
    });
    const invisibleLinks = [];
    for (let i = 0; i < lineNums.length - 1; i += 1) {
      invisibleLinks.push(`  LINE_${lineNums[i]} ~~~ LINE_${lineNums[i + 1]}`);
    }
    linkCount += invisibleLinks.length;
    return `  subgraph BLOCK_${b.id}\n  direction TB\n${subgraph.join(
      '\n',
    )}\n${invisibleLinks.join('\n')}${
      invisibleLinks.length === 0 ? '' : '\n'
    }  end`;
  });

  const cUseOrder: number[] = [];
  const pUserOrder: number[] = [];
  const dcPathStr = dcPaths.map((dc) => {
    if (dc.useType === UseType.C) {
      cUseOrder.push(linkCount);
    } else {
      pUserOrder.push(linkCount);
    }
    linkCount += 1;
    return `  LINE_${dc.startLine} --> LINE_${dc.endLine}`;
  });

  const cUselinkStyle =
    cUseOrder.length > 0
      ? `  linkStyle ${cUseOrder.join(',')} stroke:blue,stroke-width:1px`
      : '';
  const pUselinkStyle =
    pUserOrder.length > 0
      ? `  linkStyle ${pUserOrder.join(',')} stroke:green,stroke-width:1px`
      : '';

  const edges = conn.map((c) => {
    return `  BLOCK_${c.from} ${c.label ? '--->' : '-->'}${
      c.label ? `|${c.label}|` : ''
    } BLOCK_${c.to}`;
  });

  return `flowchart TB\n${nodes.join('\n')}\n${dcPathStr.join(
    '\n',
  )}\n${edges.join('\n')}\n${cUselinkStyle}\n${pUselinkStyle}`;
}

export function getMermaid(code: string, funcLine: number, dcPaths: DCPath[]) {
  const [ast, isFixed] = findFunctionAtLine(code, funcLine);
  const [blocks, conn] = readBlocks(ast);
  const connArray = Array.from(conn.values());
  return dcPathInMermaid(blocks, connArray, isFixed, dcPaths);
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

  const dcMermaid = getMermaid(code, module.location!.first_line, dcPaths);

  return {
    varName,
    defs,
    uses,
    lines: Array.from(lineSet),
    defLines: Array.from(defLineSet),
    useLines: Array.from(useLineSet),
    defUseLines,
    dcPaths,
    dcMermaid,
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
          dcMermaid: '',
        };
      }
    },
  );
}
