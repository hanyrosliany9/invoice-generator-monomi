import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MoneyDisplay } from '../MoneyDisplay';
import { DateDisplay } from '../DateDisplay';

describe('MoneyDisplay', () => {
  it('formats IDR with id-ID separators', () => {
    const { container } = render(<MoneyDisplay amount={12500000} />);
    expect(container.textContent).toBe('Rp 12.500.000');
  });
  it('renders zero as Rp 0', () => {
    const { container } = render(<MoneyDisplay amount={0} />);
    expect(container.textContent).toBe('Rp 0');
  });
  it('shows negative with color-negative class when colorize set', () => {
    const { container } = render(<MoneyDisplay amount={-500000} colorize />);
    expect(container.firstChild).toHaveClass('text-danger');
  });
});

describe('DateDisplay', () => {
  it('formats ISO date in Bahasa Indonesia', () => {
    const { container } = render(<DateDisplay date="2026-05-24T10:00:00Z" />);
    expect(container.textContent).toMatch(/24 Mei 2026/);
  });
  it('renders dash for null', () => {
    const { container } = render(<DateDisplay date={null} />);
    expect(container.textContent).toBe('—');
  });
});
