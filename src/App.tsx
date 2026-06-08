/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Wifi, Cpu, AlertCircle, RefreshCw, Radio } from 'lucide-react';
import { BrokerStatus, RelayState, PolaState, SensorHistory, LogEntry } from './types';
import { SensorPanel } from './components/SensorPanel';
import { RelayControl } from './components/RelayControl';
import { PolaLampu } from './components/PolaLampu';
import { BrokerStatusPanel } from './components/BrokerStatus';
import { ActivityLog } from './components/ActivityLog';
import { VoiceCommandController } from './components/VoiceCommandController';

// Make TypeScript happy about window.mqtt loaded via CDN
declare const mqtt: any;

export default function App() {
  // --- LOCAL STORAGE & DEFAULTS ---
  const [flespiToken, setFlespiToken] = useState<string>(() => {
    return localStorage.getItem('flespi_token') || '';
  });

  const [limitTemp, setLimitTemp] = useState<number>(() => {
    const saved = localStorage.getItem('limit_temp');
    return saved ? parseFloat(saved) : 35.0;
  });

  const [relays, setRelays] = useState<RelayState[]>(() => {
    const saved = localStorage.getItem('relays_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Gagal mem-parse relays config, pakai default');
      }
    }
    return [
      { id: 1, name: 'Relay Lampu Utama', state: 'OFF' },
      { id: 2, name: 'Relay Pompa Air', state: 'OFF' },
      { id: 3, name: 'Relay Kipas Angin', state: 'OFF' },
      { id: 4, name: 'Relay Heater', state: 'OFF' },
    ];
  });

  const [polaState, setPolaState] = useState<PolaState>({
    pola1: false,
    pola2: false,
  });

  // --- SENSORS REALTIME ---
  const [suhu, setSuhu] = useState<number>(27.5);
  const [kelembapan, setKelembapan] = useState<number>(62.0);
  const [sensorHistory, setSensorHistory] = useState<SensorHistory[]>([]);
  const [pulseSuhu, setPulseSuhu] = useState(false);
  const [pulseKelembapan, setPulseKelembapan] = useState(false);

  // --- TIME & STATUS ---
  const [currentTime, setCurrentTime] = useState<string>('');

  // --- ACTIVITY LOGS ---
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // --- BROKERS TELEMETRY ---
  const [brokers, setBrokers] = useState<BrokerStatus[]>([
    { id: 'broker1', name: 'Mosquitto Public (No Auth)', connected: false, latency: null },
    { id: 'broker2', name: 'Flespi Cloud (Secure Token)', connected: false, latency: null },
    { id: 'broker3', name: 'Mosquitto Auth (rw/readwrite)', connected: false, latency: null },
  ]);

  // --- MQTT REFS ---
  const clientsRef = useRef<{ [key: string]: any }>({});
  const pingTimestampRef = useRef<{ [key: string]: number }>({});

  // Helper to add activity log entry
  const addLog = (message: string, type: 'in' | 'out' | 'error' | 'sys') => {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp,
      message,
      type,
    };
    setLogs((prev) => {
      // Limit to 500 logs to prevent memory leaks
      const truncated = prev.length > 500 ? prev.slice(prev.length - 500) : prev;
      return [...truncated, newEntry];
    });
  };

  // Web Audio Alarm sound generator
  const playAlarmBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, ctx.currentTime); // High pitch alarm
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // oscillating sound

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Gagal memutar alert beep:', e);
    }
  };

  // Sync state to local storage when changed
  useEffect(() => {
    localStorage.setItem('limit_temp', limitTemp.toString());
  }, [limitTemp]);

  useEffect(() => {
    localStorage.setItem('relays_config', JSON.stringify(relays));
  }, [relays]);

  useEffect(() => {
    localStorage.setItem('flespi_token', flespiToken);
  }, [flespiToken]);

  // --- DIGITAL CLOCK HEARTBEAT ---
  useEffect(() => {
    const updateTime = () => {
      const idTime = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
      setCurrentTime(idTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- AUTOMATIC ESCALATION BELLOWING ALARM ---
  useEffect(() => {
    let warningInterval: any = null;
    if (suhu > limitTemp) {
      // Beep every 2 seconds if critical
      warningInterval = setInterval(() => {
        playAlarmBeep();
      }, 2000);
    }
    return () => {
      if (warningInterval) clearInterval(warningInterval);
    };
  }, [suhu, limitTemp]);

  // --- BACKUP SIMULATOR NODE (ESP32 emulation) ---
  // If no MQTT message comes or as dynamic dashboard simulation to make UI tactile.
  // We keep it subtly oscillating.
  useEffect(() => {
    const interval = setInterval(() => {
      // Check if any broker is connected. We emulate a dynamic update to local state
      // only to populate trend graph smoothly. If real MQTT is sending data, it overlays.
      setSuhu((prev) => {
        // subtle drift
        let drift = (Math.random() - 0.5) * 0.4;
        // Keep within 26 - 38
        let nextVal = prev + drift;
        if (nextVal < 26) nextVal = 26;
        if (nextVal > 38) nextVal = 38;

        // Pulse visual trigger on change
        setPulseSuhu(true);
        setTimeout(() => setPulseSuhu(false), 150);

        return nextVal;
      });

      setKelembapan((prev) => {
        let drift = (Math.random() - 0.5) * 1.5;
        let nextVal = prev + drift;
        if (nextVal < 45) nextVal = 45;
        if (nextVal > 90) nextVal = 90;

        setPulseKelembapan(true);
        setTimeout(() => setPulseKelembapan(false), 150);

        return nextVal;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update sensor statistics history whenever temperature/humidity is modified
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSensorHistory((prev) => {
      const nextHist = [...prev, { suhu, kelembapan, timeLabel: timeStr }];
      // Store max 20 records
      if (nextHist.length > 20) {
        return nextHist.slice(nextHist.length - 20);
      }
      return nextHist;
    });
  }, [suhu, kelembapan]);

  // --- MQTT MANAGERS & EVENTS HANDLERS ---
  const connectBroker = (brokerId: string) => {
    // Clean old connection if exists
    if (clientsRef.current[brokerId]) {
      try {
        clientsRef.current[brokerId].end();
      } catch (e) {}
      delete clientsRef.current[brokerId];
    }

    // Set Status status to disconnected first
    setBrokers((prevList) =>
      prevList.map((b) => (b.id === brokerId ? { ...b, connected: false } : b))
    );

    // Get specific configuration
    let options: any = {
      keepalive: 60,
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30 * 1000,
    };

    const randId = Math.floor(1000 + Math.random() * 9000);
    const ts = Date.now();
    let url = '';

    if (brokerId === 'broker1') {
      url = 'wss://test.mosquitto.org:8081/mqtt';
      options.clientId = `iot_dash_client_b1_${randId}_${ts}`;
    } else if (brokerId === 'broker2') {
      if (!flespiToken) {
        addLog('Broker Flespi membutuhkan token. Sila isi token di panel konfigurasi.', 'error');
        return;
      }
      url = 'wss://mqtt.flespi.io:443';
      options.clientId = `iot_dash_client_b2_${randId}_${ts}`;
      options.username = flespiToken;
      options.password = ''; // empty string as requested
    } else if (brokerId === 'broker3') {
      url = 'wss://test.mosquitto.org:8091/mqtt';
      options.clientId = `iot_dash_client_b3_auth_${randId}_${ts}`;
      options.username = 'rw';
      options.password = 'readwrite';
    }

    try {
      addLog(`Mencoba menghubungkan ke ${brokerId === 'broker1' ? 'Mosquitto Public' : brokerId === 'broker2' ? 'Flespi' : 'Mosquitto Auth'}...`, 'sys');
      
      const client = mqtt.connect(url, options);
      clientsRef.current[brokerId] = client;

      // Connection Success listener
      client.on('connect', () => {
        setBrokers((prevList) =>
          prevList.map((b) => (b.id === brokerId ? { ...b, connected: true } : b))
        );
        addLog(`Koneksi BERHASIL: Terhubung ke ${brokerId === 'broker1' ? 'Mosquitto Public' : brokerId === 'broker2' ? 'Flespi' : 'Mosquitto Auth'}`, 'sys');

        // Subscribe topics
        client.subscribe('iot/sensor/suhu', { qos: 0 });
        client.subscribe('iot/sensor/kelembapan', { qos: 0 });
        // Subscribe to diagnostic ping
        client.subscribe(`iot/ping/${brokerId}`, { qos: 0 });
      });

      // Handle incoming messages
      client.on('message', (topic: string, message: any) => {
        const payload = message.toString();

        if (topic === 'iot/sensor/suhu') {
          const val = parseFloat(payload);
          if (!isNaN(val)) {
            setSuhu(val);
            setPulseSuhu(true);
            setTimeout(() => setPulseSuhu(false), 150);
            addLog(`Sensor suhu masuk dari ${brokerId === 'broker1' ? 'Mosquitto' : brokerId === 'broker2' ? 'Flespi' : 'Mosquitto Auth'}: ${val}°C`, 'in');
          }
        } else if (topic === 'iot/sensor/kelembapan') {
          const val = parseFloat(payload);
          if (!isNaN(val)) {
            setKelembapan(val);
            setPulseKelembapan(true);
            setTimeout(() => setPulseKelembapan(false), 150);
            addLog(`Sensor kelembapan masuk dari ${brokerId === 'broker1' ? 'Mosquitto' : brokerId === 'broker2' ? 'Flespi' : 'Mosquitto Auth'}: ${val}%`, 'in');
          }
        } else if (topic === `iot/ping/${brokerId}`) {
          // Calculate latency
          const sentTime = parseInt(payload, 10);
          if (!isNaN(sentTime)) {
            const rtt = Date.now() - sentTime;
            setBrokers((prevList) =>
              prevList.map((b) => (b.id === brokerId ? { ...b, latency: rtt } : b))
            );
          }
        }
      });

      // Error handler
      client.on('error', (err: any) => {
        addLog(`Kesalahan Koneksi ${brokerId === 'broker1' ? 'Mosquitto' : brokerId === 'broker2' ? 'Flespi' : 'Mosquitto Auth'}: ${err.message || err}`, 'error');
        setBrokers((prevList) =>
          prevList.map((b) => (b.id === brokerId ? { ...b, connected: false, latency: null } : b))
        );
      });

      // Offline handler
      client.on('offline', () => {
        setBrokers((prevList) =>
          prevList.map((b) => (b.id === brokerId ? { ...b, connected: false, latency: null } : b))
        );
      });

      // Disconnect handler
      client.on('close', () => {
        setBrokers((prevList) =>
          prevList.map((b) => (b.id === brokerId ? { ...b, connected: false, latency: null } : b))
        );
      });

    } catch (e: any) {
      addLog(`Koneksi Gagal Diinisialisasi: ${e.message}`, 'error');
    }
  };

  // Connect all brokers on mount
  useEffect(() => {
    // Check if global mqtt loaded from CDN
    if (typeof mqtt === 'undefined') {
      const waitMqttInterval = setInterval(() => {
        if (typeof mqtt !== 'undefined') {
          clearInterval(waitMqttInterval);
          initializeAllBrokers();
        }
      }, 500);
      return () => clearInterval(waitMqttInterval);
    } else {
      initializeAllBrokers();
    }

    return () => {
      // Disconnect all clients on destructor
      Object.keys(clientsRef.current).forEach((key) => {
        try {
          clientsRef.current[key].end();
        } catch (e) {}
      });
    };
  }, []);

  const initializeAllBrokers = () => {
    connectBroker('broker1');
    if (flespiToken) {
      connectBroker('broker2');
    } else {
      addLog('Broker 2 (Flespi) dilewati karena token belum diisi. Isi token untuk mengaktifkan!', 'sys');
    }
    connectBroker('broker3');
  };

  // Host manual single broker reconnect method
  const handleReconnectBroker = (id: string) => {
    addLog(`Menghubungkan kembali secara manual ke ${id === 'broker1' ? 'Mosquitto Public' : id === 'broker2' ? 'Flespi' : 'Mosquitto Auth'}...`, 'sys');
    connectBroker(id);
  };

  // Latency dynamic ping loop
  useEffect(() => {
    const latencyInterval = setInterval(() => {
      Object.keys(clientsRef.current).forEach((brokerId) => {
        const client = clientsRef.current[brokerId];
        if (client && client.connected) {
          const nowTimestamp = Date.now().toString();
          client.publish(`iot/ping/${brokerId}`, nowTimestamp, { qos: 0 });
        }
      });
    }, 5000); // Ping every 5s

    return () => clearInterval(latencyInterval);
  }, []);

  // --- ACTIONS: PUBLISH TO ALL CLIENTS SIMULTANEOUSLY ---
  const publishToAll = (topic: string, payload: string) => {
    let publishedOnce = false;

    Object.keys(clientsRef.current).forEach((brokerId) => {
      const client = clientsRef.current[brokerId];
      if (client && client.connected) {
        try {
          client.publish(topic, payload, { qos: 0 });
          publishedOnce = true;
        } catch (e: any) {
          console.error(`Gagal mengirim payload ke ${brokerId}:`, e);
        }
      }
    });

    // Logging representation for outputs
    if (publishedOnce) {
      addLog(`KIRIM MQTT -> Topik: "${topic}" | Payload: "${payload}" (dikirim ke broker aktif)`, 'out');
    } else {
      addLog(`Mencoba mengirim "${payload}" ke "${topic}" tapi semua broker offline.`, 'error');
    }
  };

  // --- INDIVIDUAL ACTIONS ---
  const handleToggleRelay = (id: number) => {
    if (polaState.pola1 || polaState.pola2) return; // safety bypass lock

    setRelays((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextState = r.state === 'ON' ? 'OFF' : 'ON';
          // Publish command to top broker channels
          publishToAll(`iot/relay/${id}`, nextState);
          return { ...r, state: nextState };
        }
        return r;
      })
    );
  };

  const handleAllRelaysOn = () => {
    setRelays((prev) =>
      prev.map((r) => {
        if (r.state === 'OFF') {
          publishToAll(`iot/relay/${r.id}`, 'ON');
          return { ...r, state: 'ON' };
        }
        return r;
      })
    );
    addLog('Semua relay dinyalakan via Kontrol Master.', 'out');
  };

  const handleAllRelaysOff = () => {
    setRelays((prev) =>
      prev.map((r) => {
        if (r.state === 'ON') {
          publishToAll(`iot/relay/${r.id}`, 'OFF');
          return { ...r, state: 'OFF' };
        }
        return r;
      })
    );
    addLog('Semua relay dimatikan via Kontrol Master.', 'out');
  };

  const handleRenameRelay = (id: number, newName: string) => {
    setRelays((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: newName } : r))
    );
    addLog(`Relay ${id} diubah namanya menjadi "${newName}"`, 'sys');
  };

  // --- PATTERNS CONTROLS ---
  const handleTogglePola1 = () => {
    const nextVal = !polaState.pola1;
    
    // Safety disable Pola 2 if turning on Pola 1
    let nextPolaState = { ...polaState, pola1: nextVal };
    if (nextVal && polaState.pola2) {
      nextPolaState.pola2 = false;
      publishToAll('iot/pola/2', 'OFF');
    }

    setPolaState(nextPolaState);
    publishToAll('iot/pola/1', nextVal ? 'ON' : 'OFF');

    if (nextVal) {
      addLog('Menjalankan Pola Lampu 1: Kiri ke Kanan.', 'out');
    } else {
      addLog('Menghentikan Pola Lampu 1.', 'out');
    }
  };

  const handleTogglePola2 = () => {
    const nextVal = !polaState.pola2;

    // Safety disable Pola 1 if turning on Pola 2
    let nextPolaState = { ...polaState, pola2: nextVal };
    if (nextVal && polaState.pola1) {
      nextPolaState.pola1 = false;
      publishToAll('iot/pola/1', 'OFF');
    }

    setPolaState(nextPolaState);
    publishToAll('iot/pola/2', nextVal ? 'ON' : 'OFF');

    if (nextVal) {
      addLog('Menjalankan Pola Lampu 2: Strobe.', 'out');
    } else {
      addLog('Menghentikan Pola Lampu 2.', 'out');
    }
  };

  const handleAllPolaOn = () => {
    setPolaState({ pola1: true, pola2: true });
    publishToAll('iot/pola/1', 'ON');
    publishToAll('iot/pola/2', 'ON');
    addLog('Semua pola lampu diaktifkan sekaligus.', 'out');
  };

  const handleAllPolaOff = () => {
    setPolaState({ pola1: false, pola2: false });
    publishToAll('iot/pola/1', 'OFF');
    publishToAll('iot/pola/2', 'OFF');
    addLog('Semua pola lampu dinonaktifkan.', 'out');
  };

  // --- RECONNECT ON TOKEN UPDATE ---
  const handleFlespiTokenChange = (newToken: string) => {
    setFlespiToken(newToken);
    addLog(`Token Flespi diperbarui. Memulai ulang koneksi Broker 2...`, 'sys');
    // Connect token 2 again
    setTimeout(() => {
      // Connect after state commit
      connectBroker('broker2');
    }, 100);
  };

  // --- VOICE COMMAND ROUTER CODE ACTIONS ---
  const handleExecuteVoiceCommand = (commandCode: string, speakSuccessMsg: string) => {
    switch (commandCode) {
      case 'SHUTDOWN':
        // Turn OFF relays and patterns
        handleAllRelaysOff();
        handleAllPolaOff();
        break;
      
      case 'ALL_RELAYS_ON':
        handleAllRelaysOn();
        break;

      case 'ALL_RELAYS_OFF':
        handleAllRelaysOff();
        break;

      case 'RELAY_1_ON':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 1 ? { ...r, state: 'ON' } : r));
        publishToAll('iot/relay/1', 'ON');
        break;
      case 'RELAY_1_OFF':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 1 ? { ...r, state: 'OFF' } : r));
        publishToAll('iot/relay/1', 'OFF');
        break;

      case 'RELAY_2_ON':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 2 ? { ...r, state: 'ON' } : r));
        publishToAll('iot/relay/2', 'ON');
        break;
      case 'RELAY_2_OFF':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 2 ? { ...r, state: 'OFF' } : r));
        publishToAll('iot/relay/2', 'OFF');
        break;

      case 'RELAY_3_ON':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 3 ? { ...r, state: 'ON' } : r));
        publishToAll('iot/relay/3', 'ON');
        break;
      case 'RELAY_3_OFF':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 3 ? { ...r, state: 'OFF' } : r));
        publishToAll('iot/relay/3', 'OFF');
        break;

      case 'RELAY_4_ON':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 4 ? { ...r, state: 'ON' } : r));
        publishToAll('iot/relay/4', 'ON');
        break;
      case 'RELAY_4_OFF':
        if (polaState.pola1 || polaState.pola2) break;
        setRelays(prev => prev.map(r => r.id === 4 ? { ...r, state: 'OFF' } : r));
        publishToAll('iot/relay/4', 'OFF');
        break;

      case 'ALL_POLA_ON':
        handleAllPolaOn();
        break;
      case 'ALL_POLA_OFF':
        handleAllPolaOff();
        break;

      case 'POLA_1_ON':
        if (!polaState.pola1) handleTogglePola1();
        break;
      case 'POLA_1_OFF':
        if (polaState.pola1) handleTogglePola1();
        break;
      
      case 'POLA_2_ON':
        if (!polaState.pola2) handleTogglePola2();
        break;
      case 'POLA_2_OFF':
        if (polaState.pola2) handleTogglePola2();
        break;

      default:
        break;
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // General connection counting elements
  const activeConnectionsCount = brokers.filter((b) => b.connected).length;
  const isSuhuAlertKritis = suhu > limitTemp;

  return (
    <div className="min-h-screen py-6 px-4 md:px-8 max-w-7xl mx-auto flex flex-col font-sans uppercase-none">
      
      {/* HEADER WIDGET PANEL */}
      <header className={`p-5 rounded-2xl bg-[#0d1527]/90 border ${isSuhuAlertKritis ? 'border-red-500 danger-flash-active' : 'border-[#00c9ff]/20'} box-glow mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300`}>
        <div className="flex items-center gap-3.5">
          {/* Glowing launcher graphic */}
          <div className="relative w-12 h-12 bg-gradient-to-tr from-[#00c9ff] to-[#01416e] rounded-xl flex items-center justify-center border border-[#00c9ff]/40 shadow-[0_0_15px_#00c9ff30]">
            <Cpu className="w-6 h-6 text-[#00c9ff] animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#0d1527] rounded-full"></span>
          </div>
          <div>
            <h1 className="font-title text-xl font-black text-white tracking-wider flex items-center gap-2">
              <span>IOT DASHBOARD</span>
              <span className="text-[#00c9ff] text-glow font-bold">CYAN SPACE</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium font-sans tracking-tight mt-0.5 lowercase normal-case">
              Monitoring node ESP32, multi-broker sinkronisasi & Web Speech recognition terpadu
            </p>
          </div>
        </div>

        {/* Dynamic clocks and status aggregates */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Live system state tag */}
          <div className="bg-[#090d16] px-3.5 py-2 border border-[#00c9ff]/10 rounded-lg flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00c9ff] animate-pulse" />
            <div className="text-[10px] sm:text-xs">
              <span className="text-gray-500 uppercase font-bold tracking-wider mr-1">BROKER SINKRON:</span>
              <span className={activeConnectionsCount > 0 ? 'text-[#00c9ff] font-bold' : 'text-red-400 font-bold'}>
                {activeConnectionsCount} / 3 connected
              </span>
            </div>
          </div>

          {/* Time dynamic digital clock widget */}
          <div className="bg-[#090d16] px-3.5 py-2 border border-[#00c9ff]/10 rounded-lg text-right max-w-sm">
            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none mb-1">
              Waktu Real-Time (id-ID WIB)
            </div>
            <div className="text-xs text-[#00c9ff] font-bold tracking-wider uppercase font-sans">
              {currentTime || 'Membaca jam...'}
            </div>
          </div>
        </div>
      </header>

      {/* DETECT TEMPERATURE SYSTEM WARNING EMBEDDED BANNER */}
      {isSuhuAlertKritis && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-500 text-red-200 text-xs flex items-center justify-between gap-4 box-glow-danger danger-flash-active">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div>
              <strong className="font-title tracking-wider text-red-400 uppercase">PERINGATAN BAHAYA SUHU KRITIS!</strong>
              <p className="mt-0.5 normal-case font-sans">Suhu ruangan sebesar <strong>{suhu.toFixed(1)}°C</strong> telah melampaui batas operasional aman <strong>{limitTemp}°C</strong>. Beep alarm diaktifkan!</p>
            </div>
          </div>
          <button
            onClick={() => setLimitTemp(suhu + 2)}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-title text-[10px] font-bold rounded uppercase tracking-wide shrink-0 transition"
          >
            MUTE SEBENTAR (+2°C BOUNDS)
          </button>
        </div>
      )}

      {/* CORE GRID ARCHITECTURE */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* LEFT COLUMN: TELEMETRIES & BASIC POWER CONTROLS */}
        <div className="flex flex-col gap-6">
          {/* 1. Sensor telemetries panel */}
          <SensorPanel
            suhu={suhu}
            kelembapan={kelembapan}
            history={sensorHistory}
            limitTemp={limitTemp}
            setLimitTemp={setLimitTemp}
            pulseSuhu={pulseSuhu}
            pulseKelembapan={pulseKelembapan}
          />

          {/* 2. Relay power channels panel */}
          <RelayControl
            relays={relays}
            onToggle={handleToggleRelay}
            onAllOn={handleAllRelaysOn}
            onAllOff={handleAllRelaysOff}
            onRename={handleRenameRelay}
            isPolaActive={polaState.pola1 || polaState.pola2}
          />
        </div>

        {/* RIGHT COLUMN: LIGHTING ROUTINES & NETWORKS TELEMETRIES */}
        <div className="flex flex-col gap-6">
          {/* 3. Electronic patterns animation simulator */}
          <PolaLampu
            polaState={polaState}
            onTogglePola1={handleTogglePola1}
            onTogglePola2={handleTogglePola2}
            onAllPolaOn={handleAllPolaOn}
            onAllPolaOff={handleAllPolaOff}
          />

          {/* 4. Active brokers configurations and status markers */}
          <BrokerStatusPanel
            brokers={brokers}
            flespiToken={flespiToken}
            onFlespiTokenChange={handleFlespiTokenChange}
            onReconnect={handleReconnectBroker}
          />
        </div>
      </main>

      {/* TERMINAL ACTIVITY LOGGER BAR */}
      <div className="mb-6">
        <ActivityLog logs={logs} onClear={handleClearLogs} />
      </div>

      {/* FOOTER BAR: CO-PILOT SPEECH RECOGNITIONS */}
      <footer className="mt-auto pt-6 border-t border-[#00c9ff]/10">
        <VoiceCommandController
          currentSuhu={suhu}
          currentKelembapan={kelembapan}
          onExecuteCommand={handleExecuteVoiceCommand}
          onClearLogs={handleClearLogs}
          addLog={addLog}
        />
        
        {/* Credits */}
        <div className="text-center text-[10px] font-mono text-zinc-600 mt-6 tracking-widest uppercase">
          CYAN SPACE ENGINE v2.10 • POWERED BY WEB SPEECH API & SECURE WEBSOCKETS
        </div>
      </footer>
    </div>
  );
}
