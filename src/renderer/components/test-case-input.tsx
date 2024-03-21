import { observer } from 'mobx-react';
import { AppState } from '../state';

interface TestCaseInputProps {
  appState: AppState;
}

export const TestCaseInput = observer(({ appState }: TestCaseInputProps) => {
  const { isInputShowing } = appState;

  return (
    <div
      style={{
        display: isInputShowing ? 'inline-block' : 'none',
      }}
    >
      Hello
    </div>
  );
});
