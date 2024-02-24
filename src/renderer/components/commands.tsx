import { Button, ButtonGroup, ControlGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react';

import { AppState } from '../state';

interface CommandsProps {
  appState: AppState;
}

export const Commands = observer(({ appState }: CommandsProps) => {
  const { title } = appState;
  // eslint-disable-next-line no-undef
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      window.ElectronFlux.macTitlebarClicked();
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
            icon="waves"
            text="Slice"
            onClick={() => console.log('Slice clicked.')}
          />
          <Button
            icon="two-columns"
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
      <div>
        <ControlGroup fill>
          <Button minimal title="Reset Layout" icon="page-layout" />
          <Button minimal title="Split Column" icon="split-columns" />
        </ControlGroup>
      </div>
    </div>
  );
});