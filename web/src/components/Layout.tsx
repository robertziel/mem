import type { ReactNode } from 'react';
import { SearchBar } from './SearchBar';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onNewNote: () => void;
  sidebar: ReactNode;
  main: ReactNode;
}

export function Layout({ query, onQueryChange, onNewNote, sidebar, main }: Props) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">mem</div>
        <SearchBar query={query} onChange={onQueryChange} />
        <button className="btn btn-primary" onClick={onNewNote}>+ New</button>
      </header>
      <div className="layout-body">
        <aside className="sidebar">{sidebar}</aside>
        <main className="main-content">{main}</main>
      </div>
    </div>
  );
}
