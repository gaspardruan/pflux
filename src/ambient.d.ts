import * as MonacoType from 'monaco-editor';
import { App } from './renderer/app';
import { ElectronHandler } from './main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    app: App;
    monaco: typeof MonacoType;
    ElectronFlux: ElectronHandler;
  }
}

export {};
