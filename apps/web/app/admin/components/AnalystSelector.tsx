'use client';

import { useState, useEffect, useRef } from 'react';

export interface Analyst {
  id: string;
  name: string;
  email: string;
}

interface AnalystSelectorProps {
  value?: string;
  onChange: (analystId: string | null) => void;
  analysts: Analyst[];
  placeholder?: string;
  label?: string;
}

export function AnalystSelector({
  value,
  onChange,
  analysts,
  placeholder = 'Selecione um analista',
  label,
}: AnalystSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = analysts.find((a) => a.id === value);

  const filteredAnalysts = search
    ? analysts.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase()),
      )
    : analysts;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="mb-2 block text-sm font-semibold text-zinc-700">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2 text-left text-sm hover:border-zinc-300 focus:border-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20"
      >
        <span className={selected ? 'text-zinc-900' : 'text-zinc-500'}>
          {selected ? selected.name : placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-200 bg-white shadow-lg">
          {/* Search */}
          <div className="border-b border-zinc-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar analista..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg
                  className="h-5 w-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="italic text-zinc-500">Remover atribuição</span>
              </button>
            )}

            {filteredAnalysts.map((analyst) => (
              <button
                key={analyst.id}
                type="button"
                onClick={() => {
                  onChange(analyst.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-zinc-50 ${
                  value === analyst.id ? 'bg-orange-50' : ''
                }`}
              >
                <div>
                  <div className="font-semibold text-zinc-900">{analyst.name}</div>
                  <div className="text-xs text-zinc-500">{analyst.email}</div>
                </div>
                {value === analyst.id && (
                  <svg className="h-5 w-5 text-[#ff6b35]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}

            {filteredAnalysts.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum analista encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
