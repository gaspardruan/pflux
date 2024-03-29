import { observer } from 'mobx-react';
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Colors, Icon, Tag } from '@blueprintjs/core';
import { AppState } from '../state';

interface ICoverageAnalysisProps {
  appState: AppState;
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
      </div>
    );
  },
);
