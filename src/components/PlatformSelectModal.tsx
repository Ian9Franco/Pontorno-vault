'use client';

import React, { useState, useMemo } from 'react';
import { PLATFORMS, PlatformDefinition } from '@/lib/constants/platforms';
import { PlatformIcon } from './PlatformIcon';
import { Search, X, Layers, Globe } from 'lucide-react';

interface PlatformSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (platform: PlatformDefinition) => void;
}

const CATEGORIES = ['Todas', 'Streaming', 'Email', 'Social', 'Productividad', 'Gaming', 'Finanzas', 'IA'] as const;

export const PlatformSelectModal: React.FC<PlatformSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const filteredPlatforms = useMemo(() => {
    return PLATFORMS.filter((p) => {
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-2xl bg-[#111624] border border-slate-800/90 rounded-3xl shadow-2xl p-5 sm:p-6 animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Catálogo de Servicios</h3>
              <p className="text-xs text-slate-400">Selecciona un servicio para asignar su ícono oficial y dirección</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="py-4 space-y-3 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar servicio (ej. Disney+, Netflix, ChatGPT, Gmail, Spotify...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs shadow-sm"
              autoFocus
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Grid */}
        <div className="overflow-y-auto flex-1 pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {filteredPlatforms.map((platform) => (
            <button
              key={platform.name}
              type="button"
              onClick={() => {
                onSelect(platform);
                onClose();
              }}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition text-left group shadow-sm"
            >
              <PlatformIcon
                platformName={platform.name}
                url={`https://${platform.domain}`}
                size="md"
                className="group-hover:scale-105 transition"
              />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-200 block truncate group-hover:text-indigo-300 transition">
                  {platform.name}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  {platform.domain}
                </span>
              </div>
            </button>
          ))}

          {filteredPlatforms.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No se encontraron servicios que coincidan con tu búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
