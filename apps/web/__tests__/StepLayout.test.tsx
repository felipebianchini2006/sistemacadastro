import { render, screen } from '@testing-library/react';
import { StepLayout } from '../app/components/StepLayout';

test('StepLayout renderiza titulo e conteudo', () => {
  render(
    <StepLayout title="Titulo" description="Descricao">
      <div>Conteudo</div>
    </StepLayout>,
  );

  expect(screen.getByText('Titulo')).toBeInTheDocument();
  expect(screen.getByText('Descricao')).toBeInTheDocument();
  expect(screen.getByText('Conteudo')).toBeInTheDocument();
});
