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
    defUseActive,
    parseSlice,
    clearSlice,
    setupDefUse,
    clearDefUse,
    sliceExtractActive,
    varDepActive,
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

  const handleDefUseClick = () => {
    if (defUseActive) {
      clearDefUse();
    } else {
      setupDefUse();
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

  const handleVarDepClick = () => {
    if (varDepActive) {
      hide(getGridId(WinType.VARDEP, id!));
    } else {
      show(getGridId(WinType.VARDEP, id!));
    }
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
              defUseActive ||
              ((!cursorPosition || !cursorWord || cfgButtonEnabled) &&
                !sliceActive)
            }
            icon="waves"
            text="Slice"
            onClick={handleSliceClick}
          />
          <Button
            disabled={!sliceExtractActive && !sliceActive}
            active={sliceExtractActive}
            icon="drawer-left"
            text="Extract"
            onClick={() => handleExtractClick()}
          />
          <Button
            disabled={!varDepActive && !sliceActive}
            active={varDepActive}
            icon="graph"
            text="VarDep"
            onClick={handleVarDepClick}
          />
        </ButtonGroup>
        <ButtonGroup fill>
          <Button
            active={defUseActive}
            disabled={
              sliceActive ||
              ((!cursorPosition || !cursorWord || cfgButtonEnabled) &&
                !defUseActive)
            }
            icon="flows"
            text="Def-Use"
            onClick={handleDefUseClick}
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
