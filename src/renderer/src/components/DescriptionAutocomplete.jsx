import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * DescriptionAutocomplete
 *
 * Props:
 *  - value        {string}   valor controlado do input
 *  - onChange     {fn}       callback (newValue: string) => void
 *  - userId       {string|number}  userId para buscar sugestões
 *  - placeholder  {string}   placeholder do input
 *  - required     {bool}
 *  - className    {string}   classes adicionais no <input>
 *  - disabled     {bool}
 */
export default function DescriptionAutocomplete({
  value,
  onChange,
  userId,
  placeholder = 'Descrição',
  required = false,
  className = '',
  disabled = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Busca sugestões com debounce
  const fetchSuggestions = useCallback(async (query) => {
    if (!userId) return;
    try {
      const results = await window.api.getDescriptionSuggestions(userId, query);
      setSuggestions(Array.isArray(results) ? results : []);
    } catch (_) {
      setSuggestions([]);
    }
  }, [userId]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    setActiveIndex(-1);

    clearTimeout(debounceRef.current);
    if (newVal.trim().length === 0) {
      // Quando vazio, busca mais usadas (sem filtro)
      debounceRef.current = setTimeout(() => fetchSuggestions(''), 150);
    } else {
      debounceRef.current = setTimeout(() => fetchSuggestions(newVal), 200);
    }
    setOpen(true);
  };

  const handleFocus = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value || ''), 150);
    setOpen(true);
  };

  const handleSelect = (desc) => {
    onChange(desc);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight da parte digitada na sugestão
  const highlight = (text) => {
    if (!value || value.trim() === '') return text;
    const idx = text.toLowerCase().indexOf(value.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-accent/30 text-accent rounded-sm">{text.slice(idx, idx + value.length)}</mark>
        {text.slice(idx + value.length)}
      </>
    );
  };

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={className}
      />

      {showDropdown && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 35, 0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            listStyle: 'none',
            margin: 0,
            padding: '4px 0',
          }}
        >
          {suggestions.map((desc, idx) => (
            <li
              key={idx}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(desc);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              style={{
                padding: '9px 14px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: idx === activeIndex ? 'var(--color-accent, #22d3a0)' : '#e2e8f0',
                background: idx === activeIndex ? 'rgba(34,211,160,0.08)' : 'transparent',
                transition: 'background 0.12s, color 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {/* Ícone de histórico */}
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.45, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{highlight(desc)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
