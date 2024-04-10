import * as MonacoType from 'monaco-editor';
import {
  Button,
  Callout,
  FormGroup,
  MenuItem,
  NumericInput,
} from '@blueprintjs/core';
import { ItemPredicate, ItemRenderer, Select } from '@blueprintjs/select';
import { observer } from 'mobx-react';

import { AppState } from '../state';

const filterFont: ItemPredicate<string> = (query, font) => {
  return font.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

const renderItem: ItemRenderer<string> = (font, { handleClick, modifiers }) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <MenuItem
      active={modifiers.active}
      disabled={modifiers.disabled}
      key={font}
      onClick={handleClick}
      text={font}
    />
  );
};

interface FontSettingsProps {
  appState: AppState;
}

export const FontSettings = observer(({ appState }: FontSettingsProps) => {
  const { setFontFamily, setFontSize, fontFamily, fontSize, fontFamilyList } =
    appState;
  const fontSettingsInstructions =
    'Set a font family and size for your editors.';
  const getDefaultFontFamily = () => {
    const nameStr = appState.editorMosaic.mainEditor!.editor!.getOption(
      MonacoType.editor.EditorOption.fontFamily,
    );
    const names = nameStr
      .split(',')
      .map((name) => {
        return name.replace(/['"]/g, '').trim();
      })
      .filter((name) => fontFamilyList.includes(name));
    return names[0] || 'Select ...';
  };
  const getDefaultFontSize = () => {
    return appState.editorMosaic.mainEditor!.editor!.getOption(
      MonacoType.editor.EditorOption.fontSize,
    );
  };

  const handleSetFontFamily = (newFontFamily: string) => {
    setFontFamily(newFontFamily);
    appState.editorMosaic.mainEditor!.editor?.updateOptions({
      fontFamily: newFontFamily,
    });
  };

  const handleSetFontSize = (value: number) => {
    const newFontSize = Number.isNaN(value) ? undefined : value;
    setFontSize(newFontSize);
    appState.editorMosaic.mainEditor!.editor?.updateOptions({
      fontSize: newFontSize,
    });
  };

  const handleReset = () => {
    appState.editorMosaic.mainEditor!.editor?.updateOptions({
      fontFamily: undefined,
      fontSize: undefined,
    });
    setFontFamily(getDefaultFontFamily());
    setFontSize(getDefaultFontSize());
    console.log(fontFamily, fontSize);
  };

  return (
    <div>
      <h1>Font Settings</h1>
      <Callout>
        <p>{fontSettingsInstructions}</p>
        <FormGroup label="Font Family" labelFor="font-family">
          <Select<string>
            items={fontFamilyList}
            activeItem={fontFamily}
            itemRenderer={renderItem}
            itemPredicate={filterFont}
            onItemSelect={handleSetFontFamily}
            noResults={<MenuItem disabled text="No results." />}
          >
            <Button
              id="font-family"
              text={fontFamily || getDefaultFontFamily()}
              rightIcon="double-caret-vertical"
            />
          </Select>
        </FormGroup>
        <FormGroup label="Font Size" labelFor="font-size">
          <NumericInput
            min={8}
            max={50}
            id="font-size"
            value={fontSize || getDefaultFontSize()}
            onValueChange={handleSetFontSize}
            className="font-size-input"
          />
        </FormGroup>
        <Button onClick={handleReset} icon="reset" text="Reset to Default" />
      </Callout>
    </div>
  );
});
