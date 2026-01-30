import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../app/components/ProgressBar';

test('ProgressBar exp�e indice atual', () => {
  render(
    <ProgressBar
      current={1}
      steps={[
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
      ]}
    />,
  );

  const progress = screen.getByRole('progressbar');
  expect(progress).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByTestId('progress-step-1')).toBeInTheDocument();
});
