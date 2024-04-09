import { observer } from 'mobx-react';

import { GenericDialog } from './dialog-generic';
import { AppState } from '../state';
import { Settings } from './settings';

interface DialogsProps {
  appState: AppState;
}

export const Dialogs = observer(({ appState }: DialogsProps) => {
  const { isGenericDialogShowing, isSettingsShowing } = appState;
  const genericDialog = isGenericDialogShowing ? (
    <GenericDialog appState={appState} />
  ) : null;
  const settings = isSettingsShowing ? (
    <Settings key="settings" appState={appState} />
  ) : null;
  return (
    <div key="dialogs" className="dialogs">
      {genericDialog}
      {settings}
    </div>
  );
});
