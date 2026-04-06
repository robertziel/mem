import { useRef, useEffect } from 'react';

interface Props {
  query: string;
  onChange: (q: string) => void;
}

export function SearchBar({ query, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      className="search-bar"
      placeholder='Search notes... (press "/" to focus)'
      value={query}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
