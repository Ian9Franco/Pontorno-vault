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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Catálogo de Plataformas y Servicios</h3>
              <p className="text-xs text-gray-400">Elige un servicio para asignar su logo oficial y URL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="py-3 space-y-3 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar plataforma (Netflix, Disney+, Gmail, Spotify, Steam, etc.)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                    : 'bg-gray-950 text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Platform Grid */}
        <div className="overflow-y-auto pr-1 flex-1 min-h-[300px]">
          {filteredPlatforms.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-gray-500 text-xs">
              <Globe className="w-8 h-8 mb-2 opacity-50" />
              <span>No se encontraron plataformas coincidentes</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filteredPlatforms.map((platform) => {
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => {
                      onSelect(platform);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80 hover:border-emerald-500/50 hover:bg-gray-800/80 transition group text-left"
                  >
                    <PlatformIcon
                      platformName={platform.name}
                      url={platform.domain}
                      size="sm"
                      className="group-hover:scale-105"
                    />

                    <div className="truncate min-w-0">
                      <h4 className="text-xs font-semibold text-gray-200 group-hover:text-emerald-300 truncate">
                        {platform.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 truncate block">
                        {platform.domain}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-800 text-[11px] text-gray-500 flex justify-between items-center flex-shrink-0">
          <span>{filteredPlatforms.length} plataformas disponibles</span>
          <span>¿No está en la lista? Puedes escribir cualquier nombre personalizado</span>
        </div>
      </div>
    </div>
  );
};
