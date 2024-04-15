import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react';
import classNames from 'classnames';

import { AppState } from '../state';
import { getGridId } from '../../utils/editor-utils';
import { WinType } from '../../interface';

interface CommandsProps {
  appState: AppState;
}

export const Commands = observer(({ appState }: CommandsProps) => {
  const {
    title,
    sliceActive,
    defUseActive,
    sliceExtractActive,
    varDepActive,
    cfgButtonEnabled,
    controlFlowActive,
    testCaseButtonEnabled,
    dcPathExtractActive,
    dcPathMermaidActive,
    isTestCaseActive,
    analyzeCoverage,
    parseSlice,
    clearSlice,
    clearCoverageAnalysis,
    setupDefUse,
    clearDefUse,
    setupControlFlow,
    toggleSettings,
  } = appState;
  const {
    cursorPosition,
    cursorWord,
    testCaseReady,
    show,
    hide,
    disposeSliceEditor,
    updateFocusedFuncSignature,
  } = appState.editorMosaic;
  const { id } = appState.editorMosaic.mainEditor;

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      window.ElectronFlux.macTitlebarClicked();
    }
  };

  const handleSliceClick = () => {
    if (sliceActive) {
      clearSlice();
    } else {
      parseSlice();
    }
  };

  const handleDefUseClick = () => {
    if (defUseActive) {
      clearDefUse();
    } else {
      setupDefUse();
    }
  };

  const handleExtractClick = () => {
    if (sliceExtractActive) {
      hide(getGridId(WinType.SLICE, id!));
      disposeSliceEditor();
    } else {
      show(getGridId(WinType.SLICE, id!));
    }
  };

  const handleCFGClick = () => {
    setupControlFlow();
  };

  const handleCloseCFGClick = () => {
    hide(getGridId(WinType.CFG, id!));
  };

  const handleVarDepClick = () => {
    if (varDepActive) {
      hide(getGridId(WinType.VARDEP, id!));
    } else {
      show(getGridId(WinType.VARDEP, id!));
    }
  };

  const handleDCExtractClick = () => {
    if (dcPathExtractActive) {
      hide(getGridId(WinType.FLOW, id!));
    } else {
      show(getGridId(WinType.FLOW, id!));
    }
  };

  const handleDCPathMermaidClick = () => {
    if (dcPathMermaidActive) {
      hide(getGridId(WinType.FLOWGRAPH, id!));
    } else {
      show(getGridId(WinType.FLOWGRAPH, id!));
    }
  };

  const handleTestCaseClick = () => {
    if (!isTestCaseActive) {
      updateFocusedFuncSignature();
      show(getGridId(WinType.TESTCASE, id!));
    } else {
      hide(getGridId(WinType.TESTCASE, id!));
      hide(getGridId(WinType.ANALYSIS, id!));
      clearCoverageAnalysis();
    }
  };

  const handleSettingClick = () => {
    toggleSettings();
  };

  const handleCoverageAnalysisClick = () => {
    analyzeCoverage();
  };

  return (
    <div
      className={classNames('commands', {
        'is-mac': window.ElectronFlux.platform === 'darwin',
      })}
      onDoubleClick={handleDoubleClick}
    >
      <div>
        <ButtonGroup fill>
          <Button icon="cog" title="Setting" onClick={handleSettingClick} />
        </ButtonGroup>

        <ButtonGroup fill>
          <Button
            disabled={!cfgButtonEnabled}
            icon="flow-branch"
            text="Control Flow"
            title="Please place the cursor on a function def line"
            onClick={handleCFGClick}
          />
          <Button
            disabled={!controlFlowActive}
            icon="drawer-right"
            text="Close"
            title="Click to close CFG window"
            onClick={handleCloseCFGClick}
          />
        </ButtonGroup>

        <ButtonGroup fill>
          <Button
            active={sliceActive}
            disabled={
              defUseActive ||
              ((!cursorPosition || !cursorWord || cfgButtonEnabled) &&
                !sliceActive)
            }
            icon="waves"
            text="Slice"
            title="Please place the cursor on a variable name"
            onClick={handleSliceClick}
          />
          <Button
            disabled={!sliceExtractActive && !sliceActive}
            active={sliceExtractActive}
            icon="drawer-left"
            text="Extract"
            title="Slice must be active firstly"
            onClick={() => handleExtractClick()}
          />
          <Button
            disabled={!varDepActive && !sliceActive}
            active={varDepActive}
            icon="graph"
            text="VarDep"
            title="Slice must be active firstly"
            onClick={handleVarDepClick}
          />
        </ButtonGroup>
        <ButtonGroup fill>
          <Button
            active={defUseActive}
            disabled={
              sliceActive ||
              ((!cursorPosition || !cursorWord || cfgButtonEnabled) &&
                !defUseActive)
            }
            icon="flows"
            text="Def-Use"
            title="Please place the cursor on a variable name"
            onClick={handleDefUseClick}
          />
          <Button
            active={dcPathExtractActive}
            disabled={!dcPathExtractActive && !defUseActive}
            icon="drawer-left"
            text="Extract DC-Path"
            title="Def-Use must be active firstly"
            onClick={handleDCExtractClick}
          />
          <Button
            disabled={!dcPathMermaidActive && !defUseActive}
            active={dcPathMermaidActive}
            icon="graph"
            text="DC-Path-Graph"
            title="Def-Use must be active firstly"
            onClick={handleDCPathMermaidClick}
          />
        </ButtonGroup>

        <ButtonGroup fill>
          <Button
            disabled={!testCaseButtonEnabled}
            active={isTestCaseActive}
            icon="manually-entered-data"
            text="TestCase"
            title="Please place the cursor on the def line of a function with params"
            onClick={handleTestCaseClick}
          />
          <Button
            disabled={!isTestCaseActive || !testCaseReady}
            icon="play"
            text="Run"
            title="Click to run test case"
            onClick={handleCoverageAnalysisClick}
          />
        </ButtonGroup>
      </div>
      {window.ElectronFlux.platform === 'darwin' ? (
        <div className="title">{title}</div>
      ) : undefined}
      <div className="plain-text">
        Line {cursorPosition ? cursorPosition.lineNumber : undefined}, Word:{' '}
        {cursorWord ? cursorWord.word : undefined}
      </div>
    </div>
  );
});
