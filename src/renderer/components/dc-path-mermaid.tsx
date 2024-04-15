import { observer } from 'mobx-react';
import mermaid from 'mermaid';
import svgPanZoom from 'svg-pan-zoom';
import { useEffect, useRef } from 'react';
import { NonIdealState } from '@blueprintjs/core';

import { AppState } from '../state';

interface IControlFlowProps {
  appState: AppState;
}

export const DCPathMermaid = observer(({ appState }: IControlFlowProps) => {
  const { dcMermaid } = appState.editorMosaic.mainEditor.defUseCollection!;
  const { setPanZoom } = appState.editorMosaic;
  const ref = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    const drawDiagram = async () => {
      mermaid
        .render('dc-path-meramid-graph', dcMermaid!)
        .then((res) => {
          if (ref.current) {
            ref.current.innerHTML = res.svg;
            res.bindFunctions?.(ref.current);

            const panZoom = svgPanZoom('#dc-path-meramid-graph', {
              zoomEnabled: true,
              controlIconsEnabled: true,
              fit: true,
              center: true,
              minZoom: 0.1,
              maxZoom: 10,
            });

            // 设置the-graph的max-width: 100%
            const theGraph = document.querySelector('#dc-path-meramid-graph');
            if (theGraph) {
              theGraph.setAttribute('style', 'max-width: 100%');
            }
            panZoom.resize();
            panZoom.center();
            setPanZoom(panZoom, 'dc');

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
    if (dcMermaid) drawDiagram();
  }, [dcMermaid, setPanZoom]);

  return dcMermaid ? (
    <div className="mermaid" ref={ref} />
  ) : (
    <NonIdealState icon="applications" description="No Dataflow is drew" />
  );
});
