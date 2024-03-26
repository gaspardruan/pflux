import { ipcMain } from 'electron';
import { IpcEvents } from '../../ipc-events';

export function setupAnalyzeCoverage() {
  ipcMain.handle(
    IpcEvents.COVERAGE_STANDARD,
    (
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
    },
  );
}
