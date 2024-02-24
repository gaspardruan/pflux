import * as monaco from 'monaco-editor';

import { App } from './app';

window.monaco = monaco;
window.app = new App();
window.app.setup();
