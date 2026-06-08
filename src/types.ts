/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BrokerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'ws' | 'wss';
  path?: string;
  username?: string;
  password?: string;
}

export interface BrokerStatus {
  id: string;
  name: string;
  connected: boolean;
  latency: number | null;
}

export interface RelayState {
  id: number;
  name: string;
  state: 'ON' | 'OFF';
}

export interface PolaState {
  pola1: boolean;
  pola2: boolean;
}

export interface SensorHistory {
  suhu: number;
  kelembapan: number;
  timeLabel: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'in' | 'out' | 'error' | 'sys';
}
