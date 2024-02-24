import { observer } from 'mobx-react';

import { GenericDialog } from './dialog-generic';
import { AppState } from '../state';

interface DialogsProps {
  appState: AppState;
}

export const Dialogs = observer(({ appState }: DialogsProps) => {
  const { isGenericDialogShowing } = appState;
  const genericDialog = isGenericDialogShowing ? (
    <GenericDialog appState={appState} />
  ) : null;
  return (
    <div key="dialogs" className="dialogs">
      {genericDialog}
    </div>
  );
});
