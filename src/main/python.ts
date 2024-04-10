import { ipcMain } from 'electron';
import util from 'util';
import { IpcEvents } from '../ipc-events';

const exec = util.promisify(require('child_process').exec);

export function setupPythonListener() {
  ipcMain.handle(IpcEvents.GET_PYTHON_PATH, async () => {
    console.log('here');
    let r = await exec('which python');
    let stdout = (r.stdout as string).trim();
    if (!r.stderr && stdout.length > 0 && (await checkIsPython3(stdout))) {
      return r.stdout;
    }

    r = await exec('which python3');
    stdout = (r.stdout as string).trim();
    if (!r.stderr && stdout.length > 0 && (await checkIsPython3(r.stdout))) {
      return r.stdout;
    }

    return '';
  });
}

export async function checkIsPython3(path: string) {
  const r = await exec(`${path} --version`);
  return r.stdout.includes('Python 3');
}
