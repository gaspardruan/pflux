import { observer } from 'mobx-react';

import { Commands } from './commands';
import { AppState } from '../state';

interface HeaderProps {
  appState: AppState;
}

export const Header = observer(({ appState }: HeaderProps) => {
  const { isHeaderFocusable } = appState;

  return (
    <header
      id="header"
      className={!isHeaderFocusable ? 'tabbing-hidden' : undefined}
    >
      <Commands key="commands" appState={appState} />
    </header>
  );
});
