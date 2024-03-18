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
import { EditorReadOnly } from './editor-read-only';
import { MaximizeButton, RemoveButton } from './editors-toolbar-button';
import { CFGId, EditorId, GridId, SliceId, VarDepId } from '../../interface';
import { AppState } from '../state';
import { getEditorTitle } from '../../utils/editor-utils';
import { getAtPath, setAtPath } from '../../utils/js-path';
import { toggleMonaco } from '../../utils/toggle-monaco';
import { ControlFlow } from './control-flow';
import { VarDep } from './var-dep';
import { MarkTag } from './mark-tag';

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
    id: GridId,
  ): React.JSX.Element => {
    return (
      <div>
        {/* Left */}
        <div className="toolbar-left">
          <h5>{title}</h5>
          <MarkTag appState={appState} />
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
   * Render an editor
   *
   * @param {SliceId} id
   * @returns {(JSX.Element | null)}
   * @memberof Editors
   */

  const renderSliceEditor = (id: SliceId): React.JSX.Element | null => {
    return (
      <EditorReadOnly
        id={id}
        monaco={monaco}
        appState={appState}
        monacoOptions={defaultMonacoOptions}
        setFocused={setFocused}
      />
    );
  };

  const renderControlFlow = (): React.JSX.Element | null => {
    return <ControlFlow appState={appState} />;
  };

  const renderVarDep = (): React.JSX.Element | null => {
    return <VarDep appState={appState} />;
  };

  /**
   * Renders a Mosaic tile
   *
   * @param {GridId} id
   * @param {Array<MosaicBranch>} path
   * @returns {JSX.Element}
   */
  const renderTile = (
    _id: GridId,
    path: Array<MosaicBranch>,
  ): React.JSX.Element => {
    const title = getEditorTitle(_id);
    if (_id.endsWith('.py')) {
      const id = _id as EditorId;
      const content = renderEditor(id);
      return (
        <MosaicWindow<GridId>
          className={id}
          path={path}
          title={title}
          renderToolbar={(props: MosaicWindowProps<GridId>) =>
            renderToolbar(props, id)
          }
        >
          {content}
        </MosaicWindow>
      );
    }
    if (_id.endsWith('__Slice')) {
      const id = _id as SliceId;
      const content = renderSliceEditor(id);
      return (
        <MosaicWindow<GridId>
          path={path}
          title={title}
          renderToolbar={(props: MosaicWindowProps<GridId>) =>
            renderToolbar(props, id)
          }
        >
          {content}
        </MosaicWindow>
      );
    }
    if (_id.endsWith('__CFG')) {
      const id = _id as CFGId;
      const content = renderControlFlow();
      return (
        <MosaicWindow<GridId>
          path={path}
          title={title}
          renderToolbar={(props: MosaicWindowProps<GridId>) =>
            renderToolbar(props, id)
          }
        >
          {content}
        </MosaicWindow>
      );
    }
    if (_id.endsWith('__VarDep')) {
      const id = _id as VarDepId;
      const content = renderVarDep();
      return (
        <MosaicWindow<GridId>
          path={path}
          title={title}
          renderToolbar={(props: MosaicWindowProps<GridId>) =>
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
