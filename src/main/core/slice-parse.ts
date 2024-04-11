/* eslint-disable max-classes-per-file */
import {
  Location,
  Module,
  ControlFlowGraph,
  DataflowAnalyzer,
  ASSIGN,
  SyntaxNode,
  Set as SSet,
  walk,
  NAME,
  CALL,
  Name,
  Dataflow,
  Def,
  parse,
  DEF,
  MODULE,
  Parameter,
} from '@msrvida/python-program-analysis';
import { ipcMain } from 'electron';
import { within, isSameLocation, findSeedName } from './common';
import { IpcEvents } from '../../ipc-events';
import { Variable, VarDep, SliceResult } from '../../interface';

export class LocationSet extends SSet<Location> {
  constructor(...items: Location[]) {
    super(
      (l) =>
        [l.first_line, l.first_column, l.last_line, l.last_column].toString(),
      ...items,
    );
  }
}

export class DepSet extends SSet<VarDep> {
  constructor(...items: VarDep[]) {
    super((d) => `${d.from}-${d.to}`, ...items);
  }
}

export class NodeSet extends SSet<SyntaxNode> {
  constructor(...items: SyntaxNode[]) {
    super(
      (n) => {
        const l = n.location!;
        return [
          l.first_line,
          l.first_column,
          l.last_line,
          l.last_column,
        ].toString();
      },
      ...items,
    );
  }
}

function vid(n: string, l: number): string {
  return `${n}_${l}`;
}

function isPositionBetween(
  line: number,
  column: number,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
) {
  const afterStart =
    line > startLine || (line === startLine && column > startColumn);
  const beforeEnd = line < endLine || (line === endLine && column < endColumn);
  return afterStart && beforeEnd;
}

function intersect(l1: Location, l2: Location): boolean {
  return (
    isPositionBetween(
      l1.first_line,
      l1.first_column,
      l2.first_line,
      l2.first_column,
      l2.last_line,
      l2.last_column,
    ) ||
    isPositionBetween(
      l1.last_line,
      l1.last_column,
      l2.first_line,
      l2.first_column,
      l2.last_line,
      l2.last_column,
    ) ||
    within(l1, l2) ||
    within(l2, l1)
  );
}

export enum SliceDirection {
  Forward,
  Backward,
}

export function slice(
  ast: Module,
  seedLocations?: LocationSet,
  _dataflowAnalyzer?: DataflowAnalyzer,
  direction = SliceDirection.Backward,
): [NodeSet, Set<Dataflow>, SyntaxNode | null] {
  const dataflowAnalyzer = _dataflowAnalyzer || new DataflowAnalyzer();
  const cfg = new ControlFlowGraph(ast);
  const dfa = dataflowAnalyzer.analyze(cfg).dataflows;
  const usedFlow = new Set<Dataflow>();

  // Include at least the full statements for each seed.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let acceptNode = (_node: SyntaxNode) => true;
  let sliceNodes = new NodeSet();
  if (seedLocations) {
    const seedStatementNodes = findSeedStatementNodes(seedLocations, cfg);
    acceptNode = (node) =>
      seedStatementNodes.some((seedStmtNode) =>
        intersect(seedStmtNode.location!, node.location!),
      );
    sliceNodes = new NodeSet(...seedStatementNodes.items);
  }

  let lastSize: number;
  do {
    lastSize = sliceNodes.size;
    for (const flow of dfa.items) {
      const [start, end] =
        direction === SliceDirection.Backward
          ? [flow.fromNode, flow.toNode]
          : [flow.toNode, flow.fromNode];
      if (acceptNode(end)) {
        sliceNodes.add(end);
        usedFlow.add(flow);
      }
      if (sliceNodes.some((node) => within(end.location!, node.location!))) {
        sliceNodes.add(start);
        usedFlow.add(flow);
      }
    }
  } while (sliceNodes.size > lastSize);

  return [sliceNodes, usedFlow, null];
}

