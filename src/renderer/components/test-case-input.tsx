import { observer } from 'mobx-react';

import { AppState } from '../state';

interface TestCaseInputProps {
  appState: AppState;
}

export const TestCaseInput = observer(({ appState }: TestCaseInputProps) => {
  return <div>Hello</div>;
});
