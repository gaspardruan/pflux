import { observer } from 'mobx-react';
import { NonIdealState } from '@blueprintjs/core';
import { Table2, Column, Cell, SelectionModes } from '@blueprintjs/table';
import { AppState } from '../state';
import { UseType } from '../../interface';

interface IDefUseProps {
  appState: AppState;
}

export const DCPath = observer(({ appState }: IDefUseProps) => {
  const { dcPaths, varName } =
    appState.editorMosaic.mainEditor.defUseCollection!;

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
    <div className="table-wrapper flux-scrollbar">
      <h3>Variable: {varName}</h3>
      <div className="table-div">
        <Table2
          columnWidths={[100, 100, 100]}
          numRows={dcPaths.length}
          enableRowResizing={false}
          enableColumnResizing={false}
          selectionModes={SelectionModes.ROWS_ONLY}
        >
          <Column name="StartLine" cellRenderer={renderStartLine} />
          <Column name="EndLine" cellRenderer={renderEndLine} />
          <Column name="UseType" cellRenderer={renderUseType} />
        </Table2>
      </div>
    </div>
  ) : (
    <NonIdealState icon="applications" description="No DC-Path is extracted" />
  );
});
