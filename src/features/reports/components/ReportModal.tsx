'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@live-show/design-system';
import { useSubmitReportMutation } from '../mutations/submit-report.mutation';
import type { ReportReason } from '../types/report.types';
import styles from './ReportModal.module.scss';

const REASONS: ReportReason[] = [
  'INAPPROPRIATE',
  'VIOLENCE',
  'HATE',
  'SEXUAL',
  'HARASSMENT',
  'SPAM_MISLEADING',
  'ILLEGAL',
  'COPYRIGHT',
  'OTHER',
];

const DETAIL_MAX = 1000;
const REPORT_HTTP_CONFLICT = 409;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  getReporterKey: () => string | undefined;
}

export function ReportModal({ open, onOpenChange, eventId, getReporterKey }: Props) {
  const t = useTranslations('reports');
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [detail, setDetail] = useState('');
  const [alreadyReported, setAlreadyReported] = useState(false);
  const mutation = useSubmitReportMutation();

  const reset = () => {
    setReason('');
    setDetail('');
    setAlreadyReported(false);
    mutation.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!reason) return;
    setAlreadyReported(false);
    mutation.mutate(
      {
        targetType: 'EVENT',
        targetId: eventId,
        reason,
        detail: detail.trim() ? detail.trim() : undefined,
        reporterKey: getReporterKey(),
      },
      {
        onSuccess: () => {
          toast.success(t('successToast'));
          handleOpenChange(false);
        },
        onError: (err) => {
          if (err.status === REPORT_HTTP_CONFLICT) {
            setAlreadyReported(true);
            return;
          }
          toast.error(t('genericError'));
        },
      },
    );
  };

  const errorMessage = alreadyReported
    ? t('alreadyReported')
    : mutation.isError
      ? t('genericError')
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className={styles.headRow}>
            <div className={styles.iconWrap}>
              <Flag size={20} strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription>{t('description')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className={styles.field}>
          <label className={styles.label}>{t('reasonLabel')}</label>
          <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
            <SelectTrigger>
              <SelectValue placeholder={t('reasonPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`reasons.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('detailLabel')}</label>
          <textarea
            className={styles.textarea}
            value={detail}
            onChange={(e) => setDetail(e.target.value.slice(0, DETAIL_MAX))}
            placeholder={t('detailPlaceholder')}
            rows={3}
            maxLength={DETAIL_MAX}
          />
          <span className={styles.counter}>{detail.length}/{DETAIL_MAX}</span>
        </div>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason || mutation.isPending}
            onClick={handleSubmit}
          >
            {mutation.isPending ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
