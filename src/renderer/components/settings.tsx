import { IconName, MenuItem, Icon, Button } from '@blueprintjs/core';
import { useState, useEffect } from 'react';
import { observer } from 'mobx-react';

import { AppState } from '../state';
import { GeneralSettings } from './settings-general';

enum SettingsSections {
  General = 'General',
}

const settingsSections = [SettingsSections.General];

interface SettingsProps {
  appState: AppState;
}

export const Settings = observer(({ appState }: SettingsProps) => {
  const { isSettingsShowing, setIsSettingsShowing } = appState;
  const [section, setSection] = useState<SettingsSections>(
    SettingsSections.General,
  );
  const [hasPopoverOpen, setHasPopoverOpen] = useState(false);

  useEffect(() => {
    const closeSettingPanel = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !hasPopoverOpen) {
        setIsSettingsShowing(false);
      }
    };

    const disableContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener('keyup', closeSettingPanel, true);
    window.addEventListener('contextmenu', disableContextMenu, true);

    return () => {
      window.removeEventListener('keyup', closeSettingPanel, true);
      window.removeEventListener('contextmenu', disableContextMenu, true);
    };
  });

  const toggleHasPopoverOpen = () => {
    setHasPopoverOpen(!hasPopoverOpen);
  };

  const renderContent = () => {
    if (section === SettingsSections.General) {
      return (
        <GeneralSettings
          appState={appState}
          toggleHasPopoverOpen={() => toggleHasPopoverOpen()}
        />
      );
    }
    return null;
  };

  const getIconForSection = (name: SettingsSections): IconName => {
    switch (name) {
      case SettingsSections.General:
        return 'cog';
      default:
        return 'cog';
    }
  };

  const renderOptions = () => {
    return settingsSections.map((name) => {
      const isSelected = section === name;
      const onClick = () => setSection(name);

      return (
        <MenuItem
          onClick={onClick}
          active={isSelected}
          key={name}
          id={`settings-link-${name}`}
          text={name}
          icon={getIconForSection(name)}
        />
      );
    });
  };

  return (
    isSettingsShowing && (
      <div className="settings">
        <div className="settings-menu">
          <ul>{renderOptions()}</ul>
        </div>
        <div className="settings-content">
          <Button
            minimal
            className="settings-close"
            onClick={appState.toggleSettings}
            icon={<Icon icon="cross" size={25} />}
          />
          {renderContent()}
        </div>
      </div>
    )
  );
});
