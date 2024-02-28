import classNames from 'classnames';
import { observer } from 'mobx-react';
import {
  Button,
  ButtonGroup,
  Classes,
  ContextMenu,
  Icon,
  Menu,
  MenuItem,
  Tree,
  TreeNodeInfo,
  Tooltip,
} from '@blueprintjs/core';

import { AppState } from '../state';
import { EditorId } from '../../interface';

interface FileTreeProps {
  appState: AppState;
}

export const SidebarFileTree = observer(({ appState }: FileTreeProps) => {
  const { fileTreeState, editorMosaic } = appState;
  const { isEditeds, mainEditor } = editorMosaic;

  const handleFileClick = (fileId: EditorId) => {
    editorMosaic.replaceFile(fileId);
  };

  const handleDeleteFile = (fileId: EditorId) => {
    editorMosaic.remove(fileId);
  };

  const addNewFile = (fileId: EditorId) => {
    try {
      editorMosaic.addNewFile(fileId);
      editorMosaic.replaceFile(fileId);
    } catch (err) {
      if (err instanceof Error) {
        appState.showErrorDialog(err.message);
      }
    }
  };

  const resetLayout = () => {
    editorMosaic.resetLayout();
  };

  const fileList: TreeNodeInfo[] = Array.from(isEditeds)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fileId, isEdited], index) => {
      const unsavedIcon = isEdited ? 'symbol-circle' : null;
      return {
        isSelected: mainEditor.id === fileId,
        id: index,
        hasCaret: false,
        icon: 'document',
        label: (
          <ContextMenu
            className="pointer"
            onClick={() => handleFileClick(fileId)}
            content={
              <Menu>
                <MenuItem
                  icon="redo"
                  text="Rename"
                  intent="primary"
                  onClick={() => console.log('Rename Clicked')}
                />
                <MenuItem
                  disabled={isEditeds.size === 1}
                  icon="remove"
                  text="Delete"
                  intent="danger"
                  onClick={() => handleDeleteFile(fileId)}
                />
              </Menu>
            }
          >
            {String(fileId)}
          </ContextMenu>
        ),
        secondaryLabel: unsavedIcon ? (
          <Tooltip content="Unsaved changes" minimal hoverOpenDelay={1000}>
            <Icon icon={unsavedIcon} />
          </Tooltip>
        ) : null,
      };
    });

  if (fileTreeState === 'add') {
    fileList.push({
      id: 'add',
      className: 'add-file-input',
      icon: 'document',
      hasCaret: false,
      label: (
        <input
          id="new-file-input"
          className={classNames(Classes.INPUT, Classes.FILL, Classes.SMALL)}
          style={{ width: `100%`, padding: 0 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            } else if (e.key === 'Enter') {
              addNewFile(e.currentTarget.value as EditorId);
              e.currentTarget.blur();
            }
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onBlur={() => {
            appState.setFileTreeState('default');
          }}
        />
      ),
    });
  }

  const editorTree: TreeNodeInfo[] = [
    {
      childNodes: fileList,
      id: 'files',
      hasCaret: false,
      icon: 'folder-open',
      isExpanded: true,
      label: appState.folderName || 'Files',
      secondaryLabel: (
        <ButtonGroup minimal>
          <Tooltip content="Add New File" minimal hoverOpenDelay={1000}>
            <Button
              small
              icon="add"
              onClick={() => appState.setFileTreeState('add')}
            />
          </Tooltip>
          <Tooltip content="Reset Layout" minimal hoverOpenDelay={1000}>
            <Button small icon="add-column-right" onClick={resetLayout} />
          </Tooltip>
        </ButtonGroup>
      ),
    },
  ];

  return (
    <div className="file-tree flux-scrollbar">
      <Tree contents={editorTree} />
    </div>
  );
});
