/* eslint-disable react/static-property-placement */
/* eslint-disable max-classes-per-file */
import * as React from 'react';

import { Button } from '@blueprintjs/core';
import {
  MosaicContext,
  MosaicRootActions,
  MosaicWindowContext,
} from 'react-mosaic-component';

import { GridId } from '../../interface';
import { AppState } from '../state';

interface ToolbarButtonProps {
  // eslint-disable-next-line react/no-unused-prop-types
  appState: AppState;
  // eslint-disable-next-line react/no-unused-prop-types
  id: GridId;
}

// TODO: refactor to use hooks
abstract class ToolbarButton extends React.PureComponent<ToolbarButtonProps> {
  public static contextType = MosaicWindowContext;
  // eslint-disable-next-line react/no-unused-class-component-methods
  public declare context: MosaicWindowContext;

  /**
   * Create a button that performs the actual action
   */
  public abstract createButton(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _mosaicActions: MosaicRootActions<any>,
  ): React.ReactNode;

  public render() {
    return (
      <MosaicContext.Consumer>
        {({ mosaicActions }) => this.createButton(mosaicActions)}
      </MosaicContext.Consumer>
    );
  }
}

export class MaximizeButton extends ToolbarButton {
  /**
   * Create a button that can expand this panel
   */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public createButton(mosaicActions: MosaicRootActions<any>) {
    const onClick = () => {
      mosaicActions.expand(this.context.mosaicWindowActions.getPath());
    };

    return <Button icon="maximize" small onClick={onClick} />;
  }
}

export class RemoveButton extends ToolbarButton {
  /**
   * Create a button that can remove this panel
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  public createButton(_mosaicActions: MosaicRootActions<any>) {
    // const onClick = () => this.props.appState.editorMosaic.hide(this.props.id);
    const onClick = () => console.log('Remove Window Clicked');

    return <Button icon="cross" small onClick={onClick} />;
  }
}
