import { observer } from 'mobx-react';
import { Colors } from '@blueprintjs/core';
import { AppState } from '../state';

interface ICoverageAnalysisProps {
  appState: AppState;
}

export const CoverageAnalysis = observer(
  ({ appState }: ICoverageAnalysisProps) => {
    const { focusedFuncSignature } =
      appState.editorMosaic.mainEditor.testCaseCollection!;

    const { coverageAnalysis } = appState.editorMosaic.mainEditor;
    const styleMermaid = coverageAnalysis!.standard2Mermaid + Colors.GREEN3;
    return (
      <div className="coverage-analysis">
        <h3>Function: {focusedFuncSignature || ''} </h3>
        {styleMermaid}
      </div>
    );
  },
);
