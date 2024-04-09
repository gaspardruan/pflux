import { observer } from 'mobx-react';
import { Mosaic } from 'react-mosaic-component';

import { Editors } from './editors';
import { Sidebar } from './sidebar';
import { AppState } from '../state';
import { WrapperEditorId } from '../../interface';

interface WrapperProps {
  appState: AppState;
}

// TODO: refactor the state;
export const SidebarEditorsWrapper = observer(({ appState }: WrapperProps) => {
  const { isSettingsShowing } = appState;
  const MOSAIC_ELEMENTS = {
    sidebar: <Sidebar appState={appState} />,
    editors: <Editors appState={appState} />,
  };

  return (
    <Mosaic<WrapperEditorId>
      renderTile={(id: string) =>
        MOSAIC_ELEMENTS[id as keyof typeof MOSAIC_ELEMENTS]
      }
      resize={{ minimumPaneSizePercentage: 15 }}
      initialValue={{
        direction: 'row',
        first: 'sidebar',
        second: 'editors',
        splitPercentage: 25,
      }}
      className={isSettingsShowing ? 'tabbing-hidden' : undefined}
    />
  );
});