export function sliceVar(
  ast: Module,
  seedLocation: Location,
  _dataflowAnalyzer?: DataflowAnalyzer,
  direction = SliceDirection.Backward,
): [NodeSet, Set<Dataflow>, SyntaxNode | null] {
  const dataflowAnalyzer = _dataflowAnalyzer || new DataflowAnalyzer();
  const cfg = new ControlFlowGraph(ast);
  const dfa = dataflowAnalyzer.analyze(cfg).dataflows;
  const usedFlow = new Set<Dataflow>();

  let isLine = false;
  const seedNode = findSeedStatement(seedLocation, cfg)!;
  if (!seedNode) {
    throw new Error('Seed statement not found');
  }
  if (seedNode.type === ASSIGN) {
    if (
      seedNode.targets.some((target) =>
        isSameLocation(target.location!, seedLocation),
      )
    ) {
      isLine = true;
    }
  } else if (seedNode.type === CALL) {
    if (nameCount(seedNode) === 1) {
      isLine = true;
    }
  } else if (nameCount(seedNode) === 1) {
    isLine = true;
  }

  if (isLine) return slice(ast, new LocationSet(seedLocation));

  const sliceNodes = new NodeSet();
  const seedNodeLocation = seedNode.location!;
  const seedName = findSeedName(seedNode, seedLocation);
  for (const flow of dfa.items) {
    const [start, end] =
      direction === SliceDirection.Backward
        ? [flow.fromNode, flow.toNode]
        : [flow.toNode, flow.fromNode];

    if (within(end.location!, seedNodeLocation)) {
      if (start.type === ASSIGN) {
        if (
          start.targets.some((target) => {
            if (target.type === NAME) {
              return target.id === seedName;
            }
            return false;
          })
        ) {
          sliceNodes.add(start);
          usedFlow.add(flow);
        }
      } else {
        sliceNodes.add(start);
        usedFlow.add(flow);
      }
    }
  }

  let lastSize: number;
  do {
    lastSize = sliceNodes.size;
    for (const flow of dfa.items) {
      const [start, end] =
        direction === SliceDirection.Backward
          ? [flow.fromNode, flow.toNode]
          : [flow.toNode, flow.fromNode];
      if (sliceNodes.some((node) => within(end.location!, node.location!))) {
        sliceNodes.add(start);
        usedFlow.add(flow);
      }
    }
  } while (sliceNodes.size > lastSize);

  return [sliceNodes, usedFlow, seedNode];
}

// eslint-disable-next-line consistent-return
function findSeedStatement(seedLocation: Location, cfg: ControlFlowGraph) {
  for (const block of cfg.blocks) {
    for (const statement of block.statements) {
      if (intersect(seedLocation, statement.location!)) {
        return statement;
      }
    }
  }
  return undefined;
}

function findSeedStatementNodes(
  seedLocations: LocationSet,
  cfg: ControlFlowGraph,
) {
  const seedStatementNodes = new NodeSet();
  seedLocations.items.forEach((seedLoc) => {
    for (const block of cfg.blocks) {
      for (const statement of block.statements) {
        if (intersect(seedLoc, statement.location!)) {
          seedStatementNodes.add(statement);
        }
      }
    }
  });
  return seedStatementNodes;
}

export function nameCount(_node: SyntaxNode) {
  const nameSet = new Set<string>();
  const funcSet = new Set<string>();
  walk(_node, {
    onEnterNode: (node) => {
      if (node.type === NAME) {
        nameSet.add(node.id);
      } else if (node.type === CALL) {
        const func = node.func as Name;
        funcSet.add(func.id);
      }
    },
  });
  return nameSet.size - funcSet.size;
}

export function nameCount2(nodes: Array<SyntaxNode>) {
  const nameSet = new Set<string>();
  const funcSet = new Set<string>();
  nodes.forEach((_node) => {
    walk(_node, {
      onEnterNode: (node) => {
        if (node.type === NAME) {
          nameSet.add(node.id);
        } else if (node.type === CALL) {
          const func = node.func as Name;
          funcSet.add(func.id);
        }
      },
    });
  });
  return nameSet.size - funcSet.size;
}

export function getVarName(_node: SyntaxNode) {
  const nameSet = new Set<string>();
  const funcSet = new Set<string>();

  walk(_node, {
    onEnterNode: (node) => {
      if (node.type === NAME) {
        nameSet.add(node.id);
      } else if (node.type === CALL) {
        const func = node.func as Name;
        funcSet.add(func.id);
      }
    },
  });
  const rltSet: string[] = [];
  nameSet.forEach((name) => {
    if (!funcSet.has(name)) {
      rltSet.push(name);
    }
  });
  return rltSet;
}

export function getVarTable(sliceNodes: NodeSet) {
  const varTable = new Map<string, Variable>();
  sliceNodes.items.forEach((node) => {
    if (node.type === ASSIGN) {
      node.targets.forEach((target) => {
        if (target.type === NAME) {
          const id = vid(target.id, target.location!.first_line);
          const v = { name: target.id, line: target.location!.first_line };
          varTable.set(id, v);
        }
      });
    }
  });
  return varTable;
}

