/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Edit2, Check } from 'lucide-react';
import { RelayState } from '../types';

interface RelayControlProps {
  relays: RelayState[];
  onToggle: (id: number) => void;
  onAllOn: () => void;
  onAllOff: () => void;
  onRename: (id: number, newName: string) => void;
  isPolaActive: boolean;
}

export const RelayControl: React.FC<RelayControlProps> = ({
  relays,
  onToggle,
  onAllOn,
  onAllOff,
  onRename,
  isPolaActive,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startEditing = (id: number, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const saveRename = (id: number) => {
    if (editValue.trim()) {
      onRename(id, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div id="relay-control" className="bg-[#0d1527]/90 border border-[#00c9ff]/20 rounded-xl p-5 box-glow transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-5 bg-[#00c9ff] rounded-sm"></div>
          <h2 className="font-title text-base font-bold tracking-tight text-[#00c9ff] uppercase">Kontrol Relay Power</h2>
        </div>
        
        {/* Master Switches */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAllOn}
            className="px-3 py-1 text-xs font-semibold bg-[#122c42] hover:bg-[#00c9ff] hover:text-black border border-[#00c9ff]/45 text-[#00c9ff] rounded-md transition-all duration-200"
            id="btn-all-relay-on"
          >
            Semua ON
          </button>
          <button
            onClick={onAllOff}
            className="px-3 py-1 text-xs font-semibold bg-[#1b1e2c] hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 rounded-md transition-all duration-200"
            id="btn-all-relay-off"
          >
            Semua OFF
          </button>
        </div>
      </div>

      {isPolaActive && (
        <div className="mb-4 p-2.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 text-xs">
          ⚠️ <strong>Pola lampu aktif!</strong> Hubungan langsung relay dinonaktifkan sementara untuk kelancaran sinkronisasi animasi.
        </div>
      )}

      {/* Grid structure for Relays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {relays.map((relay) => {
          const isActive = relay.state === 'ON';
          const isCurrentEditing = editingId === relay.id;

          return (
            <div
              key={relay.id}
              id={`relay-card-${relay.id}`}
              className={`p-4 rounded-lg bg-[#0e162b]/80 border transition-all duration-300 ${
                isActive 
                  ? 'border-[#00c9ff]/50 box-glow-active' 
                  : 'border-[#121d37]'
              } ${isPolaActive ? 'opacity-70' : ''}`}
            >
              {/* Relay label name and editable block */}
              <div className="flex items-center justify-between mb-2 gap-2">
                {isCurrentEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveRename(relay.id);
                    }}
                    className="flex items-center gap-1.5 w-full"
                  >
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="bg-[#090d16] text-white border border-[#00c9ff] rounded px-1.5 py-0.5 text-xs font-sans w-full outline-none focus:ring-1 focus:ring-[#00c9ff]"
                      autoFocus
                      maxLength={30}
                    />
                    <button
                      type="submit"
                      className="p-1 bg-[#122f42] text-[#00c9ff] rounded hover:bg-[#00c9ff]/20"
                      title="Simpan"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1 group w-full overflow-hidden">
                    <span 
                      onClick={() => startEditing(relay.id, relay.name)}
                      className="text-xs text-slate-300 font-sans font-medium uppercase tracking-wide truncate cursor-pointer hover:text-[#00c9ff] leading-none"
                      title="Klik untuk mengubah nama"
                    >
                      {relay.name}
                    </span>
                    <button 
                      onClick={() => startEditing(relay.id, relay.name)}
                      className="opacity-20 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-[#00c9ff] transition-all"
                      title="Ubah nama"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <span className="text-[10px] font-mono text-gray-500 font-bold uppercase shrink-0">
                  CH {relay.id}
                </span>
              </div>

              {/* Toggle switch action */}
              <div className="flex justify-between items-center mt-3">
                <span className={`text-sm font-title font-bold transition-all ${isActive ? 'text-[#00c9ff] text-glow' : 'text-gray-500'}`}>
                  {isActive ? 'ACTIVE / ON' : 'STANDBY / OFF'}
                </span>

                <button
                  onClick={() => onToggle(relay.id)}
                  disabled={isPolaActive}
                  className={`p-1 rounded-full transition-all duration-300 ${
                    isActive 
                      ? 'text-[#00c9ff] bg-[#00c9ff]/10 hover:bg-[#00c9ff]/20' 
                      : 'text-gray-600 bg-gray-800/40 hover:text-gray-400'
                  } ${isPolaActive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  id={`btn-relay-toggle-${relay.id}`}
                >
                  {isActive ? (
                    <ToggleRight className="w-9 h-9" />
                  ) : (
                    <ToggleLeft className="w-9 h-9" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
