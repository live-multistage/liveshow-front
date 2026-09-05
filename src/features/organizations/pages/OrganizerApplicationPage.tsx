'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Video,
  Ticket,
  Wallet,
  RotateCcw,
  Music,
  Trophy,
  Mic,
  Church,
  Drama,
  BookOpen,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useCreateOrganizerApplication } from '../hooks/use-create-organizer-application';
import type { OrganizerSegment, OrganizerExperience } from '../types/organization.types';
import styles from './OrganizerApplicationPage.module.scss';

const APPLY_PATH = '/be-partner/apply';
const REGISTER_HREF = `/register?redirect=${encodeURIComponent(APPLY_PATH)}`;
const LOGIN_HREF = `/login?redirect=${encodeURIComponent(APPLY_PATH)}`;

const ABOUT_MIN = 40;

const PERKS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Video,
    title: 'Multicâmera de verdade.',
    text: 'Envie quantas câmeras quiser; o público escolhe o ângulo ao vivo e no replay.',
  },
  {
    icon: Ticket,
    title: 'Ingresso digital e presencial.',
    text: 'QR code no local, acesso à transmissão em casa, cupons e evento gratuito.',
  },
  {
    icon: Wallet,
    title: 'Dinheiro direto na conta.',
    text: 'Repasse via Stripe. A plataforma só retém um percentual do que você vende.',
  },
  {
    icon: RotateCcw,
    title: 'Replay que continua vendendo.',
    text: 'Tudo é gravado; venda o acesso à gravação depois do fim.',
  },
];

const STEPS: { number: string; title: string; text: string }[] = [
  { number: '01', title: 'Análise rápida', text: 'Revisamos a candidatura e avisamos por e-mail.' },
  { number: '02', title: 'Conta liberada', text: 'Você cria a organização e conecta o recebimento.' },
  { number: '03', title: 'Primeiro evento', text: 'Publica, transmite pelo encoder que já usa e vende.' },
];

const SEGMENT_OPTIONS: { value: OrganizerSegment; label: string; icon: LucideIcon }[] = [
  { value: 'SHOWS_FESTIVALS', label: 'Shows e festivais', icon: Music },
  { value: 'SPORTS', label: 'Esportes', icon: Trophy },
  { value: 'CONFERENCES', label: 'Conferências', icon: Mic },
  { value: 'WORSHIP', label: 'Cultos', icon: Church },
  { value: 'THEATER_DANCE', label: 'Teatro e dança', icon: Drama },
  { value: 'CLASSES', label: 'Aulas', icon: BookOpen },
  { value: 'OTHER', label: 'Outro', icon: MoreHorizontal },
];

const EXPERIENCE_OPTIONS: { value: OrganizerExperience; label: string }[] = [
  { value: 'NEVER', label: 'Nunca' },
  { value: 'SOME', label: 'Algumas vezes' },
  { value: 'REGULAR', label: 'Regularmente' },
];

const TRUST_CHIPS = ['SEM MENSALIDADE', 'SEM CARTÃO AGORA', 'RESPOSTA POR E-MAIL'];

