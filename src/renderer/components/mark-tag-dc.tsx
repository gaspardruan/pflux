import { Icon, Tag } from '@blueprintjs/core';
import { observer } from 'mobx-react';
import { AppState } from '../state';

interface MarkTagProps {
  appState: AppState;
}

export const MarkTagDC = observer(({ appState }: MarkTagProps) => {
  const { defUseActive } = appState;
  return (
    defUseActive && (
      <div className="mark-group">
        <Icon className="mark-tag-def" icon="symbol-square" />
        <Tag minimal className="mark-tag">
          P-Use
        </Tag>
        <Icon className="mark-tag-use" icon="symbol-square" />
        <Tag minimal className="mark-tag">
          C-Use
        </Tag>
      </div>
    )
  );
});
