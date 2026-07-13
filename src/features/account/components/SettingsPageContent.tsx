'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  User as UserIcon, Ticket, ShoppingBag, Bell, Lock, ShieldCheck, Monitor,
  Camera, Check, LogOut, ChevronRight, Trash2,
} from 'lucide-react';
import { getMe } from '../queries/get-me';
import { useAuth } from '../hooks/use-auth';
import { useUpdateProfileMutation } from '../mutations/update-profile.mutation';
import { useUploadAvatarMutation } from '../mutations/upload-avatar.mutation';
import { useChangePasswordMutation } from '../mutations/change-password.mutation';
import { useDisableAccountMutation } from '../mutations/disable-account.mutation';
import { useSessionsQuery } from '../queries/get-sessions';
import { useRevokeSessionMutation } from '../mutations/revoke-session.mutation';
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '../queries/get-notification-preferences';
import { updateProfileSchema, type UpdateProfileFormValues } from '../schemas/update-profile.schema';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/change-password.schema';
import type { NotificationPreferenceKey } from '../types/notification-preferences.types';
import styles from './SettingsPageContent.module.scss';

function initials(name?: string): string {
  return (name ?? '?').split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  USER: 'Membro', ARTIST: 'Artista', ORGANIZER: 'Produtor', ADMIN: 'Administrador', SUPER_ADMIN: 'Plataforma',
};

const PREF_META: { key: NotificationPreferenceKey; title: string; desc: string }[] = [
  { key: 'LIVE_EVENTS', title: 'Eventos ao vivo', desc: 'Avisar quando um show que você segue entrar no ar' },
  { key: 'TICKET_REMINDERS', title: 'Lembretes de ingresso', desc: 'Notificação 1 hora antes do evento começar' },
  { key: 'NEWS_PROMOS', title: 'Novidades e promoções', desc: 'Ofertas de cupons e pré-vendas exclusivas' },
  { key: 'EMAIL_DIGEST', title: 'Resumo por e-mail', desc: 'Relatório semanal dos seus eventos' },
];

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  twoFactorEnabled: boolean;
}