export function OrganizerApplicationContent() {
  const { isLoggedIn, isLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const [segments, setSegments] = useState<string[]>([]);
  const [organizationName, setOrganizationName] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [experience, setExperience] = useState<OrganizerExperience | ''>('');
  const [about, setAbout] = useState('');

  const mutation = useCreateOrganizerApplication(() => setSubmitted(true));

  if (isLoading) return null;

  if (!isLoggedIn) {
    return (
      <main className={styles.main}>
        <div className={styles.gate}>
          <p className={styles.eyebrow}>
            <span className={styles.dot} />
            SEJA UM PARCEIRO
          </p>
          <h1 className={styles.gateHeading}>Candidate-se a organizador</h1>
          <p className={styles.gateText}>
            Para enviar sua candidatura, entre na sua conta ou crie uma gratuitamente. Leva
            menos de dois minutos e sua candidatura passa por uma análise rápida antes da
            aprovação.
          </p>
          <div className={styles.gateActions}>
            <Link href={REGISTER_HREF} className={styles.primaryLink}>
              Criar conta e continuar
              <ArrowRight size={16} />
            </Link>
            <Link href={LOGIN_HREF} className={styles.secondaryLink}>
              Já tenho conta →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const toggleSegment = (value: string) => {
    setSegments((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  const doneCount =
    (segments.length > 0 ? 1 : 0) +
    (organizationName.trim().length > 1 ? 1 : 0) +
    (experience ? 1 : 0) +
    (about.trim().length >= ABOUT_MIN ? 1 : 0);

  const canSubmit =
    segments.length > 0 &&
    organizationName.trim().length > 1 &&
    experience !== '' &&
    about.trim().length >= ABOUT_MIN;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      organizationName: organizationName.trim(),
      segments,
      experience,
      about: about.trim(),
      ...(socialLink.trim() ? { socialLink: socialLink.trim() } : {}),
    });
  };

  const aboutLen = about.trim().length;

  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        {/* LEFT — pitch */}
        <section className={styles.pitch}>
          <p className={styles.eyebrow}>
            <span className={styles.dot} />
            SEJA UM PARCEIRO
          </p>
          <h1 className={styles.h1}>
            Seu próximo evento, <span className={styles.accent}>ao vivo e vendendo.</span>
          </h1>
          <p className={styles.lead}>
            Transmita com o equipamento que já tem, venda ingresso digital e presencial e receba
            direto na sua conta. Sem mensalidade: você só paga quando vende.
          </p>

          <ul className={styles.perks}>
            {PERKS.map(({ icon: Icon, title, text }) => (
              <li key={title} className={styles.perk}>
                <span className={styles.perkIcon}>
                  <Icon size={18} />
                </span>
                <div>
                  <p className={styles.perkTitle}>{title}</p>
                  <p className={styles.perkText}>{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className={styles.stepsEyebrow}>O QUE ACONTECE DEPOIS</p>
          <div className={styles.steps}>
            {STEPS.map(({ number, title, text }) => (
              <div key={number} className={styles.step}>
                <p className={styles.stepNumber}>{number}</p>
                <p className={styles.stepTitle}>{title}</p>
                <p className={styles.stepText}>{text}</p>
              </div>
            ))}
          </div>

          <Link href="/be-partner" className={styles.linkRow}>
            Ver tudo que a plataforma faz →
          </Link>
        </section>

        {/* RIGHT — form / success */}
        <section className={styles.formCol}>
          {submitted ? (
            <div className={styles.successCard}>
              <span className={styles.successIcon}>
                <CheckCircle2 size={28} />
              </span>
              <p className={styles.successEyebrow}>CANDIDATURA ENVIADA</p>
              <h2 className={styles.successTitle}>
                Recebemos, {organizationName.trim() || 'organizador'}.
              </h2>
              <p className={styles.successText}>
                Vamos analisar e responder por e-mail. Enquanto isso, conheça o Studio e prepare
                o seu primeiro evento.
              </p>
              <div className={styles.successLinks}>
                <Link href="/be-partner" className={styles.successLink}>
                  Como funciona a transmissão →
                </Link>
                <Link href="/help" className={styles.successLink}>
                  Preparar o encoder (OBS, vMix, SRT) →
                </Link>
              </div>
              <button
                type="button"
                className={styles.resetButton}
                onClick={() => {
                  setSubmitted(false);
                  setSegments([]);
                  setOrganizationName('');
                  setSocialLink('');
                  setExperience('');
                  setAbout('');
                }}
              >
                Enviar outra candidatura
              </button>
            </div>
          ) : (
            <form className={styles.card} onSubmit={handleSubmit}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Candidate-se a organizador</h2>
                  <p className={styles.cardSub}>Leva menos de dois minutos.</p>
                </div>
                <p className={styles.progress}>{doneCount} / 4 PREENCHIDOS</p>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHead}>
                  <span className={styles.fieldLabel}>O QUE VOCÊ TRANSMITE *</span>
                  <span className={styles.fieldNote}>ESCOLHA UM OU MAIS</span>
                </div>
                <div className={styles.chips}>
                  {SEGMENT_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const active = segments.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                        onClick={() => toggleSegment(value)}
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.inputRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>NOME DA ORGANIZAÇÃO *</span>
                  <input
                    className={styles.input}
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Ex: Liga Metropolitana de Vôlei"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>SITE OU REDE SOCIAL</span>
                  <input
                    className={styles.input}
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                    placeholder="instagram.com/…"
                  />
                </label>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>JÁ TRANSMITIU AO VIVO? *</span>
                <div className={styles.segmented}>
                  {EXPERIENCE_OPTIONS.map(({ value, label }) => {
                    const active = experience === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        className={`${styles.segButton} ${active ? styles.segButtonActive : ''}`}
                        onClick={() => setExperience(value)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHead}>
                  <span className={styles.fieldLabel}>CONTE SOBRE O SEU EVENTO *</span>
                  <span
                    className={aboutLen >= ABOUT_MIN ? styles.counterOk : styles.fieldNote}
                  >
                    {aboutLen >= ABOUT_MIN
                      ? `${aboutLen} CARACTERES`
                      : `MÍN. ${ABOUT_MIN - aboutLen} CARACTERES`}
                  </span>
                </div>
                <textarea
                  className={styles.textarea}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Ex: Liga amadora de vôlei com jogos toda quarta em duas quadras. Cerca de 300 pessoas por rodada, queremos transmitir com 3 câmeras e vender o replay."
                />
                <p className={styles.helper}>
                  O que é, com que frequência acontece e quantas pessoas costumam assistir ou ir.
                  Não precisa ser perfeito.
                </p>
              </div>

              {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}

              <div className={styles.submitArea}>
                <button type="submit" className={styles.submit} disabled={!canSubmit}>
                  {canSubmit ? 'Enviar candidatura' : 'Preencha os campos obrigatórios'}
                  {canSubmit && <ArrowRight size={18} />}
                </button>
                <div className={styles.trust}>
                  {TRUST_CHIPS.map((chip) => (
                    <span key={chip} className={styles.trustChip}>
                      <Check size={13} />
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
