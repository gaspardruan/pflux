import { observer } from 'mobx-react';
import { AppState } from '../state';

interface ICoverageAnalysisProps {
  appState: AppState;
}

export const CoverageAnalysis = observer(
  ({ appState }: ICoverageAnalysisProps) => {
    const { focusedFuncSignature } =
      appState.editorMosaic.mainEditor.testCaseCollection!;
    const { coverageAnalysis } = appState.editorMosaic.mainEditor;
    return (
      <div className="coverage-analysis">
        <h3>Function: {focusedFuncSignature || ''} </h3>
        {JSON.stringify(coverageAnalysis!.standard)}
      </div>
    );
  },
);
