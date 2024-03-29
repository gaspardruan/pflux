import os from 'os';
import path from 'path';
import fs from 'fs';
import util from 'util';

import {
  ControlFlowGraph,
  DEF,
  DataflowAnalyzer,
  Def,
  MODULE,
  Module,
  parse,
  walk,
  Set as SSet,
  CALL,
  ASSIGN,
} from '@msrvida/python-program-analysis';

import { ipcMain } from 'electron';
import { IpcEvents } from '../../ipc-events';
import { cyrb53 } from '../utils/hash';
import { fixFunction } from './def-use-lines';
import {
  DataflowRecord,
  DataflowGroupOnlyUse,
  CoverageStandard,
  CoverageResult,
} from '../../interface';

const START_LINE = 2;
const TEMP_DIR = os.tmpdir();

const exec = util.promisify(require('child_process').exec);

export interface DataflowGroup {
  pUses: DataFlowRecordSet;
  cUses: DataFlowRecordSet;
  defLines: Set<number>;
}

export class DataFlowRecordSet extends SSet<DataflowRecord> {
  constructor(...items: DataflowRecord[]) {
    super((d) => `${d.startLine}-${d.endLine}`, ...items);
  }
}

export function getPythonScript(funcDef: string, command: string) {
  // 根据当前时间产生唯一文件名
  const name = `__pflux__coverage__script__${cyrb53(
    command,
  )}__${Date.now()}.py`;
  const script = `import trace
${funcDef}
tracer = trace.Trace(count=0, trace=1)
tracer.run('${command}')`;
  return [name, script];
}

export function extractLineNumber(output: string, startLine: number) {
  const bias = startLine - START_LINE;
  const regex = /__pflux__coverage__script__\d{16}__\d{13}.py\((\d+)\):/g;
  const lineNumbers = [startLine];
  let match = regex.exec(output);
  while (match !== null) {
    lineNumbers.push(parseInt(match[1], 10) + bias);
    match = regex.exec(output);
  }
  return lineNumbers;
}

export function findFunctionAtLine(code: string, line: number): Module {
  const funcs: Def[] = [];
  const ast = parse(code);
  walk(ast, {
    onEnterNode: (node) => {
      if (node.type === DEF && node.location!.first_line === line) {
        funcs.push(node);
      }
    },
  });
  if (funcs.length !== 1)
    throw new Error('more than one or no function at the same line');

  const func = funcs[0];
  fixFunction(func);
  return {
    type: MODULE,
    code: func.code,
    location: func.location,
  };
}

export function getDataflowAggregation(
  code: string,
  line: number,
): Map<string, DataflowGroup> {
  const module = findFunctionAtLine(code, line);
  const cfg = new ControlFlowGraph(module);
  const dataflowAnalyzer = new DataflowAnalyzer();
  const dfa = dataflowAnalyzer.analyze(cfg).dataflows;

  const dataflows = new Map<string, DataflowGroup>();
  dfa.items.forEach((flow) => {
    if (flow.fromRef && flow.toRef) {
      const { name } = flow.fromRef;
      if (!dataflows.has(name)) {
        dataflows.set(name, {
          pUses: new DataFlowRecordSet(),
          cUses: new DataFlowRecordSet(),
          defLines: new Set<number>(),
        });
      }
      const group = dataflows.get(name)!;
      group.defLines.add(flow.fromRef.location.first_line);
      const record = {
        startLine: flow.fromRef.location.first_line,
        endLine: flow.toRef.location.first_line,
        covered: false,
      };
      if (flow.toRef.node.type === CALL || flow.toRef.node.type === ASSIGN) {
        group.cUses.add(record);
      } else {
        group.pUses.add(record);
      }
    }
  });
  return dataflows;
}

export function slicePath(_path: number[], _defLines: Set<number>) {
  const pathCopy = _path.slice();
  const res: number[][] = [];
  let count = 1;

  for (let i = 1; i < pathCopy.length; i += 1) {
    const num = pathCopy[i];
    count += 1;
    if (_defLines.has(num)) {
      const slice = pathCopy.splice(0, count - 1);
      slice.push(num);
      res.push(slice);
      i = i + 1 - count;
      count = 1;
    }
  }
  if (pathCopy.length > 1) {
    res.push(pathCopy);
  }

  return res;
}

export function pathCoverDataflow(_path: number[], _flow: DataflowRecord) {
  let startMatched = false;
  for (let i = 0; i < _path.length; i += 1) {
    if (startMatched && _path[i] === _flow.endLine) {
      _flow.covered = true;
      break;
    }
    if (_path[i] === _flow.startLine) startMatched = true;
  }
  return _flow.covered;
}

export function pathsCoverDataflow(_paths: number[][], _flow: DataflowRecord) {
  if (_flow.covered) return true;
  for (let i = 0; i < _paths.length; i += 1) {
    if (pathCoverDataflow(_paths[i], _flow)) break;
  }
  return _flow.covered;
}

