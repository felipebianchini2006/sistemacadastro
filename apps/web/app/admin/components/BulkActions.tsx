'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type BulkAction = 'assign' | 'status' | 'export';

interface BulkActionsProps {
  selectedCount: number;
  onAssign: () => void;
  onChangeStatus: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  onAssign,
  onChangeStatus,
  onExport,
  onClearSelection,
}: BulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<'first' | 'last' | 'none'>('first');
  const menuId = useId();

  const focusMenuItem = (index: number) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    items[clamped].focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      if (pendingFocusRef.current === 'last') {
        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (items?.length) {
          focusMenuItem(items.length - 1);
        }
        return;
      }
      if (pendingFocusRef.current === 'first') {
        focusMenuItem(0);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      pendingFocusRef.current = event.key === 'ArrowUp' ? 'last' : 'first';
      setIsOpen(true);
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;
    const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);

    if (event.key === 'Tab') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem(currentIndex < items.length - 1 ? currentIndex + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem(currentIndex > 0 ? currentIndex - 1 : items.length - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(items.length - 1);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="admin-card flex flex-col gap-4 rounded-2xl border border-[color:var(--primary-light)] bg-[color:var(--primary-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
          {selectedCount}
        </div>
        <div>
          <p className="text-sm font-semibold text-[color:var(--gray-900)]">
            {selectedCount}{' '}
            {selectedCount === 1 ? 'proposta selecionada' : 'propostas selecionadas'}
          </p>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-[color:var(--gray-500)] hover:text-[color:var(--gray-900)] hover:underline"
          >
            Limpar selecao
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              pendingFocusRef.current = 'first';
              setIsOpen(!isOpen);
            }}
            onKeyDown={handleButtonKeyDown}
            ref={buttonRef}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={menuId}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[color:rgba(255,255,255,0.04)] sm:w-auto sm:justify-start"
          >
            Acoes em lote
            <svg
              className="h-4 w-4"
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              <div
                ref={menuRef}
                id={menuId}
                role="menu"
                className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]"
                onKeyDown={handleMenuKeyDown}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onAssign();
                      setIsOpen(false);
                    }}
                    role="menuitem"
                    tabIndex={-1}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                  >
                    <svg
                      className="h-5 w-5 text-[color:var(--gray-500)]"
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Atribuir analista
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onChangeStatus();
                      setIsOpen(false);
                    }}
                    role="menuitem"
                    tabIndex={-1}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                  >
                    <svg
                      className="h-5 w-5 text-[color:var(--gray-500)]"
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Alterar status
                  </button>

                  <div className="my-1 border-t border-[var(--border)]" />

                  <button
                    type="button"
                    onClick={() => {
                      onExport();
                      setIsOpen(false);
                    }}
                    role="menuitem"
                    tabIndex={-1}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
                  >
                    <svg
                      className="h-5 w-5 text-[color:var(--gray-500)]"
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Exportar selecionadas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
