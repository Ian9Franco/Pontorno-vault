'use client';

import React, { useState } from 'react';
import { Search, Plus, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react';
import type { VaultItem } from '@/context/VaultContext';
import { CredentialCard } from './CredentialCard';

export const PAGE_SIZE = 12;

/** Filter before pagination so every matching service remains reachable. No secret is searched. */
export function filterCredentials(items: VaultItem[], query: string) {
  const term = query.trim().toLocaleLowerCase();
  return items.filter(({ payload }) => [payload.platform, payload.username, payload.url, payload.notes]
    .some(value => value?.toLocaleLowerCase().includes(term)));
}

interface Props {
  items: VaultItem[];
  canWrite: boolean;
  onAdd: () => void;
  onEdit: (item: VaultItem) => void;
  onRemove: (id: string) => Promise<void>;
}

/** Bounded grid: 12 records per page prevents large vaults from growing indefinitely. */
export function CredentialLibrary({ items, canWrite, onAdd, onEdit, onRemove }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const filtered = filterCredentials(items, query);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Deleting the final item on a page immediately reveals the previous valid page.
  const currentPage = Math.min(page, pages - 1);
  const shown = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return <section className="service-library" aria-label="Biblioteca de contraseñas">
    <div className="library-toolbar">
      <div className="library-search"><Search size={18} aria-hidden="true" />
        <input aria-label="Buscar contraseñas" type="search" value={query} placeholder="Buscar servicio o usuario"
          onChange={event => { setQuery(event.target.value); setPage(0); }} />
      </div>
      {canWrite && <button onClick={onAdd} aria-label="Añadir Credencial" className="library-add"><Plus size={18} /> Añadir contraseña</button>}
    </div>
    <div className="library-caption"><span>{query ? 'Resultados de búsqueda' : 'Todos los servicios'}</span>
      <span role="status">{filtered.length === 0 ? '0' : `${currentPage * PAGE_SIZE + 1}–${currentPage * PAGE_SIZE + shown.length}`} de {filtered.length}</span>
    </div>
    {shown.length === 0 ? <div className="library-empty">
      <KeyRound size={30} aria-hidden="true" />
      <h3>{query ? 'No encontramos coincidencias' : 'Aquí van tus contraseñas'}</h3>
      <p>{query ? 'Prueba otro servicio o nombre de usuario.' : canWrite ? 'Empieza guardando una cuenta que uses a menudo.' : 'Cuando haya una contraseña disponible, la verás aquí.'}</p>
      {query && <button onClick={() => { setQuery(''); setPage(0); }} className="card-detail-button">Limpiar búsqueda</button>}
    </div> : <div className="credential-grid" key={`${query}:${currentPage}`}>
      {shown.map(item => <CredentialCard key={item.id} item={item} canWrite={canWrite} onEdit={onEdit} onRemove={onRemove} />)}
    </div>}
    {pages > 1 && <nav className="library-pagination" aria-label="Páginas de servicios">
      <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button>
      <span>Página {currentPage + 1} de {pages}</span>
      <button disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente"><ChevronRight size={18} /></button>
    </nav>}
  </section>;
}
