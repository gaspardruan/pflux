import { observer } from 'mobx-react';
import { Mosaic, MosaicNode } from 'react-mosaic-component';

import { Editors } from './editors';
import { Sidebar } from './sidebar';
import { AppState } from '../state';
import { WrapperEditorId } from '../../interface';
import { Inputs } from './inputs';

interface WrapperProps {
  appState: AppState;
}

// TODO: refactor the state;
export const SidebarEditorsWrapper = observer(({ appState }: WrapperProps) => {
  const MOSAIC_ELEMENTS = {
    sidebar: <Sidebar appState={appState} />,
    editors: <Editors appState={appState} />,
    input: <Inputs appState={appState} />,
  };

  const { globalMosaic, setGloablMosaic } = appState;

  const onChange = (rootNode: MosaicNode<WrapperEditorId> | null) => {
    setGloablMosaic(rootNode);
  };

  return (
    <Mosaic<WrapperEditorId>
      renderTile={(id: string) =>
        MOSAIC_ELEMENTS[id as keyof typeof MOSAIC_ELEMENTS]
      }
      resize={{ minimumPaneSizePercentage: 15 }}
      value={globalMosaic}
      onChange={onChange}
    />
  );
});
