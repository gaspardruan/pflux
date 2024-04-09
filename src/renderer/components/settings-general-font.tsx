import { observer } from 'mobx-react';

import { AppState } from '../state';

interface FontSettingsProps {
  appState: AppState;
}

export const FontSettings = observer(({ appState }: FontSettingsProps) => {
  return <div>jfk</div>;
});
