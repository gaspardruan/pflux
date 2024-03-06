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
  slice,
  Def,
  DEF,
  parse,
  MODULE,
} from '@msrvida/python-program-analysis';
import { ipcMain } from 'electron';
import { IpcEvents } from '../../ipc-events';

export class LocationSet extends SSet<Location> {
  constructor(...items: Location[]) {
    super(
      (l) =>
        [l.first_line, l.first_column, l.last_line, l.last_column].toString(),
      ...items,
    );
  }
}

function within(inner: Location, outer: Location): boolean {
  const leftWithin =
    outer.first_line < inner.first_line ||
    (outer.first_line === inner.first_line &&
      outer.first_column <= inner.first_column);
  const rightWithin =
    outer.last_line > inner.last_line ||
    (outer.last_line === inner.last_line &&
      outer.last_column >= inner.last_column);
  return leftWithin && rightWithin;
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
    line > startLine || (line === startLine && column >= startColumn);
  const beforeEnd = line < endLine || (line === endLine && column <= endColumn);
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

function isSameLocation(l1: Location, l2: Location): boolean {
  return (
    l1.first_line === l2.first_line &&
    l1.first_column === l2.first_column &&
    l1.last_line === l2.last_line &&
    l1.last_column === l2.last_column
  );
}

export enum SliceDirection {
  Forward,
  Backward,
}

/**
 * More general slice: given locations of important syntax nodes, find locations of all relevant
 * definitions. Locations can be mapped to lines later.
 * seedLocations are symbol locations.
 */
export function sliceVar(
  ast: Module,
  seedLocation: Location,
  _dataflowAnalyzer?: DataflowAnalyzer,
  direction = SliceDirection.Backward,
): LocationSet {
  const dataflowAnalyzer = _dataflowAnalyzer || new DataflowAnalyzer();
  const cfg = new ControlFlowGraph(ast);
  const dfa = dataflowAnalyzer.analyze(cfg).dataflows;

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
    } else if (nameCount2(seedNode.sources) === 1) {
      isLine = true;
    }
  } else if (seedNode.type === CALL) {
    if (nameCount(seedNode) === 1) {
      isLine = true;
    }
  } else if (nameCount(seedNode) === 1) {
    isLine = true;
  }

  const seedLocations = new LocationSet(seedLocation);
  if (isLine) return slice(ast, seedLocations);

  const sliceLocations = new LocationSet();
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
          sliceLocations.add(start.location!);
        }
      } else {
        sliceLocations.add(start.location!);
      }
    }
  }

  let lastSize: number;
  do {
    lastSize = sliceLocations.size;
    for (const flow of dfa.items) {
      const [start, end] =
        direction === SliceDirection.Backward
          ? [flow.fromNode.location, flow.toNode.location]
          : [flow.toNode.location, flow.fromNode.location];
      if (sliceLocations.some((loc) => within(end!, loc))) {
        sliceLocations.add(start!);
      }
    }
  } while (sliceLocations.size > lastSize);

  sliceLocations.add(seedLocation);
  return sliceLocations;
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
}

export function findSeedName(seedNode: SyntaxNode, seedLocation: Location) {
  let name = '';
  walk(seedNode, {
    onEnterNode: (node) => {
      if (node.type === NAME && isSameLocation(node.location!, seedLocation)) {
        name = node.id;
      }
    },
  });
  if (name === '') throw new Error('Please choose a variable');
  return name;
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

export function findFunctionAtLocation(code: string, location: Location) {
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
    return null;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  let index = 0;
  let firstLine = 0;
  funcs.forEach((func, i) => {
    if (func.location!.first_line > firstLine) {
      index = i;
      firstLine = func.location!.first_line;
    }
  });
  return funcs[index];
}

export function transFunc2Module(func: Def): Module {
  return {
    type: MODULE,
    code: func.code,
    location: func.location,
  };
}

export function getLineArray(code: string, location: Location) {
  const func = findFunctionAtLocation(code, location);
  if (func === null) {
    return [];
  }
  const module = transFunc2Module(func);
  const sliceLocations = sliceVar(module, location);
  const lines = new Set<number>();
  sliceLocations.items.forEach((loc) => {
    lines.add(loc.first_line);
  });
  return Array.from(lines).sort((a, b) => a - b);
}

export function setupSliceParse() {
  ipcMain.handle(
    IpcEvents.PARSE_SLICE,
    (_event, code: string, location: Location) => {
      try {
        return getLineArray(code, location);
      } catch (e) {
        return [];
      }
    },
  );
}
