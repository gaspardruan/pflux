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
    setPythonPath(event.currentTarget.value);
  };

  return (
    <div>
      <h1>Python</h1>
      <Callout>
        <p>{instruction}</p>
        <FormGroup label="Python interpreter Path" labelFor="python-path">
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
