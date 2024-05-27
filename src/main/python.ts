import { ipcMain } from 'electron';
import util from 'util';
import { IpcEvents } from '../ipc-events';

const exec = util.promisify(require('child_process').exec);

export function setupPythonListener() {
  ipcMain.handle(IpcEvents.GET_PYTHON_PATH, async () => {
    let r = await exec('which python');
    let stdout = (r.stdout as string).trim();
    if (!r.stderr && stdout.length > 0 && (await checkIsPython3(stdout))) {
      return stdout;
    }

    r = await exec('which python3');
    stdout = (r.stdout as string).trim();
    if (!r.stderr && stdout.length > 0 && (await checkIsPython3(r.stdout))) {
      return stdout;
    }

    r = await exec('where python');
    stdout = (r.stdout as string).trim();
    if (!r.stderr && stdout.length > 0 && (await checkIsPython3(r.stdout))) {
      return stdout;
    }

    r = await exec('where python3');
    stdout = (r.stdout as string).trim();
    if (!r.stderr && stdout.length > 0 && (await checkIsPython3(r.stdout))) {
      return stdout;
    }

    return '';
  });

  ipcMain.handle(IpcEvents.CHECK_PYTHON_PATH, async (_event, _path: string) => {
    if (_path.length > 0 && (await checkIsPython3(_path))) {
      return true;
    }
    return false;
  });
}

export async function checkIsPython3(path: string) {
  try {
    const r = await exec(`${path} --version`);
    return r.stdout.includes('Python 3');
  } catch (e) {
    return false;
  }
}
