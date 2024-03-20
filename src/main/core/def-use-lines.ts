import { ipcMain } from 'electron';
import {
  ASSIGN,
  CALL,
  ControlFlowGraph,
  DataflowAnalyzer,
  Location,
} from '@msrvida/python-program-analysis';
import { getModuleByLocation, findSeedName } from './common';
import { DefUseCollection, DCPath, UseType } from '../../interface';

export function getDefUseLines(
  code: string,
  location: Location,
): DefUseCollection {
  const module = getModuleByLocation(code, location);
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
  ipcMain.handle('DEF_USE_LINES', (event, code: string, location: Location) => {
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
  });
}
