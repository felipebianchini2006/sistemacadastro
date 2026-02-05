'use client';

import { useMemo, useState } from 'react';
import { apiFetch, apiUpload } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

type PendingItemsProps = {
  items: string[];
  proposalId?: string;
  token?: string;
};

type UploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
};

const DOC_OPTIONS = [
  { value: 'RG_FRENTE', label: 'RG - frente' },
  { value: 'RG_VERSO', label: 'RG - verso' },
  { value: 'CNH', label: 'CNH' },
  { value: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de residencia' },
  { value: 'SELFIE', label: 'Selfie' },
  { value: 'DESFILIACAO', label: 'Documento adicional' },
] as const;

type DocType = (typeof DOC_OPTIONS)[number]['value'];

const loadImageSize = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      cleanup();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Falha ao ler imagem'));
    };
    image.src = url;
  });

export const PendingItems = ({ items, proposalId, token }: PendingItemsProps) => {
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState<DocType>('RG_FRENTE');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });

  const hasDocsPending = useMemo(
    () => items.some((item) => item.toLowerCase().includes('document')),
    [items],
  );

  const canUpload = Boolean(proposalId && token);

  const handleUpload = async (file: File) => {
    if (!proposalId || !token) return;
    setUpload({ status: 'uploading' });
    try {
      const useDirectUpload =
        typeof window !== 'undefined' && window.location.hostname.endsWith('.devtunnels.ms');
      const isImage = file.type.startsWith('image/');
      const dimensions = isImage ? await loadImageSize(file) : null;
      if (useDirectUpload) {
        const form = new FormData();
        form.append('file', file);
        form.append('proposalId', proposalId);
        form.append('docType', docType);
        if (dimensions?.width) {
          form.append('imageWidth', String(dimensions.width));
        }
        if (dimensions?.height) {
          form.append('imageHeight', String(dimensions.height));
        }

        await apiUpload<{ documentId: string; storageKey: string }>('/public/uploads/direct', {
          method: 'POST',
          headers: { 'x-proposal-token': token },
          body: form,
        });
      } else {
        const presign = await apiFetch<{
          uploadUrl: string;
          headers: Record<string, string>;
          documentId: string;
        }>('/public/uploads/presign', {
          method: 'POST',
          headers: { 'x-proposal-token': token },
          body: {
            proposalId,
            proposalToken: token,
            docType,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            imageWidth: dimensions?.width,
            imageHeight: dimensions?.height,
          },
        });

        await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: presign.headers,
          body: file,
        });
      }

      setUpload({ status: 'success', message: 'Documento enviado com sucesso.' });
    } catch (error) {
      setUpload({
        status: 'error',
        message: error instanceof Error ? error.message : 'Falha ao enviar documento.',
      });
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-[color:var(--gray-900)]">Pendencias</h3>
        {hasDocsPending ? (
          <Button onClick={() => setShowUpload((prev) => !prev)}>
            {showUpload ? 'Fechar envio' : 'Enviar documentos'}
          </Button>
        ) : null}
      </div>
      <ul className="mt-4 grid gap-2 text-sm text-[color:var(--gray-500)]">
        {items.length === 0 ? (
          <li className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            Nenhuma pendencia no momento.
          </li>
        ) : (
          items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="rounded-2xl border border-[var(--border)] px-4 py-3"
            >
              {item}
            </li>
          ))
        )}
      </ul>

      {hasDocsPending && showUpload ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold text-[color:var(--gray-700)]">
            Enviar documentos complementares
          </p>
          <p className="mt-2 text-xs text-[color:var(--gray-500)]">
            Use o token seguro recebido por email. Nunca compartilhe este link.
          </p>
          {!canUpload ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Link seguro obrigatorio para enviar documentos. Solicite um novo com o suporte.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-2 text-sm text-[color:var(--gray-500)]">
                Tipo de documento
                <select
                  value={docType}
                  onChange={(event) => setDocType(event.target.value as DocType)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--gray-900)]"
                >
                  {DOC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--gray-300)] bg-[var(--card)] px-4 py-6 text-sm text-[color:var(--gray-500)]">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleUpload(file);
                    }
                  }}
                />
                <span>Selecionar arquivo</span>
                <span className="text-xs">JPEG, PNG ou PDF</span>
              </label>
              {upload.status !== 'idle' ? (
                <div
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs',
                    upload.status === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : upload.status === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-amber-200 bg-amber-50 text-amber-800',
                  )}
                >
                  {upload.status === 'uploading'
                    ? 'Enviando...'
                    : (upload.message ?? 'Envio concluido.')}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
};
