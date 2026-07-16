import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, ProgressBar, OverbudgetFlag } from './ui';

describe('StatusBadge', () => {
  it('renders the Indonesian label for each status', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('renders CLOSED as "Ditutup"', () => {
    render(<StatusBadge status="CLOSED" />);
    expect(screen.getByText('Ditutup')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('clamps values below 0 and above 100', () => {
    const { container: low } = render(<ProgressBar value={-20} />);
    expect(low.querySelector('.progress-bar')).toHaveStyle({ width: '0%' });

    const { container: high } = render(<ProgressBar value={140} />);
    expect(high.querySelector('.progress-bar')).toHaveStyle({ width: '100%' });
  });

  it('rounds the label', () => {
    render(<ProgressBar value={42.6} />);
    expect(screen.getByText('43%')).toBeInTheDocument();
  });
});

describe('OverbudgetFlag', () => {
  it('renders the overbudget warning', () => {
    render(<OverbudgetFlag />);
    expect(screen.getByText(/Overbudget/)).toBeInTheDocument();
  });
});
