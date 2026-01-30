'use client';

import { useEffect, useState } from 'react';
import { formatCep } from '@sistemacadastro/shared';

import {
  useCepValidation,
  useCpfValidation,
  useEmailValidation,
  usePhoneValidation,
  type ValidationStatus,
} from './hooks/validation';
import { useViaCepAutofill } from './hooks/useViaCep';

const StatusIndicator = ({ status }: { status: ValidationStatus }) => {
  const base =
    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white';
  if (status === 'valid') {
    return <span className={`${base} bg-emerald-500`}>OK</span>;
  }
  if (status === 'invalid') {
    return <span className={`${base} bg-red-500`}>X</span>;
  }
  return <span className={`${base} bg-zinc-300 text-zinc-600`}>-</span>;
};

const Field = ({
  label,
  value,
  onChange,
  status,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  status: ValidationStatus;
  placeholder?: string;
  hint?: string;
}) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-zinc-700">{label}</span>
    <div className="flex items-center gap-3">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none"
      />
      <StatusIndicator status={status} />
    </div>
    {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
  </label>
);

export default function Home() {
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const cpfValidation = useCpfValidation(cpf);
  const emailValidation = useEmailValidation(email);
  const phoneValidation = usePhoneValidation(phone);
  const cepValidation = useCepValidation(cep);
  const viaCep = useViaCepAutofill(cepValidation.normalized);

  useEffect(() => {
    if (!viaCep.data) return;
    setStreet(viaCep.data.street);
    setDistrict(viaCep.data.district);
    setCity(viaCep.data.city);
    setState(viaCep.data.state);
  }, [viaCep.data]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 rounded-3xl bg-white p-10 shadow-xl">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Validacao realtime
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">
            Validacao compartilhada (web + api)
          </h1>
          <p className="text-sm text-zinc-500">
            CPF, telefone e email seguem as mesmas regras do backend. CEP dispara consulta no ViaCEP
            e auto-preenche endereco.
          </p>
        </header>

        <section className="grid gap-6">
          <Field
            label="CPF"
            value={cpf}
            onChange={setCpf}
            status={cpfValidation.status}
            placeholder="000.000.000-00"
            hint={cpfValidation.normalized ? `Normalizado: ${cpfValidation.normalized}` : undefined}
          />

          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            status={emailValidation.status}
            placeholder="nome@email.com"
            hint={
              emailValidation.normalized ? `Normalizado: ${emailValidation.normalized}` : undefined
            }
          />

          <Field
            label="Telefone"
            value={phone}
            onChange={setPhone}
            status={phoneValidation.status}
            placeholder="(11) 91234-5678"
            hint={
              phoneValidation.e164
                ? `E.164: ${phoneValidation.e164}`
                : phoneValidation.ddd
                  ? `DDD: ${phoneValidation.ddd}`
                  : undefined
            }
          />

          <Field
            label="CEP"
            value={cep}
            onChange={(value) => setCep(formatCep(value))}
            status={cepValidation.status}
            placeholder="00000-000"
            hint={viaCep.error ?? undefined}
          />
        </section>

        <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Endereco (ViaCEP)</h2>
            <span className="text-xs text-zinc-500">
              {viaCep.loading ? 'Consultando...' : 'Atualizado automaticamente'}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-zinc-600">
              Rua
              <input
                value={street}
                onChange={(event) => setStreet(event.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-600">
              Bairro
              <input
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-600">
              Cidade
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-600">
              UF
              <input
                value={state}
                onChange={(event) => setState(event.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
