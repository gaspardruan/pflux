import { observer } from 'mobx-react';
import classNames from 'classnames';

import { Commands } from './commands';
import { AppState } from '../state';

interface HeaderProps {
  appState: AppState;
}

export const Header = observer(({ appState }: HeaderProps) => {
  const { isSettingsShowing } = appState;
  return (
    <header
      id="header"
      className={classNames({ 'tabbing-hidden': isSettingsShowing })}
    >
      <Commands key="commands" appState={appState} />
    </header>
  );
});
