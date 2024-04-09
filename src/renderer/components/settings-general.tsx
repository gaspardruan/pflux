import { observer } from 'mobx-react';
import { Divider } from '@blueprintjs/core';

import { AppState } from '../state';
import { AppearanceSettings } from './settings-general-appearance';
import { FontSettings } from './settings-general-font';

interface GeneralSettingsProps {
  appState: AppState;
  toggleHasPopoverOpen: () => void;
}

export const GeneralSettings = observer(
  ({ appState, toggleHasPopoverOpen }: GeneralSettingsProps) => {
    return (
      <div>
        <h1>General Settings</h1>
        <AppearanceSettings
          appState={appState}
          toggleHasPopoverOpen={() => toggleHasPopoverOpen()}
        />
        <Divider />
        <FontSettings appState={appState} />
      </div>
    );
  },
);
