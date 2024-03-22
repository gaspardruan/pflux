import { observer } from 'mobx-react';
import { Mosaic, MosaicNode } from 'react-mosaic-component';
import { AppState } from '../state';
import { TestCaseInput } from './test-case-input';
import { TestCaseList } from './test-case-list';

interface InputsProps {
  appState: AppState;
}

export const Inputs = observer(({ appState }: InputsProps) => {
  const { isInputShowing, inputLayout, setInputLayout } = appState;

  const ELEMENT_MAP = {
    input: <TestCaseInput appState={appState} />,
    list: <TestCaseList appState={appState} />,
  };

  const onChange = (rootNode: MosaicNode<string> | null) => {
    setInputLayout(rootNode);
  };

  return (
    <div
      className="inputs-wrapper"
      style={{
        display: isInputShowing ? 'inline-block' : 'none',
      }}
    >
      <Mosaic<string>
        renderTile={(id) => ELEMENT_MAP[id as keyof typeof ELEMENT_MAP]}
        initialValue={inputLayout}
        onChange={onChange}
      />
    </div>
  );
});
