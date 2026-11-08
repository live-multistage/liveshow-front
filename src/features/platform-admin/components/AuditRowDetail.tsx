'use client';

import { useState } from 'react';
import type { AuditLogEntry } from '../types/platform-admin.types';
import { auditChanges, auditFieldLabel } from '../utils/audit-format';
import styles from './PlatformAuditPage.module.scss';

function CopyableRequestId({ requestId }: { requestId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className={styles.copyRow}>
      <code className={styles.code}>{requestId}</code>
      <button type="button" className={styles.copyBtn} onClick={copy}>
        Copiar requestId
      </button>
      {copied && <span role="status" className={styles.copied}>Copiado</span>}
    </span>
  );
}

export function AuditRowDetail({ e }: { e: AuditLogEntry }) {
  const changes = auditChanges(e.before, e.after);

  return (
    <div className={styles.detail}>
      <div className={styles.detailItem}>
        <span className={styles.detailLabel}>requestId</span>
        {e.requestId ? <CopyableRequestId requestId={e.requestId} /> : <span className={styles.none}>Sem requestId</span>}
      </div>

      {e.userAgent && (
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>User-agent</span>
          <span className={styles.detailText}>{e.userAgent}</span>
        </div>
      )}

      <div className={styles.detailItem}>
        <span className={styles.detailLabel}>Alterações</span>
        {changes.length === 0 ? (
          <span className={styles.none}>Sem alterações registradas</span>
        ) : (
          <ul className={styles.changes}>
            {changes.map((c) => (
              <li key={c.field} className={styles.change}>
                <span className={styles.changeField}>{auditFieldLabel(c.field)}</span>
                <span className={styles.changeFrom}>{c.from}</span>
                <span aria-hidden="true">→</span>
                <span className={styles.changeTo}>{c.to}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
