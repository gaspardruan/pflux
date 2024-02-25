import { observer } from 'mobx-react';
import { Tree, TreeNodeInfo } from '@blueprintjs/core';
import {
  IconCircleLetterA,
  IconCircleLetterC,
  IconCircleLetterF,
  IconCircleLetterM,
  IconCircleLetterP,
  IconCircleLetterV,
} from '@tabler/icons-react';
import { StructNodeInfo, NodeType } from '../../interface';
import { AppState } from '../state';

interface SidebarParserProps {
  appState: AppState;
}
export const SidebarParser = observer(({ appState }: SidebarParserProps) => {
  const { editorMosaic } = appState;
  const { structTree, setStructExpand } = editorMosaic;
  const { structExpandRecord } = editorMosaic.mainEditor;

  const icon = (type: NodeType) => {
    switch (type) {
      case 'function':
        return (
          <IconCircleLetterF
            size={18}
            className="bp5-icon bp5-tree-node-icon bp5-tree-node-icon-function"
          />
        );
      case 'class':
        return (
          <IconCircleLetterC
            size={18}
            className="bp5-icon bp5-tree-node-icon bp5-tree-node-icon-class"
          />
        );
      case 'method':
        return (
          <IconCircleLetterM
            size={18}
            className="bp5-icon bp5-tree-node-icon bp5-tree-node-icon-method"
          />
        );
      case 'variable':
        return (
          <IconCircleLetterV
            size={18}
            className="bp5-icon bp5-tree-node-icon bp5-tree-node-icon-variable"
          />
        );
      case 'attribute':
        return (
          <IconCircleLetterA
            size={18}
            className="bp5-icon bp5-tree-node-icon bp5-tree-node-icon-attribute"
          />
        );
      case 'property':
        return (
          <IconCircleLetterP
            size={18}
            className="bp5-icon bp5-tree-node-icon bp5-tree-node-icon-property"
          />
        );
      default:
        return null;
    }
  };

  const isExpanded = (id: string) => {
    if (structExpandRecord && structExpandRecord.has(id)) {
      return structExpandRecord.get(id);
    }
    return true;
  };

  const handleNodeExpand = (node: TreeNodeInfo) => {
    setStructExpand(node.id as string, true);
  };

  const handleNodeCollapse = (node: TreeNodeInfo) => {
    setStructExpand(node.id as string, false);
  };

  // Transfer Array<StructNodeInfo> to TreeNodeInfo[]
  const trans = (structs: Array<StructNodeInfo>): TreeNodeInfo[] => {
    return structs.map((node) => {
      return {
        id: `${node.type}-${node.text}`,
        label: node.text,
        hasCaret: node.code.length > 0,
        isExpanded: isExpanded(`${node.type}-${node.text}`),
        icon: icon(node.type),
        childNodes: trans(node.code),
      };
    });
  };

  return (
    <div className="struct-tree-wrapper">
      <h4 style={{ margin: '10px 0' }}>Structure</h4>
      <div className="struct-tree flux-scrollbar">
        <Tree
          contents={trans(structTree)}
          onNodeExpand={handleNodeExpand}
          onNodeCollapse={handleNodeCollapse}
        />
      </div>
    </div>
  );
});
