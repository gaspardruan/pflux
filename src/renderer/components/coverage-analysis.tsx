import { observer } from 'mobx-react';
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { CardList, Colors, Icon, Tag } from '@blueprintjs/core';
import { Table2, Column, SelectionModes, Cell } from '@blueprintjs/table';
import { AppState } from '../state';
import { PathCard } from './path-card';
import { UseType } from '../../interface';

interface ICoverageAnalysisProps {
  appState: AppState;
}

interface TableColum {
  varName: string;
  startLine: number;
  endLine: number;
  useType: UseType;
  covered: boolean;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'consolas, monospace',
  themeCSS: `
    .nodeLabel {
      text-align: left;
    }
  `,
});

export const CoverageAnalysis = observer(
  ({ appState }: ICoverageAnalysisProps) => {
    const { focusedFuncSignature } =
      appState.editorMosaic.mainEditor.testCaseCollection!;

    const { coverageAnalysis } = appState.editorMosaic.mainEditor;
    const coloredMermaid = coverageAnalysis!.standard2Mermaid + Colors.GREEN3;

    const ref = useRef<null | HTMLDivElement>(null);

    const coverage2TableColumn = () => {
      const tableColumn: TableColum[] = [];
      coverageAnalysis!.detail.forEach((dataflowGroup, varName) => {
        dataflowGroup.cUses.forEach((record) => {
          tableColumn.push({
            varName,
            startLine: record.startLine,
            endLine: record.endLine,
            useType: UseType.C,
            covered: record.covered,
          });
        });
        dataflowGroup.pUses.forEach((record) => {
          tableColumn.push({
            varName,
            startLine: record.startLine,
            endLine: record.endLine,
            useType: UseType.P,
            covered: record.covered,
          });
        });
      });
      return tableColumn;
    };

    const tableData = coverage2TableColumn();

    // console.log(tableData);
    // console.log(coverageAnalysis?.standard2Mermaid);

    const renderVariable = (rowIndex: number) => (
      <Cell>{tableData[rowIndex].varName}</Cell>
    );

    const renderStartLine = (rowIndex: number) => (
      <Cell>{tableData[rowIndex].startLine}</Cell>
    );

    const renderEndLine = (rowIndex: number) => (
      <Cell>{tableData[rowIndex].endLine}</Cell>
    );

    const renderUseType = (rowIndex: number) => (
      <Cell>
        {tableData[rowIndex].useType === UseType.C ? 'C-use' : 'P-use'}
      </Cell>
    );

    const renderCovered = (rowIndex: number) => (
      <Cell>
        {tableData[rowIndex].covered ? (
          <Icon icon="tick" color={Colors.GREEN3} />
        ) : (
          <Icon icon="cross" color={Colors.RED3} />
        )}
      </Cell>
    );

    useEffect(() => {
      const drawDiagram = async () => {
        mermaid
          .render('coverage-analysis-mermaid', coloredMermaid)
          .then((res) => {
            if (ref.current) {
              ref.current.innerHTML = res.svg;
              res.bindFunctions?.(ref.current);
            }
          })
          .catch((err) => {
            console.error(err);
          });
      };
      if (coloredMermaid) {
        drawDiagram();
      }
    }, [coloredMermaid]);

    return (
      <div className="coverage-analysis flux-scrollbar">
        <h3>Function: {focusedFuncSignature || ''} </h3>
        <div className="title-with-mark">
          <h4>Coverage Standard</h4>

          <div className="mark">
            <Icon className="mark-tag-achieved" icon="symbol-square" />
            <Tag minimal className="mark-tag">
              Covered
            </Tag>
          </div>
        </div>

        <div className="mermaid mermaid-inline" ref={ref} />

        <h4>Execution Path</h4>

        <CardList className="path-list" compact>
          {coverageAnalysis?.execPaths.map((path, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <PathCard key={index} path={path} index={index} />
          ))}
        </CardList>

        <h4>Path Coverage</h4>
        <div className="table-div">
          <Table2
            columnWidths={[80, 80, 80, 80, 80]}
            numRows={tableData.length}
            enableRowResizing={false}
            selectionModes={SelectionModes.ROWS_ONLY}
            cellRendererDependencies={[tableData]}
          >
            <Column name="Variable" cellRenderer={renderVariable} />
            <Column name="StartLine" cellRenderer={renderStartLine} />
            <Column name="EndLine" cellRenderer={renderEndLine} />
            <Column name="UseType" cellRenderer={renderUseType} />
            <Column name="Covered" cellRenderer={renderCovered} />
          </Table2>
        </div>
      </div>
    );
  },
);
