import { observer } from 'mobx-react';
import { Button, Callout, FormGroup, InputGroup, Tag } from '@blueprintjs/core';

import { AppState } from '../state';

interface TestCaseInputProps {
  appState: AppState;
}

export const TestCaseInput = observer(({ appState }: TestCaseInputProps) => {
  const { formInput, focusedFuncSignature, setFormInputValue } = appState;
  const renderLabel = (name: string) => <Tag minimal>{name}</Tag>;

  const handleValueChange = (
    value: string,
    target: HTMLInputElement | null,
  ) => {
    setFormInputValue(target!.id, value);
  };

  return (
    <div className="test-case-input-wrapper">
      <h4 style={{ margin: '10px 0' }}>
        New Test Case{' '}
        {focusedFuncSignature.length > 0 ? `-- ${focusedFuncSignature}` : ''}
      </h4>
      <Callout className="flux-scrollbar">
        {formInput.size === 0 && (
          <p>Please click a function with params in the STRUCTURE</p>
        )}
        {Array.from(formInput.keys()).map((key) => {
          return (
            <FormGroup key={key} inline label={renderLabel(key)} labelFor={key}>
              <InputGroup
                value={formInput.get(key)}
                id={key}
                placeholder={key}
                onValueChange={handleValueChange}
              />
            </FormGroup>
          );
        })}
        {formInput.size !== 0 && (
          <Button
            className="add-test-case-button"
            minimal
            outlined
            icon="plus"
            text="Add Test Case"
          />
        )}
      </Callout>
    </div>
  );
});
