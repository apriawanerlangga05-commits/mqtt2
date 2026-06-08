/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Network, Wifi, WifiOff, RefreshCw, Key, ShieldCheck } from 'lucide-react';
import { BrokerStatus } from '../types';

interface BrokerStatusProps {
  brokers: BrokerStatus[];
  flespiToken: string;
  onFlespiTokenChange: (token: string) => void;
  onReconnect: (id: string) => void;
}

export const BrokerStatusPanel: React.FC<BrokerStatusProps> = ({
  brokers,
  flespiToken,
  onFlespiTokenChange,
  onReconnect,
}) => {
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenValue, setTokenValue] = useState(flespiToken);

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    onFlespiTokenChange(tokenValue.trim());
    setShowTokenInput(false);
  };

  return (
    <div id="broker-status-panel" className="bg-[#0d1527]/90 border border-[#00c9ff]/20 rounded-xl p-5 box-glow transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-[#00c9ff]" />
          <h2 className="font-title text-base font-bold tracking-tight text-[#00c9ff] uppercase">Status Broker MQTT</h2>
        </div>
        <button
          onClick={() => {
            setTokenValue(flespiToken);
            setShowTokenInput(!showTokenInput);
          }}
          className={`p-1 px-2.5 text-xs border rounded flex items-center gap-1.5 transition-all ${
            flespiToken 
              ? 'bg-[#12243d] hover:bg-[#1b3459] border-[#00c9ff]/25 text-[#00c9ff]' 
              : 'bg-amber-950/40 border-amber-500/30 text-amber-400 font-bold animate-pulse'
          }`}
          title="Atur token autentikasi Flespi"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{flespiToken ? 'Token Flespi (Set)' : 'Isi Token Flespi'}</span>
        </button>
      </div>

      {showTokenInput && (
        <form onSubmit={handleSaveToken} className="mb-4 p-3 rounded-lg bg-[#111a2f] border border-[#00c9ff]/30 text-xs">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-gray-400 font-medium font-sans">Token Flespi (Password kosong):</label>
              <a 
                href="https://flespi.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#00c9ff] hover:underline"
              >
                Dapatkan Token Flespi
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Masukkan token Flespi Anda di sini..."
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                className="bg-[#090d16] border border-[#00c9ff]/30 rounded px-2 py-1 text-white font-mono flex-1 outline-none focus:border-[#00c9ff] text-xs"
              />
              <button
                type="submit"
                className="bg-[#00c9ff] text-black font-semibold px-3 py-1 rounded hover:bg-[#00b5e6] transition-colors"
                id="btn-save-flespi-token"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setShowTokenInput(false)}
                className="bg-[#1b253b] text-gray-300 px-3 py-1 rounded hover:bg-gray-700 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid of 3 Brokers */}
      <div className="flex flex-col gap-3">
        {brokers.map((broker) => {
          const isConnected = broker.connected;
          
          return (
            <div
              key={broker.id}
              id={`broker-card-${broker.id}`}
              className="p-3.5 rounded-lg bg-[#0e162b]/80 border border-[#16213a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-[#111b35]"
            >
              {/* Info Broker */}
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-950/30' : 'bg-red-950/30'}`}>
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-title text-sm font-semibold text-white tracking-wide uppercase">
                      {broker.name}
                    </span>
                    {broker.id === 'broker3' && (
                      <span className="flex items-center gap-0.5 px-1 py-0.2 bg-fuchsia-950/50 border border-fuchsia-500/30 text-fuchsia-400 rounded text-[9px] font-bold">
                        <ShieldCheck className="w-2.5 h-2.5" /> SECURE AUTH
                      </span>
                    )}
                    {broker.id === 'broker2' && !flespiToken && (
                      <span className="px-1 py-0.2 bg-amber-950/50 border border-amber-500/30 text-amber-400 rounded text-[9px] font-bold">
                        TIDAK AKTIF / BUTUH TOKEN
                      </span>
                    )}
                  </div>
                  
                  {/* Host info */}
                  <div className="text-xs text-gray-400 font-mono mt-0.5">
                    {broker.id === 'broker1' && 'test.mosquitto.org:8081'}
                    {broker.id === 'broker2' && 'mqtt.flespi.io:443'}
                    {broker.id === 'broker3' && 'test.mosquitto.org:8091 (rw/readwrite)'}
                  </div>
                </div>
              </div>

              {/* Status & Reconnect */}
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-gray-800 sm:border-0 pt-2 sm:pt-0">
                {/* Latency */}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 font-mono font-semibold uppercase">Latency Ping</span>
                  <span className={`text-xs font-mono font-bold ${
                    isConnected 
                      ? (broker.latency !== null && broker.latency < 250) 
                        ? 'text-emerald-400' 
                        : 'text-yellow-400'
                      : 'text-gray-600'
                  }`}>
                    {isConnected 
                      ? broker.latency !== null 
                        ? `${broker.latency} ms` 
                        : 'Menghitung...' 
                      : 'Offline'}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className={`text-xs font-mono font-bold uppercase ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                {/* Action trigger manually reset connection */}
                <button
                  onClick={() => onReconnect(broker.id)}
                  className="p-1 px-2.5 hover:bg-[#00c9ff]/10 text-[#00c9ff] border border-[#00c9ff]/20 rounded-md transition duration-200 flex items-center gap-1 text-[11px] font-mono hover:scale-105 active:scale-95"
                  title="Koneksikan Ulang Broker Ini"
                  id={`btn-reconnect-${broker.id}`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Koneksikan</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
