import { useEffect, useState } from 'react';
import { isValidCep, normalizeCep } from '@sistemacadastro/shared';

export type ViaCepAddress = {
  street: string;
  district: string;
  city: string;
  state: string;
};

export const useViaCepAutofill = (cep: string) => {
  const [data, setData] = useState<ViaCepAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalized = normalizeCep(cep);
    if (!isValidCep(normalized)) {
      setData(null);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
          erro?: boolean;
        };

        if (payload.erro) {
          setData(null);
          setError('CEP nao encontrado');
          return;
        }

        setData({
          street: payload.logradouro ?? '',
          district: payload.bairro ?? '',
          city: payload.localidade ?? '',
          state: payload.uf ?? '',
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Falha ao consultar CEP');
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [cep]);

  return { data, loading, error };
};
