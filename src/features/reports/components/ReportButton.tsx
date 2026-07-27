'use client';

import { useTranslations } from 'next-intl';
import { Flag } from 'lucide-react';
import { Button } from '@live-show/design-system';
import { useReportTarget } from '../hooks/use-report-target';
import { ReportModal } from './ReportModal';

interface Props {
  eventId: string;
  className?: string;
  /** Icon-only trigger for tight control clusters (e.g. the player header). */
  iconOnly?: boolean;
}

export function ReportButton({ eventId, className, iconOnly = false }: Props) {
  const t = useTranslations('reports');
  const { open, openModal, closeModal, getReporterKey } = useReportTarget();

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          className={className}
          onClick={openModal}
          aria-label={t('trigger')}
          title={t('trigger')}
        >
          <Flag size={14} />
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" className={className} onClick={openModal}>
          <Flag size={14} />
          {t('trigger')}
        </Button>
      )}
      <ReportModal
        open={open}
        onOpenChange={(next) => (next ? openModal() : closeModal())}
        eventId={eventId}
        getReporterKey={getReporterKey}
      />
    </>
  );
}
