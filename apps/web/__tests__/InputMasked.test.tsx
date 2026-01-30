import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { InputMasked } from '../app/components/InputMasked';

test('InputMasked aplica mascara de CPF', () => {
  const Wrapper = () => {
    const [value, setValue] = useState('');
    return <InputMasked label="CPF" value={value} onChange={setValue} mask="cpf" />;
  };

  render(<Wrapper />);

  const input = screen.getByRole('textbox', { name: /cpf/i }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: '12345678901' } });

  expect(input.value).toBe('123.456.789-01');
});
