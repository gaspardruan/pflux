import { observer } from 'mobx-react';
import mermaid from 'mermaid';
import svgPanZoom from 'svg-pan-zoom';
import { useEffect, useRef } from 'react';
import { NonIdealState } from '@blueprintjs/core';

import { AppState } from '../state';

interface IControlFlowProps {
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

export const VarDep = observer(({ appState }: IControlFlowProps) => {
  const { varDepGraph } = appState.editorMosaic.mainEditor;
  const { setPanZoom } = appState.editorMosaic;
  const ref = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    const drawDiagram = async () => {
      mermaid
        .render('var-dep-graph', varDepGraph!)
        .then((res) => {
          if (ref.current) {
            ref.current.innerHTML = res.svg;
            res.bindFunctions?.(ref.current);

            const panZoom = svgPanZoom('#var-dep-graph', {
              zoomEnabled: true,
              controlIconsEnabled: true,
              fit: true,
              center: true,
              minZoom: 0.1,
              maxZoom: 10,
            });

            // 设置the-graph的max-width: 100%
            const theGraph = document.querySelector('#var-dep-graph');
            if (theGraph) {
              theGraph.setAttribute('style', 'max-width: 100%');
            }
            panZoom.resize();
            panZoom.center();
            setPanZoom(panZoom, 'varDep');

            window.onresize = () => {
              panZoom.resize();
              panZoom.center();
            };
          }
        })
        .catch((err) => {
          console.error(err);
        });
    };
    if (varDepGraph) drawDiagram();
  }, [varDepGraph, setPanZoom]);

  return varDepGraph ? (
    <div className="mermaid" ref={ref} />
  ) : (
    <NonIdealState icon="applications" description="No VarDep Graph is drew" />
  );
});
