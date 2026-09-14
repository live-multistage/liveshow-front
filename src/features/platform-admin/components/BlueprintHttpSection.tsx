'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Skeleton } from '@live-show/design-system';
import type { BlueprintSecretSummary } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import { usePlatformSettingsQuery, useSetBlueprintHttpAllowlistMutation } from '../queries/get-settings';
import { useBlueprintSecretsQuery } from '../blueprints/queries/blueprint-secrets.queries';
import { useSetBlueprintSecretMutation, useDeleteBlueprintSecretMutation } from '../blueprints/mutations/blueprint-secrets.mutations';
import { formatAuditWhen } from '../utils/format';
import cardStyles from './PlatformSettingsPage.module.scss';
import styles from './BlueprintHttpSection.module.scss';

const CONFIRM_WINDOW_MS = 5000;

// D — Blueprints · HTTP settings card. Allowlist of hosts the "Requisição
// HTTP" action can call plus the secrets used in its headers/body (values
// are write-only: GET /blueprints/secrets never returns them).
export function BlueprintHttpSection() {
  const t = useTranslations('platformAdmin.settings.blueprintsHttp');
  const locale = useLocale();
  const { data: settings } = usePlatformSettingsQuery();
  const setAllowlist = useSetBlueprintHttpAllowlistMutation();
  const { data: secrets, isLoading: secretsLoading } = useBlueprintSecretsQuery();
  const setSecret = useSetBlueprintSecretMutation();
  const deleteSecret = useDeleteBlueprintSecretMutation();

  const [hostInput, setHostInput] = useState('');
  const [dialogState, setDialogState] = useState<{ open: boolean; lockedName: string | null }>({ open: false, lockedName: null });
  const [confirmingName, setConfirmingName] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  const allowlist = settings?.blueprintHttpAllowlist ?? [];

  function addHost(e: React.FormEvent) {
    e.preventDefault();
    const host = hostInput.trim().toLowerCase();
    if (!host || allowlist.includes(host)) {
      setHostInput('');
      return;
    }
    setAllowlist.mutate([...allowlist, host]);
    setHostInput('');
  }

  function removeHost(host: string) {
    setAllowlist.mutate(allowlist.filter((h) => h !== host));
  }

  function onRemoveClick(name: string) {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    if (confirmingName === name) {
      setConfirmingName(null);
      deleteSecret.mutate(
        { name },
        {
          onSuccess: () => toast.success(t('saved')),
          onError: (err: AppError) => toast.error(err.message || t('error')),
        },
      );
      return;
    }
    setConfirmingName(name);
    confirmTimer.current = setTimeout(() => setConfirmingName(null), CONFIRM_WINDOW_MS);
  }

  if (!settings || secretsLoading) {
    return (
      <section className={cardStyles.card} id="blueprints-http">
        <header className={cardStyles.sectionHeader}>
          <div className={cardStyles.sectionTitle}>{t('title')}</div>
          <p className={styles.description}>{t('description')}</p>
        </header>
        <div className={styles.body}>
          <div className={styles.col}>
            <Skeleton className={styles.skeletonBlock} style={{ width: 170, height: 20 }} />
            <Skeleton className={styles.skeletonBlock} />
          </div>
          <div className={styles.col}>
            <Skeleton className={styles.skeletonBlock} style={{ width: 170, height: 20 }} />
            <Skeleton className={styles.skeletonBlock} />
            <Skeleton className={styles.skeletonBlock} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cardStyles.card} id="blueprints-http">
      <header className={cardStyles.sectionHeader}>
        <div className={cardStyles.sectionTitle}>{t('title')}</div>
        <p className={styles.description}>{t('description')}</p>
      </header>

      <div className={styles.body}>
        <div className={styles.col}>
          <div className={cardStyles.mono10}>{t('allowlistLabel')}</div>

          {allowlist.length === 0 ? (
            <div className={styles.emptyBox}>{t('allowlistEmpty')}</div>
          ) : (
            <div className={styles.chips}>
              {allowlist.map((host) => (
                <button key={host} type="button" className={styles.chip} onClick={() => removeHost(host)} aria-label={`${t('remove')} ${host}`}>
                  {host}
                  <span className={styles.chipRemove}><X size={12} /></span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={addHost} className={styles.addRow}>
            <Input
              className={styles.hostInput}
              value={hostInput}
              onChange={(e) => setHostInput(e.target.value)}
              placeholder={t('addHostPlaceholder')}
              aria-label={t('allowlistLabel')}
            />
            <Button type="submit" variant="outline">{t('addHost')}</Button>
          </form>
          <p className={styles.help}>{t('allowlistHelp')}</p>
        </div>

        <div className={styles.col}>
          <div className={styles.secretsHeader}>
            <span className={cardStyles.mono10}>{t('secretsTitle')}</span>
            <Button size="sm" onClick={() => setDialogState({ open: true, lockedName: null })}>{t('define')}</Button>
          </div>

          {(secrets ?? []).length === 0 ? (
            <div className={styles.emptyBox}>{t('secretsEmpty')}</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('name')}</th>
                    <th>{t('updatedAt')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(secrets as BlueprintSecretSummary[]).map((secret) => (
                    <tr key={secret.name}>
                      <td data-label={t('name')} className={styles.mono}>{secret.name}</td>
                      <td data-label={t('updatedAt')} className={styles.updatedAt}>{formatAuditWhen(secret.updatedAt, locale)}</td>
                      <td data-label={t('actions')} className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => setDialogState({ open: true, lockedName: secret.name })}
                        >
                          {t('replace')}
                        </button>
                        <button type="button" className={styles.linkBtnDanger} onClick={() => onRemoveClick(secret.name)}>
                          {confirmingName === secret.name ? t('confirmRemove') : t('remove')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SetSecretDialog
        open={dialogState.open}
        lockedName={dialogState.lockedName}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        onSubmit={(name, value) =>
          setSecret.mutate(
            { name, value },
            {
              onSuccess: () => {
                toast.success(t('saved'));
                setDialogState({ open: false, lockedName: null });
              },
              onError: (err: AppError) => toast.error(err.message || t('error')),
            },
          )
        }
        isPending={setSecret.isPending}
      />
    </section>
  );
}

interface SetSecretDialogProps {
  open: boolean;
  lockedName: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, value: string) => void;
  isPending: boolean;
}

// D3 — small dialog shared by "Definir segredo" (empty name) and "Substituir"
// (name pre-filled and locked). The value never round-trips from the server,
// so this component's own state is the only place it ever exists client-side.
function SetSecretDialog({ open, lockedName, onOpenChange, onSubmit, isPending }: SetSecretDialogProps) {
  const t = useTranslations('platformAdmin.settings.blueprintsHttp');
  const [name, setName] = useState(lockedName ?? '');
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);

  useEffect(() => {
    if (open) {
      setName(lockedName ?? '');
      setValue('');
      setShowValue(false);
    }
  }, [open, lockedName]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !value) return;
    onSubmit(name.trim(), value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('define')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className={styles.dialogField}>
            <label className={styles.dialogLabel} htmlFor="blueprint-secret-name">{t('name')}</label>
            <Input
              id="blueprint-secret-name"
              aria-label={t('name')}
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              disabled={Boolean(lockedName)}
            />
            <p className={styles.help}>{t('nameHelp')}</p>
          </div>
          <div className={styles.dialogField}>
            <label className={styles.dialogLabel} htmlFor="blueprint-secret-value">{t('valueLabel')}</label>
            <div className={styles.valueRow}>
              <Input
                id="blueprint-secret-value"
                aria-label={t('valueLabel')}
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <button type="button" className={styles.showBtn} onClick={() => setShowValue((v) => !v)}>
                {showValue ? t('hide') : t('show')}
              </button>
            </div>
            <p className={styles.neverShown}>{t('valueNeverShown')}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
            <Button type="submit" disabled={isPending || !name.trim() || !value}>{t('save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
