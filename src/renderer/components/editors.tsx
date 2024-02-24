import { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import * as MonacoType from 'monaco-editor';
import {
  Mosaic,
  MosaicBranch,
  MosaicNode,
  MosaicWindow,
  MosaicWindowProps,
} from 'react-mosaic-component';

import { Editor } from './editor';
import { MaximizeButton, RemoveButton } from './editors-toolbar-button';
import { EditorId, GridId } from '../../interface';
import { AppState } from '../state';
import { getEditorTitle } from '../utils/editor-utils';
import { getAtPath, setAtPath } from '../utils/js-path';
import { toggleMonaco } from '../utils/toggle-monaco';

const defaultMonacoOptions: MonacoType.editor.IEditorOptions = {
  minimap: {
    enabled: false,
  },
  wordWrap: 'on',
};

interface EditorsProps {
  appState: AppState;
}

// TODO: refactor the state. Maybe it is unnecessary.
export const Editors = observer(({ appState }: EditorsProps) => {
  const [monaco] = useState(window.monaco);
  const [focusedId, setFocusedId] = useState<GridId | null>(null);
  const [monacoOptions, setMonacoOptions] = useState(defaultMonacoOptions);

  const stopListening = () => {
    window.ElectronFlux.removeAllListeners('execute-monaco-command');
    window.ElectronFlux.removeAllListeners('toggle-monaco-option');
    window.ElectronFlux.removeAllListeners('select-all-in-editor');
    window.ElectronFlux.removeAllListeners('undo-in-editor');
    window.ElectronFlux.removeAllListeners('redo-in-editor');
  };

  useEffect(() => {
    /**
     * Attempt to execute a given commandId on the currently focused editor
     *
     * @param {string} commandId
     * @memberof Editors
     */
    const executeCommand = (commandId: string) => {
      const { editor } = appState.editorMosaic.mainEditor;

      if (editor) {
        const command = editor.getAction(commandId);

        if (!command) return;

        console.log(
          `Editors: Trying to run ${
            command.id
          }. Supported: ${command.isSupported()}`,
        );

        if (command.isSupported()) {
          command.run();
        }
      }
    };

    const toggleEditorOption = (path: string): boolean => {
      try {
        const newOptions = { ...monacoOptions };
        const currentSetting = getAtPath(path, newOptions);

        setAtPath(path, newOptions, toggleMonaco(currentSetting));
        appState.editorMosaic.updateOptions(newOptions);
        setMonacoOptions(newOptions);

        return true;
      } catch (error) {
        console.warn(`Editors: Could not toggle property ${path}`, error);

        return false;
      }
    };

    stopListening();
    window.ElectronFlux.addEventListener(
      'execute-monaco-command',
      (cmd: string) => {
        executeCommand(cmd);
      },
    );

    window.ElectronFlux.addEventListener(
      'toggle-monaco-option',
      (cmd: string) => {
        toggleEditorOption(cmd);
      },
    );

    window.ElectronFlux.addEventListener('select-all-in-editor', () => {
      const { editor } = appState.editorMosaic.mainEditor;
      if (editor) {
        const model = editor.getModel();
        if (model) {
          editor.setSelection(model.getFullModelRange());
        }
      }
    });

    window.ElectronFlux.addEventListener('undo-in-editor', () => {
      const { editor } = appState.editorMosaic.mainEditor;
      if (editor) {
        const model = editor.getModel();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (model) (model as any).undo();
      }
    });

    window.ElectronFlux.addEventListener('redo-in-editor', () => {
      const { editor } = appState.editorMosaic.mainEditor;
      if (editor) {
        const model = editor.getModel();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (model) (model as any).redo();
      }
    });

    return stopListening;
  }, [appState.editorMosaic, monacoOptions]);

  const setFocused = (id: GridId) => {
    appState.editorMosaic.setFocusedGridId(id);
    setFocusedId(id);
  };

  /**
   * Renders the little tool bar on top of each panel
   *
   * @param {MosaicWindowProps<GridId>} { title }
   * @param {EditorId} id
   * @returns {JSX.Element}
   */
  const renderToolbar = (
    { title }: MosaicWindowProps<GridId>,
    id: EditorId,
    // eslint-disable-next-line no-undef
  ): React.JSX.Element => {
    return (
      <div>
        {/* Left */}
        <div>
          <h5>{title}</h5>
        </div>
        {/* Middle */}
        <div />
        {/* Right */}
        <div className="mosaic-controls">
          <MaximizeButton id={id} appState={appState} />
          <RemoveButton id={id} appState={appState} />
        </div>
      </div>
    );
  };

  /**
   * Render an editor
   *
   * @param {EditorId} id
   * @returns {(JSX.Element | null)}
   * @memberof Editors
   */
  // eslint-disable-next-line no-undef
  const renderEditor = (id: EditorId): React.JSX.Element | null => {
    return (
      <Editor
        id={id}
        monaco={monaco}
        appState={appState}
        monacoOptions={defaultMonacoOptions}
        setFocused={setFocused}
      />
    );
  };

  /**
   * Renders a Mosaic tile
   *
   * @param {GridId} id
   * @param {Array<MosaicBranch>} path
   * @returns {JSX.Element}
   */
  const renderTile = (
    id: GridId,
    path: Array<MosaicBranch>,
    // eslint-disable-next-line no-undef
  ): React.JSX.Element => {
    const title = getEditorTitle(id);
    if (id.endsWith('.py')) {
      const content = renderEditor(id);
      return (
        <MosaicWindow<EditorId>
          className={id}
          path={path}
          title={title}
          renderToolbar={(props: MosaicWindowProps<EditorId>) =>
            renderToolbar(props, id)
          }
        >
          {content}
        </MosaicWindow>
      );
    }
    return <div>On the way...</div>;
  };

  const onChange = (currentNode: MosaicNode<GridId> | null) => {
    appState.editorMosaic.updateMosaic(currentNode);
  };

  return (
    <Mosaic<GridId>
      className={`focused__${focusedId}`}
      onChange={onChange}
      value={appState.editorMosaic.mainEditor.mosaic}
      renderTile={renderTile}
    />
  );
});