export function getVarDep(
  dfa: Set<Dataflow>,
  varTable: Map<string, Variable>,
  useDef: Map<SyntaxNode, Variable[]>,
): DepSet {
  const varDep = new DepSet();
  dfa.forEach((flow) => {
    if (flow.fromRef && flow.toRef) {
      const from = flow.fromRef;
      const to = flow.toRef;
      if (to.node.type === ASSIGN && from.node.type === ASSIGN) {
        const fromId = vid(from.name, from.location!.first_line);
        to.node.targets.forEach((target) => {
          if (target.type === NAME) {
            const toId = vid(target.id, target.location!.first_line);
            if (varTable.has(toId) && varTable.has(fromId)) {
              const dep = { from: toId, to: fromId };
              varDep.add(dep);
            }
          }
        });
      }
    } else {
      const from = flow.fromNode;
      const to = flow.toNode;
      if (to.type === ASSIGN && from.type === ASSIGN) {
        const fromSrc: Map<string, number> = new Map();
        from.targets.forEach((target) => {
          if (target.type === NAME) {
            fromSrc.set(target.id, target.location!.first_line);
          }
        });
        const size = to.sources.length;
        for (let i = 0; i < size; i += 1) {
          const source = to.sources[i];
          const target = to.targets[i];
          if (target.type === NAME) {
            const toId = vid(target.id, target.location!.first_line);
            const sourceNames = getVarName(source);
            sourceNames.forEach((name) => {
              if (fromSrc.has(name)) {
                const fromId = vid(name, fromSrc.get(name)!);
                if (varTable.has(toId) && varTable.has(fromId)) {
                  const dep = { from: toId, to: fromId };
                  varDep.add(dep);
                }
              }
            });
          }
        }
      } else if (to.type === ASSIGN) {
        to.targets.forEach((target) => {
          if (target.type === NAME) {
            const toId = vid(target.id, target.location!.first_line);
            const use = useDef.get(from);
            if (use && varTable.has(toId)) {
              use.forEach((v) => {
                const fromId = vid(v.name, v.line);
                if (varTable.has(fromId)) {
                  const dep = { from: toId, to: fromId };
                  varDep.add(dep);
                }
              });
            }
          }
        });
      }
    }
  });
  return varDep;
}

export function getUseDef(dfa: Set<Dataflow>) {
  const useDef = new Map<SyntaxNode, Variable[]>();
  dfa.forEach((flow) => {
    if (flow.fromRef && flow.toRef) {
      const from = flow.fromRef;
      const to = flow.toRef;
      if (from.node.type === ASSIGN && to.node.type !== ASSIGN) {
        if (!useDef.has(to.node)) {
          useDef.set(to.node, []);
        }
        useDef.get(to.node)!.push({
          name: from.name,
          line: from.location!.first_line,
        });
      }
    }
  });
  return useDef;
}

export function toMermaid(vars: Variable[], varDep: VarDep[]) {
  const nodes = vars.map(
    (v) => `  ${vid(v.name, v.line)}("\`${v.line}: ${v.name}\`")`,
  );
  const edges = varDep.map((dep) => `  ${dep.from} --> ${dep.to}`);
  return `flowchart TD\n${nodes.join('\n')}\n${edges.join('\n')}`;
}

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
  const params = parseFuncHeader(
    func.location!.first_line,
    func.location!.first_column,
    func.params,
  );
  if (params) func.code.unshift(params);
  return params !== null;
}

export function parseFuncHeader(
  funcLine: number,
  funcColumn: number,
  params: Parameter[],
) {
  if (params.length === 0) return null;
  const left = params.map((p) => p.name).join(', ');
  const right = params.map(() => '0').join(', ');
  const code = `${left} = ${right}`;
  const ast = parse(code);
  fixLocation(ast, funcLine, funcColumn);
  return ast.code[0];
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

export function getSliceResult(code: string, location: Location): SliceResult {
  const module = findFunctionAtLocation(code, location);
  const [sliceNodes, dfa, seedNode] = sliceVar(module, location);

  const varTable = getVarTable(sliceNodes);
  const useDef = getUseDef(dfa);
  const varDep = getVarDep(dfa, varTable, useDef);

  const lineSet = new Set<number>();
  if (seedNode) sliceNodes.add(seedNode);
  sliceNodes.items.forEach((node) => {
    lineSet.add(node.location!.first_line);
  });

  const vars = Array.from(varTable.values());
  const deps = varDep.items;
  const varDepGraph = toMermaid(vars, deps);
  const lines = Array.from(lineSet).sort((a, b) => a - b);
  return { lines, varDepGraph };
}

export function setupSliceParse() {
  ipcMain.handle(
    IpcEvents.PARSE_SLICE,
    (_event, code: string, location: Location) => {
      try {
        return getSliceResult(code, location);
      } catch (e) {
        return { lines: [], varDepGraph: '' };
      }
    },
  );
}
