import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { EventInfoStep } from './EventInfoStep';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';

vi.mock('@live-show/design-system', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <input type="checkbox" id={id} checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
  ),
  SimpleCustomSelect: ({ value, onValueChange, options }: {
    value?: string;
    onValueChange?: (v: string) => void;
    options?: { value: string; label: string }[];
  }) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {options?.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

function Harness({ lowLatencyEnabled }: { lowLatencyEnabled?: boolean }) {
  const { register, control, setValue, formState: { errors } } = useForm<CreateEventFormValues>({
    defaultValues: { camerasCount: 1, tags: [], format: 'LIVE', latencyMode: 'STANDARD', publiclyFunded: false },
  });
  return (
    <EventInfoStep
      register={register}
      errors={errors}
      orgs={[]}
      control={control}
      setValue={setValue}
      lowLatencyEnabled={lowLatencyEnabled}
    />
  );
}

describe('EventInfoStep — low_latency_mode gate', () => {
  it('offers the LOW option when the flag is on', () => {
    render(<Harness lowLatencyEnabled />);
    expect(screen.getByText('latencyLabel')).toBeInTheDocument();
    expect(screen.getByText('latencyLow')).toBeInTheDocument();
  });

  it('hides the latency selector entirely when the flag is off, defaulting to STANDARD', () => {
    render(<Harness lowLatencyEnabled={false} />);
    expect(screen.queryByText('latencyLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('latencyLow')).not.toBeInTheDocument();
  });
});
