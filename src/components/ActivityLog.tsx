/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, Download, ArrowDown } from 'lucide-react';
import { LogEntry } from '../types';

interface ActivityLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Export logs to .txt file
  const handleExport = () => {
    if (logs.length === 0) return;
    
    const text = logs
      .map((log) => {
        let typeLabel = 'INFO';
        if (log.type === 'in') typeLabel = 'RECV';
        if (log.type === 'out') typeLabel = 'PUBL';
        if (log.type === 'error') typeLabel = 'ERR ';
        if (log.type === 'sys') typeLabel = 'SYS ';
        
        return `${log.timestamp} [${typeLabel}] - ${log.message}`;
      })
      .join('\r\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iot_dashboard_log_${new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="activity-log-panel" className="bg-[#0d1527]/90 border border-[#00c9ff]/20 rounded-xl p-5 box-glow transition-all flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[#00c9ff]" />
          <h2 className="font-title text-base font-bold tracking-tight text-[#00c9ff] uppercase">Monitor Log Aktivitas</h2>
        </div>
        
        {/* Log controls */}
        <div className="flex items-center gap-2">
          {/* Scroll Lock */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded text-xs border flex items-center gap-1 transition-all ${
              autoScroll 
                ? 'bg-[#00c9ff]/10 border-[#00c9ff]/30 text-[#00c9ff]' 
                : 'bg-transparent border-gray-800 text-gray-500'
            }`}
            title="Auto scroll ke baris baru"
            id="btn-toggle-auto-scroll"
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            <span>Auto Scroll</span>
          </button>

          {/* Export log */}
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className={`p-1.5 rounded text-xs border flex items-center gap-1 transition-all ${
              logs.length > 0
                ? 'bg-[#12243d] border-[#00c9ff]/30 text-[#00c9ff] hover:bg-[#1b3459]'
                : 'bg-transparent border-zinc-800/80 text-zinc-600 cursor-not-allowed'
            }`}
            title="Download log sebagai file teks"
            id="btn-export-log"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Log</span>
          </button>

          {/* Clear log */}
          <button
            onClick={onClear}
            className="p-1.5 bg-[#1b1a24] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded text-xs flex items-center gap-1 transition-all"
            title="Bersihkan semua log"
            id="btn-clear-log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Log</span>
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div 
        ref={containerRef}
        className="flex-1 bg-[#060a12] border border-[#00c9ff]/10 rounded-lg p-3 font-mono text-xs overflow-y-auto"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic">
            Belum ada aktivitas terekam.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {logs.map((log) => {
              // Color styles based on message tags
              let colorClass = 'text-gray-400'; // Default sys
              if (log.type === 'in') colorClass = 'text-emerald-400';
              if (log.type === 'out') colorClass = 'text-[#00c9ff]';
              if (log.type === 'error') colorClass = 'text-red-400 font-semibold';

              return (
                <div key={log.id} className="leading-relaxed hover:bg-white/5 p-0.5 rounded transition-all flex items-start gap-1">
                  <span className="text-gray-600 select-none shrink-0">[{log.timestamp}]</span>
                  <span className={`${colorClass} break-all`}>{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
