import { observer } from 'mobx-react';
import { NonIdealState } from '@blueprintjs/core';
import { Table2, Column, Cell, SelectionModes } from '@blueprintjs/table';
import { AppState } from '../state';
import { UseType } from '../../interface';

interface IDefUseProps {
  appState: AppState;
}

export const DCPath = observer(({ appState }: IDefUseProps) => {
  const { dcPaths } = appState.editorMosaic.mainEditor.defUseCollection!;

  const renderStartLine = (rowIndex: number) => (
    <Cell>{dcPaths[rowIndex].startLine}</Cell>
  );

  const renderEndLine = (rowIndex: number) => (
    <Cell>{dcPaths[rowIndex].endLine}</Cell>
  );

  const renderUseType = (rowIndex: number) => (
    <Cell>{dcPaths[rowIndex].useType === UseType.C ? 'C-use' : 'P-use'}</Cell>
  );

  return dcPaths.length !== 0 ? (
    <div className="table-wrapper">
      <Table2
        columnWidths={[100, 100, 100]}
        enableRowResizing
        numRows={dcPaths.length}
        selectionModes={SelectionModes.NONE}
      >
        <Column name="StartLine" cellRenderer={renderStartLine} />
        <Column name="EndLine" cellRenderer={renderEndLine} />
        <Column name="UseType" cellRenderer={renderUseType} />
      </Table2>
    </div>
  ) : (
    <NonIdealState icon="applications" description="No DC-Path is extracted" />
  );
});
