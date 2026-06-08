/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, AlertCircle, HelpCircle, Volume2 } from 'lucide-react';
import { LogEntry } from '../types';

interface VoiceCommandControllerProps {
  currentSuhu: number;
  currentKelembapan: number;
  onExecuteCommand: (commandCode: string, speakSuccessMsg: string) => void;
  onClearLogs: () => void;
  addLog: (message: string, type: 'in' | 'out' | 'error' | 'sys') => void;
}

export const VoiceCommandController: React.FC<VoiceCommandControllerProps> = ({
  currentSuhu,
  currentKelembapan,
  onExecuteCommand,
  onClearLogs,
  addLog,
}) => {
  const [micPermissionState, setMicPermissionState] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isListeningUI, setIsListeningUI] = useState(false);
  const [lastSpeechRecognized, setLastSpeechRecognized] = useState<string>('');
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const isListening = useRef(false);
  const permissionGranted = useRef(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition once
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      addLog('Web Speech API (Speech Recognition) tidak didukung di browser ini. Sila hubungi Chrome atau Edge.', 'error');
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'id-ID'; // Indonesian Language

    // Handle results
    rec.onresult = (event: any) => {
      const resultIndex = event.resultIndex;
      const transcript = event.results[resultIndex][0].transcript;
      if (transcript) {
        processVoiceTranscript(transcript);
      }
    };

    // Correct error handlers based on CRITICAL REPAIR instructions
    rec.onerror = (event: any) => {
      const err = event.error;
      
      // Error aborted -> JANGAN di-log sama sekali, cukup return
      if (err === 'aborted') {
        return;
      }

      // Error not-allowed atau audio-capture -> set permissionGranted false, setIsListening false, log error SEKALI, STOP total jangan restart
      if (err === 'not-allowed' || err === 'audio-capture') {
        permissionGranted.current = false;
        isListening.current = false;
        setIsListeningUI(false);
        setMicPermissionState('denied');
        addLog(`Akses mikrofon diblokir atau gagal: ${err}. Mohon izinkan mikrofon di browser Anda.`, 'error');
        return;
      }

      // Error lain -> log tapi STOP restart
      addLog(`Kesalahan Voice Recognition: ${err}. Menghentikan sementara...`, 'error');
      isListening.current = false;
      setIsListeningUI(false);
    };

    // Handle end of continuous recognition
    rec.onend = () => {
      // Restart HANYA jika isListening.current === true DAN permissionGranted.current === true
      if (isListening.current && permissionGranted.current) {
        try {
          rec.start();
        } catch (e) {
          // In case start fails to trigger
          console.error('Gagal me-restart speech recognition:', e);
        }
      } else {
        isListening.current = false;
        setIsListeningUI(false);
      }
    };

    recognitionRef.current = rec;

    // Check permissions on page host mount
    const checkMicrophonePermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'microphone' as any });
          if (status.state === 'granted') {
            permissionGranted.current = true;
            setMicPermissionState('granted');
          } else if (status.state === 'denied') {
            permissionGranted.current = false;
            setMicPermissionState('denied');
          } else {
            permissionGranted.current = false;
            setMicPermissionState('prompt');
          }

          status.onchange = () => {
            if (status.state === 'granted') {
              permissionGranted.current = true;
              setMicPermissionState('granted');
            } else if (status.state === 'denied') {
              permissionGranted.current = false;
              setMicPermissionState('denied');
              isListening.current = false;
              setIsListeningUI(false);
            } else {
              setMicPermissionState('prompt');
            }
          };
        }
      } catch (e) {
        console.warn('Browser tidak medukung permissions query API, memakai interaksi default', e);
      }
    };

    checkMicrophonePermission();

    return () => {
      // Cleanup
      isListening.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Text To Speech Utility (id-ID)
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop talking first
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('TTS SpeechSynthesis tidak didukung di browser ini.');
    }
  };

  // Process Indonesian voice commands
  const processVoiceTranscript = (rawTranscript: string) => {
    const textClean = rawTranscript.toLowerCase().trim();
    setLastSpeechRecognized(rawTranscript);
    addLog(`Mendengar Perintah Suara: "${rawTranscript}"`, 'in');

    // Define commands matching lists
    const cmdAllMati = ["semua mati", "matikan semua", "shutdown"];
    
    // RELAYS ON/OFF lists
    const cmdAllRelayOn = [
      "semua relay nyala", "hidupkan semua relay", "nyalakan semua relay", "semua relay on", 
      "aktifkan semua relay", "relay semua nyala", "semua relay hidup", "hidupkan seluruh relay", 
      "nyalakan seluruh relay", "aktifkan seluruh relay", "seluruh relay nyala", "semua relay aktif", 
      "relay on semua", "on semua relay", "semua on", "nyalain semua relay", "on kan semua relay"
    ];
    const cmdAllRelayOff = [
      "semua relay mati", "matikan semua relay", "semua relay off", "nonaktifkan semua relay", 
      "relay semua mati", "semua relay padam", "matikan seluruh relay", "nonaktifkan seluruh relay", 
      "seluruh relay mati", "semua relay nonaktif", "padamkan semua relay", "relay off semua", 
      "off semua relay", "semua off", "matiin semua relay", "off kan semua relay"
    ];

    const cmdRelay1On = ["relay satu nyala", "hidupkan relay satu", "relay satu on", "relay 1 nyala", "relay 1 on", "aktifkan relay satu", "nyalakan relay satu", "relay pertama nyala"];
    const cmdRelay1Off = ["relay satu mati", "matikan relay satu", "relay satu off", "relay 1 mati", "relay 1 off", "nonaktifkan relay satu", "padamkan relay satu", "relay pertama mati"];
    
    const cmdRelay2On = ["relay dua nyala", "hidupkan relay dua", "relay dua on", "relay 2 nyala", "relay 2 on", "aktifkan relay dua", "nyalakan relay dua", "relay kedua nyala"];
    const cmdRelay2Off = ["relay dua mati", "matikan relay dua", "relay dua off", "relay 2 mati", "relay 2 off", "nonaktifkan relay dua", "padamkan relay dua", "relay kedua mati"];
    
    const cmdRelay3On = ["relay tiga nyala", "hidupkan relay tiga", "relay tiga on", "relay 3 nyala", "relay 3 on", "aktifkan relay tiga", "nyalakan relay tiga", "relay ketiga nyala"];
    const cmdRelay3Off = ["relay tiga mati", "matikan relay tiga", "relay tiga off", "relay 3 mati", "relay 3 off", "nonaktifkan relay tiga", "padamkan relay tiga", "relay ketiga mati"];
    
    const cmdRelay4On = ["relay empat nyala", "hidupkan relay empat", "relay empat on", "relay 4 nyala", "relay 4 on", "aktifkan relay empat", "nyalakan relay empat", "relay keempat nyala"];
    const cmdRelay4Off = ["relay empat mati", "matikan relay empat", "relay empat off", "relay 4 mati", "relay 4 off", "nonaktifkan relay empat", "padamkan relay empat", "relay keempat mati"];

    // LIGHT PATTERNS ON/OFF lists
    const cmdAllPolaOn = ["semua pola nyala", "hidupkan semua pola", "aktifkan semua pola", "nyalakan semua pola", "semua pola on", "semua pola aktif", "aktifkan seluruh pola", "hidupkan seluruh pola", "seluruh pola nyala", "pola on semua", "on semua pola", "nyalain semua pola", "hidupkan pola semua", "pola semua on", "on kan semua pola"];
    const cmdAllPolaOff = ["matikan semua pola", "stop pola", "semua pola mati", "nonaktifkan semua pola", "semua pola off", "matikan seluruh pola", "stop semua pola", "nonaktifkan seluruh pola", "seluruh pola mati", "padamkan semua pola", "pola off semua", "off semua pola", "matiin semua pola", "matikan pola semua", "hentikan semua pola"];
    
    const cmdPola1On = ["hidupkan pola satu", "pola satu nyala", "aktifkan pola satu", "pola 1 nyala", "nyalakan pola satu", "pola satu on", "pola 1 on", "jalankan pola satu"];
    const cmdPola1Off = ["matikan pola satu", "stop pola satu", "pola satu mati", "pola 1 mati", "pola 1 off", "nonaktifkan pola satu", "hentikan pola satu"];
    
    const cmdPola2On = ["hidupkan pola dua", "pola dua nyala", "aktifkan pola dua", "pola 2 nyala", "nyalakan pola dua", "pola dua on", "pola 2 on", "jalankan pola dua"];
    const cmdPola2Off = ["matikan pola dua", "stop pola dua", "pola dua mati", "pola 2 mati", "pola 2 off", "nonaktifkan pola dua", "hentikan pola dua"];

    // SENSOR QUERY lists
    const qSuhu = ["tampilkan suhu", "berapa suhu", "cek suhu", "baca suhu", "suhu sekarang", "suhu saat ini"];
    const qKelembapan = ["tampilkan kelembapan", "berapa kelembapan", "cek kelembapan", "kelembapan sekarang"];
    const qSemuaSensor = ["tampilkan sensor", "cek sensor", "baca sensor", "status sensor", "info sensor"];

    // CUSTOM COMMANDS lists
    const cmdClearLog = ["bersihkan log", "hapus log", "clear log"];

    // Helper functions to check matching
    const includesAny = (target: string, phrases: string[]) => {
      return phrases.some(p => target.includes(p));
    };

    // 1. ALL SHUTDOWN / SEMUA MATI
    if (includesAny(textClean, cmdAllMati)) {
      onExecuteCommand('SHUTDOWN', 'Semua perangkat dimatikan');
      addLog('Perintah Suara Berhasil: SHUTDOWN', 'out');
      speakText('Semua perangkat dimatikan');
      return;
    }

    // 2. CLEAR LOG
    if (includesAny(textClean, cmdClearLog)) {
      onClearLogs();
      addLog('Perintah Suara Berhasil: BERSIHKAN LOG', 'sys');
      speakText('Log dibersihkan');
      return;
    }

    // 3. SENSORS QUERIES
    if (includesAny(textClean, qSemuaSensor)) {
      const msg = `Suhu ${currentSuhu.toFixed(1)} derajat, kelembapan ${currentKelembapan.toFixed(1)} persen.`;
      addLog(`Asisten Suara: "${msg}"`, 'sys');
      speakText(msg);
      return;
    }
    if (includesAny(textClean, qSuhu)) {
      const msg = `Suhu saat ini ${currentSuhu.toFixed(1)} derajat celcius.`;
      addLog(`Asisten Suara: "${msg}"`, 'sys');
      speakText(msg);
      return;
    }
    if (includesAny(textClean, qKelembapan)) {
      const msg = `Kelembapan saat ini ${currentKelembapan.toFixed(1)} persen.`;
      addLog(`Asisten Suara: "${msg}"`, 'sys');
      speakText(msg);
      return;
    }

    // 4. MASTER RELAY CONTROLS
    if (includesAny(textClean, cmdAllRelayOn)) {
      onExecuteCommand('ALL_RELAYS_ON', 'Semua relay dinyalakan');
      addLog('Perintah Suara Berhasil: SEMUA RELAY ON', 'out');
      speakText('Semua relay dinyalakan');
      return;
    }
    if (includesAny(textClean, cmdAllRelayOff)) {
      onExecuteCommand('ALL_RELAYS_OFF', 'Semua relay dimatikan');
      addLog('Perintah Suara Berhasil: SEMUA RELAY OFF', 'out');
      speakText('Semua relay dimatikan');
      return;
    }

    // 5. INDIVIDUAL RELAYS ON
    if (includesAny(textClean, cmdRelay1On)) {
      onExecuteCommand('RELAY_1_ON', 'Relay satu dinyalakan');
      addLog('Perintah Suara Berhasil: RELAY 1 ON', 'out');
      speakText('Relay satu dinyalakan');
      return;
    }
    if (includesAny(textClean, cmdRelay2On)) {
      onExecuteCommand('RELAY_2_ON', 'Relay dua dinyalakan');
      addLog('Perintah Suara Berhasil: RELAY 2 ON', 'out');
      speakText('Relay dua dinyalakan');
      return;
    }
    if (includesAny(textClean, cmdRelay3On)) {
      onExecuteCommand('RELAY_3_ON', 'Relay tiga dinyalakan');
      addLog('Perintah Suara Berhasil: RELAY 3 ON', 'out');
      speakText('Relay tiga dinyalakan');
      return;
    }
    if (includesAny(textClean, cmdRelay4On)) {
      onExecuteCommand('RELAY_4_ON', 'Relay empat dinyalakan');
      addLog('Perintah Suara Berhasil: RELAY 4 ON', 'out');
      speakText('Relay empat dinyalakan');
      return;
    }

    // 6. INDIVIDUAL RELAYS OFF
    if (includesAny(textClean, cmdRelay1Off)) {
      onExecuteCommand('RELAY_1_OFF', 'Relay satu dimatikan');
      addLog('Perintah Suara Berhasil: RELAY 1 OFF', 'out');
      speakText('Relay satu dimatikan');
      return;
    }
    if (includesAny(textClean, cmdRelay2Off)) {
      onExecuteCommand('RELAY_2_OFF', 'Relay dua dimatikan');
      addLog('Perintah Suara Berhasil: RELAY 2 OFF', 'out');
      speakText('Relay dua dimatikan');
      return;
    }
    if (includesAny(textClean, cmdRelay3Off)) {
      onExecuteCommand('RELAY_3_OFF', 'Relay tiga dimatikan');
      addLog('Perintah Suara Berhasil: RELAY 3 OFF', 'out');
      speakText('Relay tiga dimatikan');
      return;
    }
    if (includesAny(textClean, cmdRelay4Off)) {
      onExecuteCommand('RELAY_4_OFF', 'Relay empat dimatikan');
      addLog('Perintah Suara Berhasil: RELAY 4 OFF', 'out');
      speakText('Relay empat dimatikan');
      return;
    }

    // 7. LIGHT PATTERNS MASTER
    if (includesAny(textClean, cmdAllPolaOn)) {
      onExecuteCommand('ALL_POLA_ON', 'Semua pola dinyalakan');
      addLog('Perintah Suara Berhasil: SEMUA POLA ON', 'out');
      speakText('Semua pola dinyalakan');
      return;
    }
    if (includesAny(textClean, cmdAllPolaOff)) {
      onExecuteCommand('ALL_POLA_OFF', 'Semua pola dimatikan');
      addLog('Perintah Suara Berhasil: SEMUA POLA OFF', 'out');
      speakText('Semua pola dimatikan');
      return;
    }

    // 8. DOUBLE-POLA PATTERNS INDIVIDUAL
    if (includesAny(textClean, cmdPola1On)) {
      onExecuteCommand('POLA_1_ON', 'Pola satu dinyalakan, pola kiri ke kanan aktif');
      addLog('Perintah Suara Berhasil: POLA 1 ON', 'out');
      speakText('Pola satu dinyalakan, pola kiri ke kanan aktif');
      return;
    }
    if (includesAny(textClean, cmdPola1Off)) {
      onExecuteCommand('POLA_1_OFF', 'Pola satu dimatikan');
      addLog('Perintah Suara Berhasil: POLA 1 OFF', 'out');
      speakText('Pola satu dimatikan');
      return;
    }
    if (includesAny(textClean, cmdPola2On)) {
      onExecuteCommand('POLA_2_ON', 'Pola dua dinyalakan, pola strobe aktif');
      addLog('Perintah Suara Berhasil: POLA 2 ON', 'out');
      speakText('Pola dua dinyalakan, pola strobe aktif');
      return;
    }
    if (includesAny(textClean, cmdPola2Off)) {
      onExecuteCommand('POLA_2_OFF', 'Pola dua dimatikan');
      addLog('Perintah Suara Berhasil: POLA 2 OFF', 'out');
      speakText('Pola dua dimatikan');
      return;
    }

    addLog(`Perintah Tidak Dikenal: "${rawTranscript}". Klik 'Panduan Perintah' untuk melihat daftar perintah.`, 'sys');
  };

  // Toggle microphone recording with Media Device checks
  const toggleMic = async () => {
    if (!recognitionRef.current) {
      addLog('Speech Recognition tidak siap di browser ini.', 'error');
      return;
    }

    if (isListening.current) {
      recognitionRef.current.stop();
      isListening.current = false;
      setIsListeningUI(false);
      addLog('Voice command dinonaktifkan.', 'sys');
      return;
    }

    try {
      addLog('Meminta izin akses mikrofon...', 'sys');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionGranted.current = true;
      setMicPermissionState('granted');
      
      isListening.current = true;
      setIsListeningUI(true);
      recognitionRef.current.start();
      addLog('Izin mikrofon diberikan. Voice command Bahasa Indonesia aktif!', 'sys');
      speakText('Kontrol suara aktif');
    } catch (err) {
      permissionGranted.current = false;
      setMicPermissionState('denied');
      addLog('Izin mikrofon ditolak atau diblokir browser. Silakan aktifkan di pengaturan web.', 'error');
    }
  };

  return (
    <div id="voice-controller-section" className="flex flex-col items-center gap-4 mt-2 mb-4 shrink-0">
      {/* Mic Status Banner Info */}
      {micPermissionState === 'denied' && (
        <div className="w-full max-w-2xl px-4 py-2.5 rounded-lg bg-red-950/70 border border-red-500/30 text-red-200 text-xs flex items-start gap-2 animate-bounce">
          <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong>Mikrofon Diblokir.</strong> Klik ikon gembok/kunci di sebelah kiri address bar halaman → izinkan akses Mikrofon (Microphone: Allow) → Reload halaman ini untuk mengaktifkan kembali.
          </div>
        </div>
      )}

      {/* Mic Controller UI Panel Bar */}
      <div className="flex flex-col items-center">
        {/* Connection status tag */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className={`w-2 h-2 rounded-full ${
            isListeningUI && permissionGranted.current
              ? 'bg-emerald-400 animate-ping'
              : micPermissionState === 'denied'
                ? 'bg-red-500'
                : 'bg-yellow-500'
          }`}></span>
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-gray-400">
            {isListeningUI && permissionGranted.current ? (
              <span className="text-emerald-400">Mikrofon: Aktif (Mendengarkan...)</span>
            ) : micPermissionState === 'denied' ? (
              <span className="text-red-400">Mikrofon: Belum Diizinkan / Diblokir</span>
            ) : (
              <span className="text-yellow-400">Mikrofon: Siap (Minta Izin)</span>
            )}
          </span>
        </div>

        {/* Large Centered Circular Pulse Button */}
        <button
          onClick={toggleMic}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListeningUI && permissionGranted.current
              ? 'bg-[#00c9ff] text-black voice-active-pulse font-bold'
              : 'bg-[#15233d] hover:bg-[#1f3459] text-[#00c9ff] border-2 border-[#00c9ff]/40'
          }`}
          title="Klik untuk aktifkan perintah suara"
          id="btn-voice-mic-main"
        >
          {isListeningUI && permissionGranted.current ? (
            <Mic className="w-9 h-9 animate-bounce" />
          ) : (
            <MicOff className="w-9 h-9 text-gray-400" />
          )}

          {/* Virtual Waves */}
          {isListeningUI && permissionGranted.current && (
            <>
              <span className="absolute inset-0 rounded-full border border-[#00c9ff] animate-ping opacity-30"></span>
              <span className="absolute -inset-2 rounded-full border border-[#00c9ff]/50 animate-pulse opacity-10"></span>
            </>
          )}
        </button>

        {/* Real-time recognized bubble */}
        {isListeningUI && lastSpeechRecognized && (
          <div className="mt-3 px-4 py-2 rounded-full bg-[#112037] border border-[#00c9ff]/30 text-xs font-medium text-[#00c9ff] flex items-center gap-2 max-w-md text-center shadow-lg animate-fade-in">
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#00c9ff]" />
            <span className="italic">"{lastSpeechRecognized}"</span>
          </div>
        )}

        {/* Cheatsheet activator */}
        <button
          onClick={() => setShowCheatsheet(!showCheatsheet)}
          className="mt-3.5 text-xs text-[#00c9ff]/70 hover:text-[#00c9ff] flex items-center gap-1 font-title font-medium tracking-wide uppercase transition-all"
          id="btn-toggle-cheatsheet"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showCheatsheet ? 'Sembunyikan Panduan' : 'Lihat Panduan Perintah Suara'}</span>
        </button>
      </div>

      {/* Cheatsheet Grid UI Panel Block */}
      {showCheatsheet && (
        <div className="w-full max-w-4xl p-5 rounded-xl bg-[#090e1b] border border-[#00c9ff]/25 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in text-xs font-sans">
          {/* Master Channel */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-title font-bold text-[#00c9ff] uppercase pb-1 border-b border-[#00c9ff]/15">Perintah Relay</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• <strong>Semua Relay ON:</strong> <span className="text-[#00c9ff] font-mono select-all">"nyalakan semua relay"</span> atau <span className="text-[#00c9ff] font-mono select-all">"semua relay hidup"</span></li>
              <li>• <strong>Semua Relay OFF:</strong> <span className="text-[#00c9ff] font-mono select-all">"matikan semua relay"</span> atau <span className="text-[#00c9ff] font-mono select-all">"semua relay mati"</span></li>
              <li>• <strong>Relay 1 ON / OFF:</strong> <span className="text-[#00c9ff] font-mono">"relay satu nyala"</span> / <span className="text-[#00c9ff] font-mono">"relay 1 mati"</span></li>
              <li>• <strong>Relay 2 ON / OFF:</strong> <span className="text-[#00c9ff] font-mono">"relay dua nyala"</span> / <span className="text-[#00c9ff] font-mono">"relay 2 mati"</span></li>
              <li>• <strong>Relay 3 ON / OFF:</strong> <span className="text-[#00c9ff] font-mono">"relay tiga nyala"</span> / <span className="text-[#00c9ff] font-mono">"relay 3 mati"</span></li>
              <li>• <strong>Relay 4 ON / OFF:</strong> <span className="text-[#00c9ff] font-mono">"relay empat nyala"</span> / <span className="text-[#00c9ff] font-mono">"relay 4 mati"</span></li>
            </ul>
          </div>

          {/* Patterns and Global shutoff */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-title font-bold text-[#00c9ff] uppercase pb-1 border-b border-[#00c9ff]/15">Perintah Pola & Global</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• <strong>Semua Pola ON:</strong> <span className="text-[#00c9ff] font-mono">"nyalakan semua pola"</span></li>
              <li>• <strong>Semua Pola OFF:</strong> <span className="text-[#00c9ff] font-mono">"matikan seluruh pola"</span></li>
              <li>• <strong>Pola 1 (Left to Right) ON / OFF:</strong> <span className="text-[#00c9ff] font-mono">"pola satu nyala"</span> / <span className="text-[#00c9ff] font-mono">"stop pola satu"</span></li>
              <li>• <strong>Pola 2 (Strobe) ON / OFF:</strong> <span className="text-[#00c9ff] font-mono">"pola dua nyala"</span> / <span className="text-[#00c9ff] font-mono">"matikan pola dua"</span></li>
              <li>• <strong>Semua Mati:</strong> <span className="text-[#00c9ff] font-mono select-all">"semua mati"</span> atau <span className="text-[#00c9ff] font-mono select-all">"shutdown"</span> <span className="text-gray-500">(Relay + Pola OFF)</span></li>
            </ul>
          </div>

          {/* Sensors queries and tools */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-title font-bold text-[#00c9ff] uppercase pb-1 border-b border-[#00c9ff]/15">Perintah Sensor & Log</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• <strong>Informasi Suhu:</strong> <span className="text-[#00c9ff] font-mono">"baca suhu"</span> atau <span className="text-[#00c9ff] font-mono">"suhu sekarang"</span></li>
              <li>• <strong>Informasi Kelembapan:</strong> <span className="text-[#00c9ff] font-mono">"tampilkan kelembapan"</span> atau <span className="text-[#00c9ff] font-mono">"berapa kelembapan"</span></li>
              <li>• <strong>Semua Info Sensor:</strong> <span className="text-[#00c9ff] font-mono">"cek sensor"</span> atau <span className="text-[#00c9ff] font-mono">"baca sensor"</span></li>
              <li>• <strong>Bersihkan Log Dashboard:</strong> <span className="text-[#00c9ff] font-mono select-all">"bersihkan log"</span> atau <span className="text-[#00c9ff] font-mono select-all">"clear log"</span></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
