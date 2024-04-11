import { observer } from 'mobx-react';
import { Callout, FileInput, FormGroup } from '@blueprintjs/core';

import { AppState } from '../state';

interface PythonSettingsProps {
  appState: AppState;
}

export const PythonSettings = observer(({ appState }: PythonSettingsProps) => {
  const instruction = `Set the path to your Python3 interpreter.`;
  const { setPythonPath, pythonPath } = appState;

  const handleInputChange = (event: React.FormEvent<HTMLInputElement>) => {
    const { files } = event.target as HTMLInputElement;
    if (files!.length > 0 && files![0].path) {
      const { path } = files![0];
      // eslint-disable-next-line promise/catch-or-return
      window.ElectronFlux.isPythonPathValid(path).then((valid) => {
        if (valid) {
          setPythonPath(path);
        } else {
          console.log('Python path is invalid');
          appState.showErrorDialog(
            'The path is invalid or not a Python3 interpreter',
          );
        }
      });
    }
  };

  return (
    <div>
      <h1>Python</h1>
      <Callout>
        <p>{instruction}</p>
        <FormGroup label="Python interpreter path" labelFor="python-path">
          <FileInput
            fill
            id="python-path"
            text={pythonPath}
            buttonText="Browser"
            onInputChange={handleInputChange}
          />
        </FormGroup>
      </Callout>
    </div>
  );
});
