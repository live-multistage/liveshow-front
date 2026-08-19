'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer, CheckCircle2 } from 'lucide-react';
import { ticketingService } from '../services/ticketing.service';
import styles from './EntryPassPageContent.module.scss';

// A4-friendly standalone page: on-screen it shows the pass with a print
// button; window.print() + @media print CSS is the "PDF" (decision #2 —
// zero PDF dependency, browser print-to-PDF does the file part).
export function EntryPassPageContent() {
  const { eventId } = useParams<{ eventId: string }>();

  const { data: pass, isLoading, isError } = useQuery({
    queryKey: ['entry-pass', eventId],
    queryFn: () => ticketingService.getEntryPass(eventId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <div className={styles.state}>Carregando ingresso…</div>;
  if (isError || !pass) {
    return <div className={styles.state}>Ingresso presencial não encontrado para este evento.</div>;
  }

  const formattedCode = `${pass.entryCode.slice(0, 3)}-${pass.entryCode.slice(3)}`;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/tickets" className={styles.backLink}>
          <ArrowLeft size={15} /> Meus ingressos
        </Link>
        <button type="button" className={styles.printBtn} onClick={() => window.print()}>
          <Printer size={15} /> Imprimir / PDF
        </button>
      </div>

      <div className={styles.pass}>
        <div className={styles.passHeader}>
          <span className={styles.brand}>LIVESHOW</span>
          <span className={styles.passLabel}>INGRESSO PRESENCIAL</span>
        </div>

        <div className={styles.qrWrap}>
          <QRCodeSVG value={pass.qrToken} size={240} level="M" marginSize={2} />
        </div>

        <div className={styles.codeBlock}>
          <span className={styles.codeLabel}>CÓDIGO DE ENTRADA (FALLBACK MANUAL)</span>
          <span className={styles.code}>{formattedCode}</span>
        </div>

        {pass.redeemedAt && (
          <div className={styles.redeemed}>
            <CheckCircle2 size={15} />
            Utilizado em {new Date(pass.redeemedAt).toLocaleString('pt-BR')}
          </div>
        )}

        <p className={styles.instructions}>
          Apresente este QR Code na entrada do evento. Se a leitura falhar,
          informe o código acima à equipe da portaria. Válido para uma única entrada.
        </p>
      </div>
    </div>
  );
}
