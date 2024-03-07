import { memo, useEffect, useRef } from 'react';
import * as MonacoType from 'monaco-editor';

import { SliceId, GridId } from '../../interface';
import { AppState } from '../state';

interface EditorProps {
  readonly appState: AppState;
  readonly id: SliceId;
  readonly monaco: typeof MonacoType;
  monacoOptions: MonacoType.editor.IEditorOptions;
  // eslint-disable-next-line react/require-default-props
  editorDidMount?: (editor: MonacoType.editor.IStandaloneCodeEditor) => void;
  setFocused: (id: GridId) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const areEqual = (_prevProps: EditorProps, _nextProps: EditorProps) => {
  return true;
};

export const EditorReadOnly = memo(
  ({
    appState,
    id,
    monaco,
    monacoOptions,
    editorDidMount,
    setFocused,
  }: EditorProps) => {
    const language = 'python';

    const containerRef = useRef<HTMLDivElement>(null);

    const openerService = () => {
      return {
        open: (url: string) => {
          appState
            .showConfirmDialog({
              label: `Open ${url} in external browser?`,
              ok: 'Open',
            })
            .then((open) => {
              if (open) {
                window.open(url);
              }
              return null;
            })
            .catch(console.log);
        },
      };
    };

    useEffect(() => {
      let editor: MonacoType.editor.IStandaloneCodeEditor;
      /**
       * Handle the editor having been mounted. This refers to Monaco's
       * mount, not React's.
       *
       * @param {MonacoType.editor.IStandaloneCodeEditor} editor
       */
      const editorMounted = async (
        _editor: MonacoType.editor.IStandaloneCodeEditor,
      ) => {
        const { editorMosaic } = appState;

        editorMosaic.setSliceEditor(id, _editor);

        // And notify others
        if (editorDidMount) {
          editorDidMount(_editor);
        }

        if (editorMosaic.focusedGridId === id) {
          _editor.focus();
          setFocused(id);
        }
      };

      /**
       * Initialize Monaco.
       */
      const initMonaco = async () => {
        const { fontFamily, fontSize } = appState;

        if (containerRef.current) {
          editor = monaco.editor.create(
            containerRef.current,
            {
              automaticLayout: true,
              language,
              theme: 'main',
              fontFamily,
              fontSize,
              contextmenu: false,
              model: null,
              readOnly: true,
              ...monacoOptions,
            },
            {
              openerService: openerService(),
            },
          );
          editor.onDidFocusEditorText(() => {
            setFocused(id);
          });

          await editorMounted(editor);
        }
      };

      /**
       * Destroy Monaco.
       */
      const destroyMonaco = () => {
        if (typeof editor !== 'undefined') {
          // console.log('Editor: Disposing');
          editor.dispose();
        }
      };

      initMonaco();
      return () => {
        destroyMonaco();
      };
    });

    return <div className="editorContainer" ref={containerRef} />;
  },
  areEqual,
);
