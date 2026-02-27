'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './Controller.module.css';

export default function Controller() {
  const [mac, setMac] = useState('');
  const [host, setHost] = useState('');
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [macError, setMacError] = useState('');

  // Load config from localStorage
  useEffect(() => {
    const savedMac = localStorage.getItem('pc-mac') || '';
    const savedHost = localStorage.getItem('pc-host') || '';
    setMac(savedMac);
    setHost(savedHost);
    if (!savedMac || !savedHost) {
      setShowConfig(true);
    }
  }, []);

  const validateMac = (value: string) => {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!value) {
      setMacError('');
      return true;
    }
    if (!macRegex.test(value)) {
      setMacError('Format: 00:11:22:33:44:55');
      return false;
    }
    setMacError('');
    return true;
  };

  const saveConfig = () => {
    if (!validateMac(mac)) return;
    localStorage.setItem('pc-mac', mac);
    localStorage.setItem('pc-host', host);
    setShowConfig(false);
    checkStatus();
  };

  const checkStatus = useCallback(async () => {
    if (!host) {
      setStatus('offline');
      return;
    }
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host }),
      });
      const data = await res.json();
      if (data.alive) {
        setStatus('online');
        setLatency(data.time);
        setLastSeen(new Date());
      } else {
        setStatus('offline');
        setLatency(null);
      }
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus('offline');
    }
  }, [host]);

  // Periodic status check
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleWake = async () => {
    if (!mac) {
      setMessage('MAC address is required');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/wake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Wake packet sent successfully!');
        // Force a status check after a delay
        setTimeout(checkStatus, 5000);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Failed to send wake packet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="gradient-text">PC Controller</h1>
        <div className={`${styles.statusBadge} ${styles[status]}`}>
          <span className={styles.statusDot}></span>
          <div className={styles.statusInfo}>
            <span className={styles.statusLabel}>
              {status === 'checking' ? 'Checking...' : status.toUpperCase()}
            </span>
            {status === 'online' && latency !== null && (
              <span className={styles.latency}>{latency}ms</span>
            )}
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        <div className={styles.heroSection}>
          <button 
            className={`${styles.powerButton} ${loading ? styles.loading : ''}`}
            onClick={handleWake}
            disabled={loading}
          >
            <div className={styles.buttonInner}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
              </svg>
            </div>
            <div className={styles.glowEffect}></div>
          </button>
          <p className={styles.instruction}>
            {status === 'online' ? 'PC is Online' : 'Tap to Power On'}
          </p>
          {lastSeen && status === 'offline' && (
            <p className={styles.lastSeen}>
              Last seen: {lastSeen.toLocaleTimeString()}
            </p>
          )}
        </div>

        {message && <div className={styles.message}>{message}</div>}

        <button 
          className={styles.configToggle}
          onClick={() => setShowConfig(!showConfig)}
        >
          {showConfig ? 'Hide Settings' : 'Settings'}
        </button>

        {showConfig && (
          <div className={`${styles.configForm} glass`}>
            <h3>Configuration</h3>
            <div className={styles.inputGroup}>
              <label>MAC Address</label>
              <input 
                type="text" 
                placeholder="00:11:22:33:44:55" 
                value={mac}
                className={macError ? styles.inputError : ''}
                onChange={(e) => {
                  setMac(e.target.value);
                  validateMac(e.target.value);
                }}
              />
              {macError && <span className={styles.errorText}>{macError}</span>}
            </div>
            <div className={styles.inputGroup}>
              <label>Host (IP or Hostname)</label>
              <input 
                type="text" 
                placeholder="192.168.1.10" 
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>
            <button className={styles.saveButton} onClick={saveConfig}>
              Save Config
            </button>
          </div>
        )}

        <button 
          className={styles.troubleToggle}
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
        >
          {showTroubleshooting ? 'Hide Help' : 'Not working? Troubleshooting'}
        </button>

        {showTroubleshooting && (
          <div className={`${styles.troubleshooting} glass`}>
            <h3>Quick Fixes</h3>
            <ul>
              <li><strong>BIOS/UEFI:</strong> Enable &quot;Wake on LAN&quot; or &quot;Power on by PCIe&quot;. Disable &quot;ErP Ready&quot;.</li>
              <li><strong>Windows:</strong> In Device Manager, Ethernet Properties &gt; Power Management, check &quot;Allow this device to wake the computer&quot;.</li>
              <li><strong>Fast Startup:</strong> Disable Windows &quot;Fast Startup&quot; in Power Options.</li>
              <li><strong>Physical Address:</strong> Use <code>ipconfig /all</code> in CMD to get your MAC address.</li>
            </ul>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <p>© 2026 LAN Controller • Mobile Edition</p>
      </footer>
    </div>
  );
}
