import { useState } from 'react';
import { Mosaic, MosaicNode } from 'react-mosaic-component';

import { Editors } from './editors';
import { Sidebar } from './sidebar';
import { AppState } from '../state';

interface WrapperProps {
  appState: AppState;
}

export type WrapperId = 'sidebar' | 'editors';

// TODO: refactor the state;
export const SidebarEditorsWrapper = ({ appState }: WrapperProps) => {
  const MOSAIC_ELEMENTS = {
    sidebar: <Sidebar appState={appState} />,
    editors: <Editors appState={appState} />,
  };

  const [mosaic, setMosaic] = useState<MosaicNode<WrapperId> | null>({
    direction: 'row',
    first: 'sidebar',
    second: 'editors',
    splitPercentage: 25,
  });

  const onChange = (rootNode: MosaicNode<WrapperId> | null) => {
    setMosaic(rootNode);
  };

  return (
    <Mosaic<WrapperId>
      renderTile={(id: string) =>
        MOSAIC_ELEMENTS[id as keyof typeof MOSAIC_ELEMENTS]
      }
      resize={{ minimumPaneSizePercentage: 15 }}
      value={mosaic}
      onChange={onChange}
    />
  );
};
