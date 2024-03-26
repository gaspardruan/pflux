import os from 'os';
import path from 'path';
import fs from 'fs';
import util from 'util';

import { ipcMain } from 'electron';
import { IpcEvents } from '../../ipc-events';
import { cyrb53 } from '../utils/hash';

const START_LINE = 2;
const TEMP_DIR = os.tmpdir();

const exec = util.promisify(require('child_process').exec);

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
      console.log(testCaseExecs);
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

      const dataFlows = result.map((r) => extractLineNumber(r.stdout, line));

      return dataFlows;
    },
  );
}
