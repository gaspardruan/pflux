import { ipcMain } from 'electron';
import { Location } from '@msrvida/python-program-analysis';
import { sliceVar } from './slice-parse';
import { getModuleByLocation, findSeedName } from './common';
import { DefUseCollection } from '../../interface';

export function getDefUseLines(
  code: string,
  location: Location,
): DefUseCollection {
  const module = getModuleByLocation(code, location);
  const dfa = sliceVar(module, location)[1];

  const varName = findSeedName(module, location);
  const defSet = new Set<Location>();
  const useSet = new Set<Location>();
  const defLineSet = new Set<number>();
  const useLineSet = new Set<number>();
  const lineSet = new Set<number>();

  dfa.forEach((flow) => {
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
    defs,
    uses,
    lines: Array.from(lineSet),
    defLines: Array.from(defLineSet),
    useLines: Array.from(useLineSet),
    defUseLines,
  };
}

export function setupDefUseLines() {
  ipcMain.handle('DEF_USE_LINES', (event, code: string, location: Location) => {
    try {
      return getDefUseLines(code, location);
    } catch (e) {
      console.error(e);
      return {
        defs: [],
        uses: [],
        lines: [],
        defLines: [],
        useLines: [],
        defUseLines: [],
      };
    }
  });
}
