import { Mosaic } from 'react-mosaic-component';

import { SidebarFileTree } from './sidebar-file-tree';
import { SidebarParser } from './sidebar-parser';
import { AppState } from '../state';

export const Sidebar = ({ appState }: { appState: AppState }) => {
  const ELEMENT_MAP = {
    fileTree: <SidebarFileTree appState={appState} />,
    parser: <SidebarParser appState={appState} />,
  };
  return (
    <Mosaic<string>
      renderTile={(id) => ELEMENT_MAP[id as keyof typeof ELEMENT_MAP]}
      initialValue={{
        first: 'fileTree',
        second: 'parser',
        direction: 'column',
        splitPercentage: 50,
      }}
    />
  );
};
