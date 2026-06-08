/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Thermometer, Droplets, Settings, AlertTriangle } from 'lucide-react';
import { SensorHistory } from '../types';

interface SensorPanelProps {
  suhu: number;
  kelembapan: number;
  history: SensorHistory[];
  limitTemp: number;
  setLimitTemp: (val: number) => void;
  pulseSuhu: boolean;
  pulseKelembapan: boolean;
}

export const SensorPanel: React.FC<SensorPanelProps> = ({
  suhu,
  kelembapan,
  history,
  limitTemp,
  setLimitTemp,
  pulseSuhu,
  pulseKelembapan,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempInputValue, setTempInputValue] = useState(limitTemp.toString());

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(tempInputValue);
    if (!isNaN(parsed) && parsed > 0) {
      setLimitTemp(parsed);
      setShowSettings(false);
    }
  };

  const isTempExceeded = suhu > limitTemp;

  // Render SVG Sparkline
  const renderSparkline = (dataPoints: number[], color: string, minVal: number, maxVal: number) => {
    if (dataPoints.length < 2) {
      return (
        <text x="50%" y="50%" textAnchor="middle" fill="#52525b" className="text-xs font-mono">
          Menunggu data...
        </text>
      );
    }

    const width = 280;
    const height = 70;
    const padding = 10;
    
    // Auto-scale axis based on actual input range or standard ranges
    const rangeMin = Math.min(...dataPoints) - 2;
    const rangeMax = Math.max(...dataPoints) + 2;
    const valRange = rangeMax - rangeMin || 1;

    const points = dataPoints.map((val, idx) => {
      const x = padding + (idx / (dataPoints.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - rangeMin) / valRange) * (height - padding * 2);
      return { x, y, val };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // Area path for gradient fill
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg className="w-full h-[75px]" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#18233a" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#18233a" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#18233a" strokeWidth="1" />

        {/* Shaded Area */}
        <path d={areaD} fill={`url(#grad-${color})`} />

        {/* Main Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover/Current Dot */}
        {points.map((p, i) => (
          (i === points.length - 1 || i === 0) && (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 4.5 : 2}
              fill={color}
              className={i === points.length - 1 ? 'animate-pulse' : ''}
              stroke="#0b0f19"
              strokeWidth="1.5"
            />
          )
        ))}
      </svg>
    );
  };

  const suhuData = history.map(h => h.suhu);
  const kelembapanData = history.map(h => h.kelembapan);

  return (
    <div 
      id="sensor-panel" 
      className={`bg-[#0d1527]/90 border ${isTempExceeded ? 'border-red-500/70 danger-flash-active box-glow-danger' : 'border-[#00c9ff]/20'} rounded-xl p-5 box-glow transition-all duration-300`}
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-[#00c9ff]" />
          <h2 className="font-title text-base font-bold tracking-tight text-[#00c9ff] uppercase">Monitor Sensor Realtime</h2>
        </div>
        <div className="flex items-center gap-2">
          {isTempExceeded && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-medium animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Suhu Kritis! &gt; {limitTemp}°C</span>
            </div>
          )}
          <button
            onClick={() => {
              setTempInputValue(limitTemp.toString());
              setShowSettings(!showSettings);
            }}
            className="p-1 px-2 text-xs bg-[#121c32] hover:bg-[#192846] text-[#00c9ff] border border-[#00c9ff]/20 rounded flex items-center gap-1 transition-all"
            title="Set Batas Suhu Notifikasi"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Temp alert input form when open */}
      {showSettings && (
        <form onSubmit={handleSaveLimit} className="mb-4 p-3 rounded-lg bg-[#111a2f] border border-[#00c9ff]/30 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 font-medium">Batas Maksimum Suhu Suara Beep (°C):</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={tempInputValue}
                onChange={(e) => setTempInputValue(e.target.value)}
                className="bg-[#090d16] border border-[#00c9ff]/30 rounded px-2 py-1 text-white font-mono w-24 outline-none focus:border-[#00c9ff]"
              />
              <button
                type="submit"
                className="bg-[#00c9ff] text-black font-semibold px-3 py-1 rounded hover:bg-[#00b5e6] transition-colors"
                id="btn-save-temp-limit"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="bg-[#1b253b] text-gray-300 px-3 py-1 rounded hover:bg-gray-700 transition"
                id="btn-cancel-temp-limit"
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid of 2 Sensors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Suhu Widget */}
        <div className={`p-4 rounded-lg bg-[#0e162b]/80 border ${pulseSuhu ? 'border-[#00c9ff]/80 sensor-ping-dot' : 'border-[#00c9ff]/10'} transition-all duration-300`}>
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Suhu Ruangan</span>
            <Thermometer className={`w-4 h-4 ${isTempExceeded ? 'text-red-500 animate-bounce' : 'text-[#00c9ff]'}`} />
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-title font-black text-glow tracking-tight text-[#00c9ff]">
              {suhu.toFixed(1)}
            </span>
            <span className="text-lg font-title font-medium text-[#00c9ff]">°C</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-500 font-mono mb-1">
              <span>Trend (20 Data Terakhir)</span>
              <span>Min/Max: {suhuData.length ? `${Math.min(...suhuData).toFixed(1)}°C - ${Math.max(...suhuData).toFixed(1)}°C` : 'N/A'}</span>
            </div>
            <div className="bg-[#060a12] rounded p-2 border border-[#00c9ff]/5 h-[80px] flex items-center justify-center">
              {renderSparkline(suhuData, '#00c9ff', 20, 45)}
            </div>
          </div>
        </div>

        {/* Kelembapan Widget */}
        <div className={`p-4 rounded-lg bg-[#0e162b]/80 border ${pulseKelembapan ? 'border-[#00e3ff]/80 sensor-ping-dot' : 'border-[#00c9ff]/10'} transition-all duration-300`}>
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Kelembapan</span>
            <Droplets className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-title font-black text-glow tracking-tight text-[#00e5ff]">
              {kelembapan.toFixed(1)}
            </span>
            <span className="text-lg font-title font-medium text-[#00e5ff]">%</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-500 font-mono mb-1">
              <span>Trend (20 Data Terakhir)</span>
              <span>Min/Max: {kelembapanData.length ? `${Math.min(...kelembapanData).toFixed(1)}% - ${Math.max(...kelembapanData).toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div className="bg-[#060a12] rounded p-2 border border-[#00c9ff]/5 h-[80px] flex items-center justify-center">
              {renderSparkline(kelembapanData, '#00e5ff', 20, 100)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
