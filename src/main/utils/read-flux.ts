import * as path from 'node:path';

import * as fs from 'fs-extra';

import { EditorId, EditorValues } from '../../interface';
import { isSupportedFile } from '../../utils/editor-utils';

/**
 * Reads a Fiddle from a directory.
 *
 * @param {string} folder
 * @returns {Promise<EditorValues>} the loaded Fiddle
 */
export async function readFlux(folder: string): Promise<EditorValues> {
  const got: EditorValues = {};

  try {
    // TODO(dsanders11): Remove options once issue fixed:
    // https://github.com/isaacs/node-graceful-fs/issues/223
    const files = await fs.readdir(folder, { encoding: 'utf8' });
    const names = files.filter((f) => {
      return isSupportedFile(f);
    });

    const values = await Promise.allSettled(
      names.map((name) => fs.readFile(path.join(folder, name), 'utf8')),
    );

    for (let i = 0; i < names.length; i += 1) {
      const name = names[i] as EditorId;
      const value = values[i];

      if (value.status === 'fulfilled') {
        got[name] = value.value || '';
      } else {
        console.warn(`Could not read file ${name}:`, value.reason);
        got[name] = '';
      }
    }
  } catch (error) {
    console.warn(`Could not read files from ${folder}:`, error);
  }

  console.log(`Got Fiddle from "${folder}". Found:`, Object.keys(got).sort());
  return got;
}
