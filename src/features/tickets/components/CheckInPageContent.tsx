'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, WifiOff, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ticketingService } from '../services/ticketing.service';
import {
  cachePublicKey,
  parseQrToken,
  verifyQrTokenOffline,
  isLocallyRedeemed,
  markLocallyRedeemed,
  flushOfflineQueue,
} from '../utils/entry-pass-offline';
import styles from './CheckInPageContent.module.scss';

type ResultKind = 'ok' | 'used' | 'invalid';

interface GateResult {
  kind: ResultKind;
  offline: boolean;
  detail?: string;
}

const SCANNER_ID = 'gate-qr-scanner';

export function CheckInPageContent() {
  const { id: eventId } = useParams<{ id: string }>();
  const [result, setResult] = useState<GateResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [scannerOn, setScannerOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Continuous scanning re-fires the same QR many times a second.
  const lastScanRef = useRef<{ token: string; at: number }>({ token: '', at: 0 });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['check-in-summary', eventId],
    queryFn: () => ticketingService.getCheckInSummary(eventId),
    refetchInterval: 10_000,
    retry: false,
  });

  // While online: cache the signature public key + flush queued offline scans.
  const syncOffline = useCallback(() => {
    void ticketingService
      .getEntryPassPublicKey()
      .then(({ publicKeyPem }) => cachePublicKey(publicKeyPem))
      .catch(() => {});
    void flushOfflineQueue((grantId) => ticketingService.checkIn(eventId, { grantId }));
  }, [eventId]);

  useEffect(() => {
    syncOffline();
    window.addEventListener('online', syncOffline);
    return () => window.removeEventListener('online', syncOffline);
  }, [syncOffline]);

  const settle = useCallback(
    (r: GateResult) => {
      setResult(r);
      setChecking(false);
      void refetchSummary();
    },
    [refetchSummary],
  );

  const runCheckIn = useCallback(
    async (body: { grantId?: string; entryCode?: string }, qrToken?: string) => {
      setChecking(true);
      try {
        const res = await ticketingService.checkIn(eventId, body);
        if (res.status === 'OK') return settle({ kind: 'ok', offline: false });
        if (res.status === 'ALREADY_USED') {
          const when = res.redeemedAt ? new Date(res.redeemedAt).toLocaleTimeString('pt-BR') : '';
          return settle({ kind: 'used', offline: false, detail: when && `às ${when}` });
        }
        return settle({ kind: 'invalid', offline: false });
      } catch (err) {
        const hasResponse = !!(err as { response?: unknown })?.response;
        if (hasResponse || !qrToken) {
          // Server rejected (403/429/...) or manual code without network —
          // manual codes can't be validated offline.
          return settle({
            kind: 'invalid',
            offline: !hasResponse,
            detail: !hasResponse ? 'sem conexão — código manual exige internet' : undefined,
          });
        }
        // Network down + QR in hand → offline signature validation.
        const payload = await verifyQrTokenOffline(qrToken);
        if (!payload || payload.eid !== eventId) return settle({ kind: 'invalid', offline: true });
        if (isLocallyRedeemed(payload.gid)) return settle({ kind: 'used', offline: true });
        markLocallyRedeemed(payload.gid);
        return settle({ kind: 'ok', offline: true });
      }
    },
    [eventId, settle],
  );

  const handleToken = useCallback(
    (token: string) => {
      const now = Date.now();
      if (lastScanRef.current.token === token && now - lastScanRef.current.at < 3000) return;
      lastScanRef.current = { token, at: now };

      const parsed = parseQrToken(token);
      if (!parsed) {
        settle({ kind: 'invalid', offline: false });
        return;
      }
      void runCheckIn({ grantId: parsed.payload.gid }, token);
    },
    [runCheckIn, settle],
  );

  const startScanner = useCallback(async () => {
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded) => handleToken(decoded),
        () => {}, // per-frame decode misses — noise, ignore
      );
      setScannerOn(true);
    } catch {
      setScannerOn(false);
      settle({ kind: 'invalid', offline: false, detail: 'câmera indisponível — use o código manual' });
    }
  }, [handleToken, settle]);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    if (code.length !== 6) return;
    void runCheckIn({ entryCode: code });
    setManualCode('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>PORTARIA</div>
          <h1 className={styles.title}>Check-in</h1>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryNum}>{summary ? `${summary.redeemed}/${summary.total}` : '—'}</span>
          <span className={styles.summaryLabel}>ENTRADAS</span>
        </div>
      </div>

      {result && (
        <div
          className={`${styles.result} ${
            result.kind === 'ok' ? styles.resultOk : result.kind === 'used' ? styles.resultUsed : styles.resultInvalid
          }`}
          role="status"
        >
          {result.kind === 'ok' && <CheckCircle2 size={28} />}
          {result.kind === 'used' && <AlertTriangle size={28} />}
          {result.kind === 'invalid' && <XCircle size={28} />}
          <span className={styles.resultText}>
            {result.kind === 'ok' && 'ENTRADA LIBERADA'}
            {result.kind === 'used' && `JÁ UTILIZADO ${result.detail ?? ''}`}
            {result.kind === 'invalid' && (result.detail ?? 'INGRESSO INVÁLIDO')}
          </span>
          {result.offline && (
            <span className={styles.offlineTag}>
              <WifiOff size={12} /> OFFLINE
            </span>
          )}
        </div>
      )}

      <div className={styles.scannerCard}>
        <div id={SCANNER_ID} className={styles.scannerViewport} />
        {!scannerOn && (
          <button type="button" className={styles.scanBtn} onClick={() => void startScanner()}>
            <ScanLine size={17} /> Ativar scanner
          </button>
        )}
      </div>

      <form className={styles.manualRow} onSubmit={submitManual}>
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          placeholder="CÓDIGO MANUAL (6 CHARS)"
          maxLength={7}
          className={styles.manualInput}
          aria-label="Código de entrada manual"
        />
        <button type="submit" className={styles.manualBtn} disabled={checking}>
          {checking ? 'Validando…' : 'Validar'}
        </button>
      </form>

      <p className={styles.hint}>
        QR funciona offline (assinatura verificada no aparelho). Código manual exige conexão.
      </p>
    </div>
  );
}
