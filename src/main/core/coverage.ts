import os from 'os';
import path from 'path';
import fs from 'fs';
import util from 'util';

import { ipcMain } from 'electron';
import { IpcEvents } from '../../ipc-events';

const exec = util.promisify(require('child_process').exec);

export function createPythonScript() {
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, '__pflux__coverage__script__.py');
  fs.writeFileSync(scriptPath, `print('Hello, World!')`);
  return scriptPath;
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
      console.log('Analyze coverage');
      console.log('Code:', code);
      console.log('Line:', line);
      console.log('Function definition:', funcDef);
      console.log('Test case executions:', testCaseExecs);
      const scriptPath = createPythonScript();
      const result = await Promise.all([
        exec(`python -u ${scriptPath}`),
        exec(`python -u ${scriptPath}`),
      ]);
      return result;
    },
  );
}
