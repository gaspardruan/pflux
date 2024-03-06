import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react';

import { AppState } from '../state';

interface CommandsProps {
  appState: AppState;
}

export const Commands = observer(({ appState }: CommandsProps) => {
  const { title, sliceActive, parseSlice, clearSlice } = appState;
  const { cursorPosition, cursorWord } = appState.editorMosaic;
  // eslint-disable-next-line no-undef
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
    // else appState.showErrorDialog('Please select a variable to slice.');
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
            active={sliceActive}
            disabled={(!cursorPosition || !cursorWord) && !sliceActive}
            icon="waves"
            text="Slice"
            onClick={handleSliceClick}
          />
          <Button
            icon="drawer-left"
            text="Extract"
            onClick={() => console.log('Slice Extract clicked.')}
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
