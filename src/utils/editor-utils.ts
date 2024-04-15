import { EditorId, EditorValues, GridId, WinType } from '../interface';

export function sortGrid(grids: GridId[]) {
  const result: GridId[] = [];
  for (const grid of grids) {
    if (grid.endsWith('.py')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.endsWith('__CFG')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.endsWith('__Slice')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.endsWith('__VarDep')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.endsWith('__Flow')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.endsWith('__FlowGraph')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.endsWith('__TestCase')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.endsWith('__Analysis')) {
      result.push(grid);
    }
  }
  if (grids.length === 4) {
    [result[1], result[3]] = [result[3], result[1]];
  }
  return result;
}

export function getEmptyContent(filename: string): string {
  return `# ${filename}\n`;
}

export function getEditorTitle(id: GridId): string {
  if (id.endsWith('__Slice')) {
    const name = id.split('__')[0];
    return `Slice (${name})`;
  }
  if (id.endsWith('__Flow')) {
    const name = id.split('__')[0];
    return `DCPath (${name})`;
  }
  if (id.endsWith('__FlowGraph')) {
    const name = id.split('__')[0];
    return `Flow Graph (${name})`;
  }
  if (id.endsWith('__Analysis')) {
    const name = id.split('__')[0];
    return `Coverage Analysis (${name})`;
  }
  if (id.endsWith('__CFG')) {
    const name = id.split('__')[0];
    return `CFG (${name})`;
  }
  if (id.endsWith('__VarDep')) {
    const name = id.split('__')[0];
    return `VarDep (${name})`;
  }
  if (id.endsWith('__TestCase')) {
    const name = id.split('__')[0];
    return `TestCase (${name})`;
  }
  return id;
}

export function getGridId(type: WinType, id: EditorId): GridId {
  if (type !== WinType.EDITOR) return `${id}__${type}`;
  return id;
}

export function isSupportedFile(filename: string): filename is EditorId {
  return /\.py$/i.test(filename);
}

export function ensureNotEmpty(got: EditorValues): EditorValues {
  if (Object.keys(got).length === 0) {
    got['main.py'] = getEmptyContent('main.py');
  }
  return got;
}
