import { Button, Checkbox, FormGroup, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
import { observer } from 'mobx-react';

import {
  LoadedFluxTheme,
  defaultDark,
  defaultLight,
} from '../../themes-defaults';
import { AppState } from '../state';

export const renderItem: ItemRenderer<LoadedFluxTheme> = (
  item,
  { handleClick },
) => {
  return (
    <MenuItem
      text={item.name}
      key={item.name}
      onClick={handleClick}
      icon="media"
    />
  );
};

interface AppearanceSettingsProps {
  appState: AppState;
  toggleHasPopoverOpen: () => void;
}

export const AppearanceSettings = observer(
  ({ appState, toggleHasPopoverOpen }: AppearanceSettingsProps) => {
    const {
      selectedTheme,
      isUsingSystemTheme,
      setTheme,
      setIsUsingSystemTheme,
    } = appState;
    const themes = [defaultDark, defaultLight];
    const selectedName =
      (selectedTheme && selectedTheme.name) || 'Select a theme';

    const handleChangeTheme = (theme: LoadedFluxTheme) => {
      setTheme(theme.file);
    };

    const handleThemeSource = (event: React.FormEvent<HTMLInputElement>) => {
      setIsUsingSystemTheme(event.currentTarget.checked);
    };

    return (
      <div className="settings-appearance">
        <h3>Appearance</h3>
        <Checkbox
          label="Sync theme with system setting"
          checked={isUsingSystemTheme}
          onChange={handleThemeSource}
        />
        <FormGroup
          label="Choose your theme"
          labelFor="open-theme-selector"
          disabled={isUsingSystemTheme}
          inline
        >
          <Select<LoadedFluxTheme>
            filterable
            disabled={isUsingSystemTheme}
            items={themes}
            activeItem={selectedTheme}
            itemRenderer={renderItem}
            onItemSelect={handleChangeTheme}
            popoverProps={{
              onClosed: () => toggleHasPopoverOpen(),
            }}
            noResults={<MenuItem disabled text="No results." />}
          >
            <Button
              id="open-theme-selector"
              text={selectedName}
              icon="tint"
              onClick={() => toggleHasPopoverOpen()}
              disabled={isUsingSystemTheme}
            />
          </Select>
        </FormGroup>
      </div>
    );
  },
);
