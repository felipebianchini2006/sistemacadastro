'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PrivacyGateProps {
  onAccept: () => void;
}

export function PrivacyGate({ onAccept }: PrivacyGateProps) {
  const [accepted, setAccepted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const handleAccept = () => {
    if (!accepted) return;
    onAccept();
  };

  const handleClose = () => {
    router.push('/');
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, []);

  const getFocusableElements = () => {
    if (!dialogRef.current) return [];
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)] md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-gate-title"
        aria-describedby="privacy-gate-description"
        tabIndex={-1}
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--gray-500)]">
            LGPD
          </p>
          <h2
            id="privacy-gate-title"
            className="mt-3 text-2xl font-bold text-[color:var(--gray-900)]"
          >
            Bem-vindo ao Sistema de Filiação SBACEM
          </h2>
          <p id="privacy-gate-description" className="mt-2 text-sm text-[color:var(--gray-500)]">
            Antes de iniciar seu cadastro, é necessário que você leia e aceite nossa Política de
            Privacidade.
          </p>
        </div>

        <div className="mb-6 max-h-96 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5">
          <h3 className="mb-3 font-semibold text-[color:var(--gray-900)]">
            Principais Pontos da Política de Privacidade
          </h3>
          <div className="space-y-3 text-sm text-[color:var(--gray-700)]">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                <svg
                  className="h-3 w-3 text-[color:var(--primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p>
                <strong>Coleta de Dados:</strong> Coletamos informações pessoais necessárias para
                processar sua filiação, incluindo nome, CPF, email, telefone, endereço e documentos
                de identificação.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                <svg
                  className="h-3 w-3 text-[color:var(--primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p>
                <strong>Uso dos Dados:</strong> Suas informações serão utilizadas exclusivamente
                para análise da proposta, comunicação sobre o status, processamento de assinatura
                digital e integração com nossos sistemas internos (ERP).
              </p>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                <svg
                  className="h-3 w-3 text-[color:var(--primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p>
                <strong>Segurança:</strong> Seus dados são criptografados e armazenados de forma
                segura. Utilizamos certificados SSL, criptografia de dados sensíveis e controles de
                acesso rigorosos.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                <svg
                  className="h-3 w-3 text-[color:var(--primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p>
                <strong>Compartilhamento:</strong> Seus dados não serão vendidos ou compartilhados
                com terceiros, exceto quando necessário para prestação de serviços essenciais
                (assinatura digital, verificação de documentos).
              </p>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                <svg
                  className="h-3 w-3 text-[color:var(--primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p>
                <strong>Seus Direitos (LGPD):</strong> Você tem direito a acessar, corrigir, deletar
                seus dados pessoais, solicitar portabilidade e revogar consentimentos a qualquer
                momento.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)]">
                <svg
                  className="h-3 w-3 text-[color:var(--primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p>
                <strong>Retenção de Dados:</strong> Seus dados serão mantidos pelo período
                necessário para o cumprimento de obrigações legais e contratuais, conforme
                legislação vigente.
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[color:var(--gray-500)]">
              Para ler a política completa, acesse:{' '}
              <Link
                href="/privacidade"
                className="font-semibold text-[color:var(--primary)] underline"
                target="_blank"
                rel="noreferrer"
              >
                Política de Privacidade Completa
              </Link>
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 cursor-pointer rounded border-[var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className="text-sm text-[color:var(--gray-700)]">
              Li e aceito a{' '}
              <Link
                href="/privacidade"
                className="font-semibold text-[color:var(--primary)] underline"
                target="_blank"
                rel="noreferrer"
              >
                Política de Privacidade
              </Link>{' '}
              e concordo com o tratamento dos meus dados pessoais conforme descrito acima.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            ref={closeButtonRef}
            className="min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[color:var(--gray-700)] hover:border-[var(--primary)]"
          >
            Sair
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted}
            className={`min-h-[44px] rounded-xl px-6 py-3 text-sm font-semibold transition-colors ${
              accepted
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
                : 'cursor-not-allowed bg-[var(--gray-200)] text-[color:var(--gray-500)]'
            }`}
          >
            Aceitar e Iniciar Cadastro
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-[color:var(--gray-500)]">
          Ao clicar em "Aceitar e Iniciar Cadastro", você concorda com os termos da Política de
          Privacidade e autoriza o tratamento dos seus dados pessoais.
        </p>
      </div>
    </div>
  );
}
