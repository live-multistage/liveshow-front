import type { CustomField } from '@puckeditor/core';

/** Content fields stay opaque to Puck until the inspector (V2-U2) draws them. */
export const renderField: CustomField<unknown>['render'] = ({ name }) => <span data-testid="field-placeholder" data-field={name} />;