export function SettingsPageContent({ twoFactorEnabled }: Props) {
  const router = useRouter();
  const { logout } = useAuth();

  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 60_000 });

  const updateProfile = useUpdateProfileMutation();
  const uploadAvatar = useUploadAvatarMutation();
  const changePassword = useChangePasswordMutation();
  const disableAccount = useDisableAccountMutation();
  const { data: sessions = [] } = useSessionsQuery();
  const revokeSession = useRevokeSessionMutation();
  const { data: prefs } = useNotificationPreferencesQuery();
  const updatePrefs = useUpdateNotificationPreferencesMutation();

  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { displayName: '', phone: '', cpf: '', bio: '' },
  });

  useEffect(() => {
    if (me) {
      profileForm.reset({
        displayName: me.displayName,
        phone: me.phone ?? '',
        cpf: me.cpf ?? '',
        bio: me.bio ?? '',
      });
    }
  }, [me, profileForm]);

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const onProfileSubmit = (values: UpdateProfileFormValues) => {
    setProfileSaved(false);
    updateProfile.mutate(values, {
      onSuccess: () => {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 4000);
      },
    });
  };

  const onPasswordSubmit = ({ currentPassword, newPassword }: ChangePasswordFormValues) => {
    setPasswordSaved(false);
    changePassword.mutate({ currentPassword, newPassword }, {
      onSuccess: () => {
        passwordForm.reset();
        setPasswordSaved(true);
        setPasswordOpen(false);
        setTimeout(() => setPasswordSaved(false), 4000);
      },
    });
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = '';
  };

  const togglePref = (key: NotificationPreferenceKey) => {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: !prefs[key] });
  };

  const handleDisable = () => {
    if (!confirm('Desabilitar sua conta? Você será desconectado. Seus dados são mantidos, mas o acesso é bloqueado.')) return;
    disableAccount.mutate(undefined, { onSuccess: () => logout() });
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (isLoading || !me) {
    return <div className={styles.loading}><span className={styles.spinner} /></div>;
  }

  const roleLabel = ROLE_LABEL[me.role] ?? 'Membro';
  const memberYear = me.createdAt ? new Date(me.createdAt).getFullYear() : null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.breadcrumb}>MINHA CONTA</div>
        <h1 className={styles.title}>Configurações</h1>
        <div className={styles.subtitle}>Gerencie seu perfil, ingressos e preferências</div>
      </div>

      <div className={styles.layout}>
        {/* ===== SIDEBAR ===== */}
        <aside className={styles.sidebar}>
          <div className={styles.identityCard}>
            <div className={styles.identityGlow} />
            <div className={styles.identityRow}>
              <span className={styles.identityAvatar}>
                {me.avatarUrl ? <img src={me.avatarUrl} alt="" /> : initials(me.displayName)}
              </span>
              <div className={styles.identityText}>
                <div className={styles.identityName}>{me.displayName}</div>
                <div className={styles.identityEmail}>{me.email}</div>
              </div>
            </div>
            <div className={styles.roleBadge}><Check size={11} />{roleLabel.toUpperCase()}</div>
          </div>

          <nav className={styles.nav}>
            <button className={styles.navItem} onClick={() => scrollTo('perfil')}><UserIcon size={18} />Perfil</button>
            <Link href="/tickets" className={styles.navItem}><Ticket size={18} />Meus Ingressos</Link>
            <Link href="/purchases" className={styles.navItem}><ShoppingBag size={18} />Compras</Link>
            <button className={styles.navItem} onClick={() => scrollTo('notificacoes')}><Bell size={18} />Notificações</button>
            <button className={styles.navItem} onClick={() => scrollTo('seguranca')}><Lock size={18} />Segurança</button>
            <button className={styles.navItem} onClick={() => scrollTo('dispositivos')}><Monitor size={18} />Dispositivos</button>
          </nav>

          <button className={styles.logout} onClick={logout}><LogOut size={16} />Sair da conta</button>
        </aside>

        {/* ===== MAIN ===== */}
        <div className={styles.main}>
          {/* profile block */}
          <section id="perfil" className={styles.profileCard}>
            <div className={styles.cover} />
            <div className={styles.profileRow}>
              <div className={styles.profileIdent}>
                <span className={styles.profileAvatar}>
                  {me.avatarUrl ? <img src={me.avatarUrl} alt="" /> : initials(me.displayName)}
                </span>
                <div className={styles.profileMeta}>
                  <div className={styles.profileName}>{me.displayName}</div>
                  <div className={styles.profileSub}>
                    {me.email}{memberYear ? ` · membro desde ${memberYear}` : ''}
                  </div>
                </div>
              </div>
              <button
                className={styles.changePhoto}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                <Camera size={15} />{uploadAvatar.isPending ? 'Enviando...' : 'Trocar foto'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
            </div>
          </section>

          {/* personal data */}
          <section className={styles.card}>
            <div className={styles.cardLabel}>DADOS PESSOAIS</div>
            <div className={styles.cardTitle}>Informações do perfil</div>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Nome completo</label>
                  <input className={styles.input} {...profileForm.register('displayName')} />
                  {profileForm.formState.errors.displayName && (
                    <span className={styles.fieldError}>{profileForm.formState.errors.displayName.message}</span>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>E-mail</label>
                  <input className={styles.inputDisabled} value={me.email} disabled />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Telefone</label>
                  <input className={styles.input} placeholder="+55 11 90000-0000" {...profileForm.register('phone')} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>CPF</label>
                  <input className={styles.input} placeholder="000.000.000-00" {...profileForm.register('cpf')} />
                </div>
                <div className={`${styles.field} ${styles.fieldSpan}`}>
                  <label className={styles.fieldLabel}>Bio</label>
                  <textarea className={styles.textarea} rows={3} {...profileForm.register('bio')} />
                </div>
              </div>
              {updateProfile.error && <p className={styles.errorBanner}>{updateProfile.error.message}</p>}
              {profileSaved && <p className={styles.successBanner}>Perfil atualizado.</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={() => me && profileForm.reset({
                  displayName: me.displayName, phone: me.phone ?? '', cpf: me.cpf ?? '', bio: me.bio ?? '',
                })}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={updateProfile.isPending}>
                  <Check size={15} />{updateProfile.isPending ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </section>

          {/* quick access */}
          <div className={styles.quickGrid}>
            <Link href="/tickets" className={styles.quickCard}>
              <span className={styles.quickIcon}><Ticket size={18} /></span>
              <div className={styles.quickText}>
                <div className={styles.quickTitle}>Meus Ingressos</div>
                <div className={styles.quickDesc}>Acesse seus ingressos ativos e reprises</div>
              </div>
              <ChevronRight size={18} className={styles.quickChevron} />
            </Link>
            <Link href="/purchases" className={styles.quickCard}>
              <span className={styles.quickIcon}><ShoppingBag size={18} /></span>
              <div className={styles.quickText}>
                <div className={styles.quickTitle}>Histórico de compras</div>
                <div className={styles.quickDesc}>Seus pedidos e recibos</div>
              </div>
              <ChevronRight size={18} className={styles.quickChevron} />
            </Link>
          </div>

          {/* notifications */}
          <section id="notificacoes" className={styles.card}>
            <div className={styles.cardLabel}>PREFERÊNCIAS</div>
            <div className={styles.cardTitle}>Notificações</div>
            <div className={styles.prefList}>
              {PREF_META.map((p) => (
                <div key={p.key} className={styles.prefRow}>
                  <div>
                    <div className={styles.prefTitle}>{p.title}</div>
                    <div className={styles.prefDesc}>{p.desc}</div>
                  </div>
                  <Toggle
                    on={prefs?.[p.key] ?? true}
                    onClick={() => togglePref(p.key)}
                    disabled={!prefs || updatePrefs.isPending}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* security */}
          <section id="seguranca" className={styles.card}>
            <div className={styles.cardLabel}>SEGURANÇA</div>
            <div className={styles.cardTitle}>Acesso e senha</div>
            <div className={styles.secList}>
              <button className={styles.secRow} onClick={() => setPasswordOpen((o) => !o)}>
                <span className={styles.secRowLeft}><Lock size={16} />Alterar senha</span>
                <ChevronRight size={16} className={styles.secChevron} />
              </button>
              {passwordOpen && (
                <form className={styles.passwordForm} onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Senha atual</label>
                    <input type="password" autoComplete="current-password" className={styles.input} {...passwordForm.register('currentPassword')} />
                    {passwordForm.formState.errors.currentPassword && (
                      <span className={styles.fieldError}>{passwordForm.formState.errors.currentPassword.message}</span>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Nova senha</label>
                    <input type="password" autoComplete="new-password" className={styles.input} {...passwordForm.register('newPassword')} />
                    {passwordForm.formState.errors.newPassword && (
                      <span className={styles.fieldError}>{passwordForm.formState.errors.newPassword.message}</span>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Confirmar nova senha</label>
                    <input type="password" autoComplete="new-password" className={styles.input} {...passwordForm.register('confirmNewPassword')} />
                    {passwordForm.formState.errors.confirmNewPassword && (
                      <span className={styles.fieldError}>{passwordForm.formState.errors.confirmNewPassword.message}</span>
                    )}
                  </div>
                  {changePassword.error && (
                    <p className={styles.errorBanner}>
                      {changePassword.error.message === 'WRONG_CURRENT_PASSWORD' ? 'Senha atual incorreta.' : 'Não foi possível alterar a senha.'}
                    </p>
                  )}
                  <button type="submit" className={styles.btnPrimary} disabled={changePassword.isPending}>
                    {changePassword.isPending ? 'Salvando...' : 'Salvar senha'}
                  </button>
                </form>
              )}
              {passwordSaved && <p className={styles.successBanner}>Senha alterada.</p>}
              <div className={`${styles.secRow} ${styles.secRowStatic}`}>
                <span className={styles.secRowLeft}><ShieldCheck size={16} />Verificação em duas etapas</span>
                {twoFactorEnabled
                  ? <span className={styles.badgeOn}>ATIVA</span>
                  : <span className={styles.badgeSoon}>EM BREVE</span>}
              </div>
            </div>
          </section>

          {/* devices / sessions */}
          <section id="dispositivos" className={styles.card}>
            <div className={styles.cardLabel}>ACESSOS</div>
            <div className={styles.cardTitle}>Dispositivos conectados</div>
            <div className={styles.sessionList}>
              {sessions.length === 0 && <p className={styles.prefDesc}>Nenhuma sessão ativa.</p>}
              {sessions.map((s) => (
                <div key={s.id} className={styles.sessionRow}>
                  <span className={styles.sessionIcon}><Monitor size={16} /></span>
                  <div className={styles.sessionText}>
                    <div className={styles.sessionDevice}>
                      {s.device}{s.current && <span className={styles.sessionCurrent}>ESTE DISPOSITIVO</span>}
                    </div>
                    <div className={styles.sessionMeta}>
                      {[s.ipAddress, `último acesso ${timeAgo(s.lastUsedAt)}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {!s.current && (
                    <button
                      className={styles.sessionRevoke}
                      onClick={() => revokeSession.mutate(s.id)}
                      disabled={revokeSession.isPending}
                    >
                      Encerrar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* danger zone */}
          <section className={styles.dangerZone}>
            <div>
              <div className={styles.dangerTitle}>Excluir conta</div>
              <div className={styles.dangerDesc}>
                Desabilita seu acesso permanentemente. Seus dados são mantidos para fins legais, mas você não poderá mais entrar.
              </div>
            </div>
            <button className={styles.dangerBtn} onClick={handleDisable} disabled={disableAccount.isPending}>
              <Trash2 size={15} />{disableAccount.isPending ? 'Processando...' : 'Excluir conta'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
