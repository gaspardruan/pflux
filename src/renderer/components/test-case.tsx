import {
  SelectionModes,
  Table2,
  Column,
  Cell,
  EditableCell2,
} from '@blueprintjs/table';
import { Button, Text, Icon } from '@blueprintjs/core';
import { observer } from 'mobx-react';
import { AppState } from '../state';

interface ITestCaseProps {
  appState: AppState;
}

export const TestCase = observer(({ appState }: ITestCaseProps) => {
  const { focusedFuncSignature } =
    appState.editorMosaic.mainEditor.testCaseCollection!;

  const {
    testCaseReady,
    getTestCase,
    addNewTestCase,
    deleteTestCase,
    setTestCaseValue,
  } = appState.editorMosaic;

  const parseParams = () => {
    return focusedFuncSignature
      .split('(')[1]
      .split(')')[0]
      .split(',')
      .map((param) => param.trim())
      .filter((param) => param !== '');
  };

  const testCase = getTestCase()!;

  const columnNames = parseParams();

  const handleAddRowClick = () => {
    const newRow = new Map<string, string>();
    columnNames.forEach((name) => newRow.set(name, ''));
    addNewTestCase(newRow);
  };

  const cellSetter = (rowIndex: number, columnIndex: number) => {
    return (value: string) => {
      setTestCaseValue(rowIndex, columnNames[columnIndex], value);
    };
  };

  const renderCell = (rowIndex: number, columnIndex: number) => {
    const row = testCase[rowIndex];
    const value = row.get(columnNames[columnIndex]);
    return (
      <EditableCell2
        value={value || ''}
        onConfirm={cellSetter(rowIndex, columnIndex)}
      />
    );
  };

  const renderAction = (rowIndex: number) => {
    return (
      <Cell>
        <Button
          className="action-button"
          minimal
          icon={<Icon icon="cross" intent="danger" size={12} />}
          onClick={() => {
            deleteTestCase(rowIndex);
          }}
        />
      </Cell>
    );
  };

  const columns = columnNames.map((name) => {
    return <Column key={name} name={name} cellRenderer={renderCell} />;
  });

  const columnWidths = columnNames.map(() => 100);

  columns.push(<Column key="action" name="" cellRenderer={renderAction} />);
  columnWidths.push(32);

  return (
    <div className="table-wrapper flux-scrollbar">
      <h3>Function: {focusedFuncSignature || ''} </h3>
      <div className="table-button-wrapper">
        <div className="table-div">
          <Table2
            columnWidths={columnWidths}
            numRows={testCase.length}
            enableRowResizing={false}
            selectionModes={SelectionModes.ROWS_ONLY}
          >
            {columns}
          </Table2>
        </div>
        <Button
          className="new-row-button"
          fill
          outlined
          minimal
          text="New Row"
          onClick={handleAddRowClick}
        />
        {!testCaseReady && (
          <Text className="warning-text bp5-intent-danger">
            TestCase not Ready
          </Text>
        )}
      </div>
    </div>
  );
});
