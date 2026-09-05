vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../mutations/use-login.mutation', () => ({
  useLoginMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));
vi.mock('./MarketingPanel', () => ({ MarketingPanel: () => <div>marketing-panel-stub</div> }));

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm — social login gate', () => {
  it('renders the social login buttons by default', () => {
    render(<LoginForm />);
    expect(screen.getByText('continueWithGoogle')).toBeInTheDocument();
    expect(screen.getByText('continueWithApple')).toBeInTheDocument();
  });

  it('hides the social login block when socialLoginEnabled is false', () => {
    render(<LoginForm socialLoginEnabled={false} />);
    expect(screen.queryByText('continueWithGoogle')).not.toBeInTheDocument();
    expect(screen.queryByText('continueWithApple')).not.toBeInTheDocument();
    expect(screen.queryByText('orContinueWith')).not.toBeInTheDocument();
  });
});
