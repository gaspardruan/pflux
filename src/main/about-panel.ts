import * as path from 'node:path';

import { app } from 'electron';

/**
 * Sets Fiddle's About panel options on Linux and macOS
 *
 * @returns
 */
export default function setupAboutPanel(): void {
  const iconPath = path.resolve(__dirname, '../assets/icons/fiddle.png');

  app.setAboutPanelOptions({
    applicationName: 'Electron Flux',
    applicationVersion: app.getVersion(),
    authors: ['Zhongqiu Ruan'],
    copyright: '© Zhongqiu Ruan',
    credits: 'https://github.com/gaspardruan',
    iconPath,
    version: process.versions.electron,
    website: 'https://github.com/gaspardruan/flux',
  });
}
