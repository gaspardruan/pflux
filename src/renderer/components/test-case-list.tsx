import { observer } from 'mobx-react';

import { AppState } from '../state';

interface TestCaseListProps {
  appState: AppState;
}

export const TestCaseList = observer(({ appState }: TestCaseListProps) => {
  return <div>Hello</div>;
});
