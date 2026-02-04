'use client';

import { useEffect, useId, useRef, useState } from 'react';

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

type SelectorOption =
  | { type: 'clear'; id: 'clear'; label: string }
  | { type: 'analyst'; id: string; name: string; email: string };

export function AnalystSelector({
  value,
  onChange,
  analysts,
  placeholder = 'Selecione um analista',
  label,
}: AnalystSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pendingFocusRef = useRef<'search' | 'list' | 'list-last'>('search');
  const listboxId = useId();
  const labelId = useId();

  const selected = analysts.find((a) => a.id === value);

  const filteredAnalysts = search
    ? analysts.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase()),
      )
    : analysts;

  const clearOption: SelectorOption = {
    type: 'clear',
    id: 'clear',
    label: 'Remover atribuicao',
  };

  const options: SelectorOption[] = [
    ...(value ? [clearOption] : []),
    ...filteredAnalysts.map((analyst) => ({
      type: 'analyst' as const,
      id: analyst.id,
      name: analyst.name,
      email: analyst.email,
    })),
  ];

  const focusOption = (index: number) => {
    const items = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!items?.length) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    setActiveIndex(clamped);
    items[clamped].focus();
  };

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

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = options.findIndex(
      (option) => option.type === 'analyst' && option.id === value,
    );
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    const timer = window.setTimeout(() => {
      if (pendingFocusRef.current === 'list') {
        focusOption(nextIndex);
        return;
      }
      if (pendingFocusRef.current === 'list-last') {
        focusOption(options.length - 1);
        return;
      }
      searchRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, options, value]);

  const openMenu = (focusTarget: 'search' | 'list' | 'list-last' = 'search') => {
    pendingFocusRef.current = focusTarget;
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setSearch('');
    buttonRef.current?.focus();
  };

  const selectOption = (option: SelectorOption) => {
    if (option.type === 'clear') {
      onChange(null);
    } else {
      onChange(option.id);
    }
    closeMenu();
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(event.key === 'ArrowUp' ? 'list-last' : 'list');
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(activeIndex >= 0 ? activeIndex : 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(activeIndex >= 0 ? activeIndex : options.length - 1);
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      selectOption(options[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    }
    if (event.key === 'Tab') {
      closeMenu();
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!options.length) return;

    if (event.key === 'Tab') {
      closeMenu();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(activeIndex < options.length - 1 ? activeIndex + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(activeIndex > 0 ? activeIndex - 1 : options.length - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (options[activeIndex]) {
        selectOption(options[activeIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          id={labelId}
          className="mb-2 block text-sm font-semibold text-[color:var(--gray-700)]"
        >
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openMenu('search'))}
        onKeyDown={handleButtonKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={!label ? placeholder : undefined}
        aria-labelledby={label ? labelId : undefined}
        className="admin-field flex min-h-[44px] items-center justify-between gap-2 text-left text-sm hover:border-[color:var(--gray-300)] focus:border-[var(--primary)]"
      >
        <span
          className={selected ? 'text-[color:var(--gray-900)]' : 'text-[color:var(--gray-500)]'}
        >
          {selected ? selected.name : placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-[color:var(--gray-500)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]">
          <div className="border-b border-[var(--border)] p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar analista..."
              className="admin-field text-sm"
            />
          </div>

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="max-h-64 overflow-y-auto"
            onKeyDown={handleListKeyDown}
          >
            {options.map((option, index) => {
              if (option.type === 'clear') {
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectOption(option)}
                    onFocus={() => setActiveIndex(index)}
                    role="option"
                    aria-selected={false}
                    tabIndex={-1}
                    id={`${listboxId}-option-${index}`}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="italic text-[color:var(--gray-500)]">{option.label}</span>
                  </button>
                );
              }

              const isSelected = value === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectOption(option)}
                  onFocus={() => setActiveIndex(index)}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  id={`${listboxId}-option-${index}`}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-[var(--muted)] ${
                    isSelected ? 'bg-[color:var(--primary-soft)]' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold text-[color:var(--gray-900)]">{option.name}</div>
                    <div className="text-xs text-[color:var(--gray-500)]">{option.email}</div>
                  </div>
                  {isSelected && (
                    <svg
                      className="h-5 w-5 text-[var(--primary)]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}

            {options.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[color:var(--gray-500)]">
                Nenhum analista encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
