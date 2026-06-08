/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, Sliders, Play, Square } from 'lucide-react';
import { PolaState } from '../types';

interface PolaLampuProps {
  polaState: PolaState;
  onTogglePola1: () => void;
  onTogglePola2: () => void;
  onAllPolaOn: () => void;
  onAllPolaOff: () => void;
}

export const PolaLampu: React.FC<PolaLampuProps> = ({
  polaState,
  onTogglePola1,
  onTogglePola2,
  onAllPolaOn,
  onAllPolaOff,
}) => {
  // Virtual ESP32 LED Indicators simulation
  const [ledSequenceIndex, setLedSequenceIndex] = useState(0);
  const [strobeState, setStrobeState] = useState(false);

  // Pola 1: Left to right sequencer interval (e.g. 0 -> 1 -> 2 -> 3)
  useEffect(() => {
    let intervalId: any = null;
    if (polaState.pola1) {
      intervalId = setInterval(() => {
        setLedSequenceIndex((prev) => (prev + 1) % 4);
      }, 250); // seq speed
    } else {
      setLedSequenceIndex(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polaState.pola1]);

  // Pola 2: Alternating blinking (odd & even dots alternately)
  useEffect(() => {
    let intervalId: any = null;
    if (polaState.pola2) {
      intervalId = setInterval(() => {
        setStrobeState((prev) => !prev);
      }, 300); // alternating speed
    } else {
      setStrobeState(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polaState.pola2]);

  return (
    <div id="pola-lampu" className="bg-[#0d1527]/90 border border-[#00c9ff]/20 rounded-xl p-5 box-glow transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00c9ff]" />
          <h2 className="font-title text-base font-bold tracking-tight text-[#00c9ff] uppercase">Pola Lampu Automasi</h2>
        </div>

        {/* Global Action Switches */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAllPolaOn}
            className="px-3 py-1 text-xs font-semibold bg-[#122c42] hover:bg-[#00c9ff] hover:text-black border border-[#00c9ff]/45 text-[#00c9ff] rounded-md transition-all duration-200"
            id="btn-all-pola-on"
          >
            Semua Pola ON
          </button>
          <button
            onClick={onAllPolaOff}
            className="px-3 py-1 text-xs font-semibold bg-[#1b1e2c] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-md transition-all duration-200"
            id="btn-all-pola-off"
          >
            Semua Pola OFF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pola 1 Switch Box */}
        <div className={`p-4 rounded-lg bg-[#0e162b]/80 border transition-all duration-300 ${polaState.pola1 ? 'border-[#00c9ff]/50 box-glow-active' : 'border-[#121d37]'}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xs font-title font-bold text-gray-300 uppercase tracking-wide">Pola 1</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Animasi dot berpindah bergantian kiri ke kanan.</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${polaState.pola1 ? 'bg-[#00c9ff]/15 text-[#00c9ff]' : 'bg-gray-800 text-gray-500'}`}>
              {polaState.pola1 ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          
          <button
            onClick={onTogglePola1}
            className={`w-full py-2.5 px-4 mt-3 rounded-md text-xs font-title font-semibold flex items-center justify-center gap-2 transition-all duration-200 uppercase ${
              polaState.pola1 
                ? 'bg-[#00c9ff] text-black hover:bg-[#00b5e6]' 
                : 'bg-[#121d37] text-[#00c9ff] hover:bg-[#1b2b4d] border border-[#00c9ff]/10'
            }`}
            id="btn-toggle-pola-1"
          >
            {polaState.pola1 ? (
              <>
                <Square className="w-3.5 h-3.5 fill-black" /> Stop Pola 1
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Jalankan Pola 1
              </>
            )}
          </button>
        </div>

        {/* Pola 2 Switch Box */}
        <div className={`p-4 rounded-lg bg-[#0e162b]/80 border transition-all duration-300 ${polaState.pola2 ? 'border-[#00c9ff]/50 box-glow-active' : 'border-[#121d37]'}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xs font-title font-bold text-gray-300 uppercase tracking-wide">Pola 2</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Animasi selang-seling — dot genap & ganjil bergantian.</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${polaState.pola2 ? 'bg-[#00c9ff]/15 text-[#00c9ff]' : 'bg-gray-800 text-gray-500'}`}>
              {polaState.pola2 ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <button
            onClick={onTogglePola2}
            className={`w-full py-2.5 px-4 mt-3 rounded-md text-xs font-title font-semibold flex items-center justify-center gap-2 transition-all duration-200 uppercase ${
              polaState.pola2 
                ? 'bg-[#00c9ff] text-black hover:bg-[#00b5e6]' 
                : 'bg-[#121d37] text-[#00c9ff] hover:bg-[#1b2b4d] border border-[#00c9ff]/10'
            }`}
            id="btn-toggle-pola-2"
          >
            {polaState.pola2 ? (
              <>
                <Square className="w-3.5 h-3.5 fill-black" /> Stop Pola 2
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Jalankan Pola 2
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Virtual LED Diodes feedback panel */}
      <div className="bg-[#070a12] rounded-lg p-4 border border-[#00c9ff]/10">
        <div className="flex items-center gap-1 text-[11px] font-mono text-gray-500 font-semibold mb-3 tracking-wider uppercase">
          <Sliders className="w-3.5 h-3.5 text-[#00c9ff]" />
          <span>Monitor Terminal Output LED Virtual (ESP32)</span>
        </div>
        <div className="flex items-center justify-around py-3 rounded bg-[#0b101c] border border-[#00c9ff]/5">
          {[1, 2, 3, 4].map((id, index) => {
            // Determine if LED is visually simulated ON
            let isLedOn = false;
            if (polaState.pola1) {
              isLedOn = ledSequenceIndex === index;
            } else if (polaState.pola2) {
              // Alternating blink: if strobeState is true, active odd indices (LED 1 & 3), else active even indices (LED 2 & 4)
              isLedOn = (index % 2 === 0) ? strobeState : !strobeState;
            }

            return (
              <div key={id} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 font-bold">LED {id}</span>
                <div 
                  className={`w-7.5 h-7.5 rounded-full border transition-all duration-150 flex items-center justify-center ${
                    isLedOn 
                      ? 'bg-gradient-to-b from-[#00f0ff] to-[#0092b3] border-[#00c9ff] shadow-[0_0_15px_#00c9ff]' 
                      : 'bg-zinc-900 border-zinc-700/80'
                  }`}
                  id={`virtual-led-${id}`}
                >
                  <div className={`w-2 h-2 rounded-full ${isLedOn ? 'bg-white opacity-90' : 'bg-[#0f172a]'}`}></div>
                </div>
                <span className={`text-[10px] font-mono font-semibold transition-all ${isLedOn ? 'text-[#00c9ff]' : 'text-gray-600'}`}>
                  {isLedOn ? 'ON' : 'OFF'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
