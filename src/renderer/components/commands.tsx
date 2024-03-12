import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react';

import { AppState } from '../state';
import { getGridId } from '../../utils/editor-utils';
import { WinType } from '../../interface';

interface CommandsProps {
  appState: AppState;
}

export const Commands = observer(({ appState }: CommandsProps) => {
  const {
    title,
    sliceActive,
    parseSlice,
    clearSlice,
    sliceExtractActive,
    cfgButtonEnabled,
    setupControlFlow,
  } = appState;
  const { cursorPosition, cursorWord, show, hide, disposeSliceEditor } =
    appState.editorMosaic;
  const { id } = appState.editorMosaic.mainEditor;

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      window.ElectronFlux.macTitlebarClicked();
    }
  };

  const handleSliceClick = () => {
    if (sliceActive) {
      clearSlice();
    } else {
      parseSlice();
    }
  };

  const handleExtractClick = () => {
    if (sliceExtractActive) {
      hide(getGridId(WinType.SLICE, id!));
      disposeSliceEditor();
    } else {
      show(getGridId(WinType.SLICE, id!));
    }
  };

  const handleCFGClick = () => {
    setupControlFlow();
  };

  return (
    <div
      className={
        window.ElectronFlux.platform === 'darwin'
          ? 'commands is-mac'
          : 'commands'
      }
      onDoubleClick={handleDoubleClick}
    >
      <div>
        <ButtonGroup fill>
          <Button
            icon="cog"
            title="Setting"
            onClick={() => console.log('Setting clicked.')}
          />
        </ButtonGroup>

        <ButtonGroup fill>
          <Button
            disabled={!cfgButtonEnabled}
            icon="flow-branch"
            text="Control Flow"
            onClick={handleCFGClick}
          />
        </ButtonGroup>

        <ButtonGroup fill>
          <Button
            active={sliceActive}
            disabled={
              (!cursorPosition || !cursorWord || cfgButtonEnabled) &&
              !sliceActive
            }
            icon="waves"
            text="Slice"
            onClick={handleSliceClick}
          />
          <Button
            active={sliceExtractActive}
            icon="drawer-left"
            text="Extract"
            onClick={() => handleExtractClick()}
          />
        </ButtonGroup>
        <ButtonGroup fill>
          <Button
            icon="flows"
            text="Dataflow"
            onClick={() => console.log('Dataflow clicked.')}
          />
          <Button
            icon="two-columns"
            text="Extract"
            onClick={() => console.log('Dataflow Extract clicked.')}
          />
        </ButtonGroup>
      </div>
      {window.ElectronFlux.platform === 'darwin' ? (
        <div className="title">{title}</div>
      ) : undefined}
      <div className="plain-text">
        Line {cursorPosition ? cursorPosition.lineNumber : undefined}, Word:{' '}
        {cursorWord ? cursorWord.word : undefined}
      </div>
    </div>
  );
});