export function analyzeCoverageStandard(
  dataflowGroups: Map<string, DataflowGroup>,
): CoverageStandard {
  const allDefFlag = new Map<string, boolean>();
  const allPUseFlag = new Map<string, boolean>();
  const allCUseFlag = new Map<string, boolean>();
  dataflowGroups.forEach((group, varName) => {
    let allCUse = true;
    const coverdDefSet = new Set<number>();
    group.cUses.items.forEach((cUse) => {
      if (cUse.covered) {
        coverdDefSet.add(cUse.startLine);
      } else {
        allCUse = false;
      }
    });
    let allPUse = true;
    group.pUses.items.forEach((pUse) => {
      if (pUse.covered) {
        coverdDefSet.add(pUse.startLine);
      } else {
        allPUse = false;
      }
    });
    allDefFlag.set(varName, coverdDefSet.size === group.defLines.size);
    allPUseFlag.set(varName, allPUse);
    allCUseFlag.set(varName, allCUse);
  });
  const allDef = Array.from(allDefFlag.values()).every((v) => v);
  const allPUse = Array.from(allPUseFlag.values()).every((v) => v);
  const allCUse = Array.from(allCUseFlag.values()).every((v) => v);

  const allCUseSomePUse = allCUse && allDef;
  const allPUseSomeCUse = allPUse && allDef;
  const allUse = allCUseSomePUse && allPUseSomeCUse;

  return {
    allDef,
    allCUse,
    allPUse,
    allCUseSomePUse,
    allPUseSomeCUse,
    allUse,
  };
}

export function standard2Mermaid(standard: CoverageStandard) {
  let mermaid = `block-beta
  columns 6
  allUse["All Uses"]:6
  allCUseSomePUse["All C-Uses\nsome P-Uses"]:3
  allPUseSomeCUse["All P-Uses\nsome C-Uses"]:3
  allCUse["All C-Uses"]:2
  allDef["All Defs"]:2
  allPUse["All P-Uses"]:2`;

  const cls = Object.entries(standard)
    .map(([key, value]) => {
      return value ? key : '';
    })
    .filter((v) => v)
    .join(',');
  mermaid += `
  class ${cls} active
  classDef active fill:`;

  return mermaid;
}

export async function getExecPaths(
  line: number,
  funcDef: string,
  testCaseExecs: string[],
): Promise<number[][]> {
  const tempScriptPaths: string[] = [];
  testCaseExecs.forEach((testCaseExec) => {
    const [scriptName, script] = getPythonScript(funcDef, testCaseExec);
    const scriptPath = path.join(TEMP_DIR, scriptName);
    tempScriptPaths.push(scriptPath);
    fs.writeFile(scriptPath, script, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

  const result = await Promise.all(
    tempScriptPaths.map((p) => exec(`python -u ${p}`)),
  );

  // delete files asynchronously
  tempScriptPaths.forEach((p) => {
    fs.unlink(p, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

  return result.map((r) => extractLineNumber(r.stdout, line));
}

export async function analyzeCoverage(
  code: string,
  line: number,
  funcDef: string,
  testCaseExecs: string[],
): Promise<CoverageResult> {
  const execPaths = await getExecPaths(line, funcDef, testCaseExecs);
  const dataflowGroups = getDataflowAggregation(code, line);

  execPaths.forEach((execPath) => {
    dataflowGroups.forEach((group) => {
      const dcPath = slicePath(execPath, group.defLines);
      group.pUses.items.forEach((pUse) => {
        pathsCoverDataflow(dcPath, pUse);
      });
      group.cUses.items.forEach((cUse) => {
        pathsCoverDataflow(dcPath, cUse);
      });
    });
  });

  const dataflowGroupsOnlyUse = new Map<string, DataflowGroupOnlyUse>();
  dataflowGroups.forEach((group, key) => {
    dataflowGroupsOnlyUse.set(key, {
      pUses: [...group.pUses.items],
      cUses: [...group.cUses.items],
    });
  });

  const standard = analyzeCoverageStandard(dataflowGroups);

  return {
    standard,
    standard2Mermaid: standard2Mermaid(standard),
    execPaths,
    detail: dataflowGroupsOnlyUse,
  };
}

export function setupAnalyzeCoverage() {
  ipcMain.handle(
    IpcEvents.COVERAGE_STANDARD,
    async (
      _event,
      code: string,
      line: number,
      funcDef: string,
      testCaseExecs: string[],
    ) => {
      try {
        return await analyzeCoverage(code, line, funcDef, testCaseExecs);
      } catch (e) {
        console.error(e);
        return {
          standard: {
            allDef: false,
            allCUse: false,
            allPUse: false,
            allCUseSomePuse: false,
            allPUseSomeCUse: false,
            allUse: false,
          },
          standard2Mermaid: '',
          execPaths: [],
          detail: new Map<string, DataflowGroupOnlyUse>(),
        };
      }
    },
  );
}
