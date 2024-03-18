import {
  DEF,
  Def,
  Module,
  Location,
  parse,
  walk,
  MODULE,
  SyntaxNode,
  NAME,
} from '@msrvida/python-program-analysis';

export function within(inner: Location, outer: Location): boolean {
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

export function isSameLocation(l1: Location, l2: Location): boolean {
  return (
    l1.first_line === l2.first_line &&
    l1.first_column === l2.first_column &&
    l1.last_line === l2.last_line &&
    l1.last_column === l2.last_column
  );
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

export function findFunctionAtLocation(
  code: string,
  location: Location,
): [Def | null, Module] {
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
    return [null, tree];
  }
  if (funcs.length === 1) {
    return [funcs[0], tree];
  }
  let index = 0;
  let firstLine = 0;
  funcs.forEach((func, i) => {
    if (func.location!.first_line > firstLine) {
      index = i;
      firstLine = func.location!.first_line;
    }
  });
  return [funcs[index], tree];
}

export function transFunc2Module(func: Def): Module {
  return {
    type: MODULE,
    code: func.code,
    location: func.location,
  };
}

export function getModuleByLocation(code: string, location: Location): Module {
  const [func, tree] = findFunctionAtLocation(code, location);
  let module: Module;
  if (func === null) {
    module = tree;
  } else {
    module = transFunc2Module(func);
  }
  return module;
}
