import { Alert, IconName, Intent, InputGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react';

import { AppState } from '../state';
import { GenericDialogType } from '../../interface';

interface GenericDialogProps {
  appState: AppState;
}

export const GenericDialog = observer(({ appState }: GenericDialogProps) => {
  const { isGenericDialogShowing, genericDialogOptions } = appState;
  const { type, ok, cancel, label, wantsInput, placeholder } =
    genericDialogOptions;

  let intent: Intent;
  let icon: IconName;
  switch (type) {
    case GenericDialogType.warning:
      intent = Intent.DANGER;
      icon = 'warning-sign';
      break;
    case GenericDialogType.confirm:
      intent = Intent.PRIMARY;
      icon = 'help';
      break;
    case GenericDialogType.success:
      intent = Intent.SUCCESS;
      icon = 'info-sign';
      break;
    default:
      intent = Intent.NONE;
      icon = 'help';
      break;
  }

  const onClose = (result: boolean) => {
    const input = document.getElementById('input') as HTMLInputElement;

    appState.setGenericDialogLastInput(
      input && input.value !== '' ? input.value : null,
    );
    appState.setGenericDialogLastResult(result);
    appState.setGenericDialogShowing(false);
  };

  const handleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onClose(true);
    }
  };

  let dialogInput;
  if (wantsInput) {
    dialogInput = placeholder ? (
      <InputGroup
        id="input"
        placeholder={placeholder}
        onKeyDown={handleSubmit}
      />
    ) : (
      <InputGroup id="input" onKeyDown={handleSubmit} />
    );
  }

  return (
    <Alert
      isOpen={isGenericDialogShowing}
      onClose={onClose}
      icon={icon}
      confirmButtonText={ok}
      cancelButtonText={cancel}
      intent={intent}
    >
      <p>{label}</p>
      {wantsInput && dialogInput}
    </Alert>
  );
});
