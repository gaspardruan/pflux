import { EditorId, EditorValues, GridId } from '../interface';

export function sortGrid(grids: GridId[]) {
  const result: GridId[] = [];
  for (const grid of grids) {
    if (grid.endsWith('.py')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.startsWith('Slice__')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.startsWith('Flow__')) {
      result.push(grid);
    }
  }
  for (const grid of grids) {
    if (grid.startsWith('Analysis__')) {
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
  if (id.endsWith('.py')) {
    return id;
  }
  if (id.startsWith('Slice__')) {
    return `Slice (${id})`;
  }
  if (id.startsWith('Flow__')) {
    return `Flow (${id})`;
  }
  if (id.startsWith('Analysis__')) {
    return `Analysis (${id})`;
  }
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
