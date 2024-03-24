import { observer } from 'mobx-react';
import { AppState } from '../state';

interface ITestCaseProps {
  appState: AppState;
}

export const TestCase = observer(({ appState }: ITestCaseProps) => {
  const { testCaseCollection } = appState.editorMosaic.mainEditor;
  return (
    <div>
      <h3>Function: {testCaseCollection!.focusedFuncSignature || ''} </h3>
    </div>
  );
});
