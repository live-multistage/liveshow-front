'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useCreateArtistApplication } from '../hooks/use-create-artist-application';
import styles from './ArtistApplicationPage.module.scss';

const APPLY_PATH = '/artists/apply';
const REGISTER_HREF = `/register?redirect=${encodeURIComponent(APPLY_PATH)}`;
const LOGIN_HREF = `/login?redirect=${encodeURIComponent(APPLY_PATH)}`;

const ABOUT_MIN = 40;
const MAX_GENRES = 10;

const PERKS: { title: string; text: string }[] = [
  { title: 'Perfil de artista.', text: 'Sua página pública com shows, agenda e redes sociais.' },
  { title: 'Entre na lineup dos eventos.', text: 'Organizadores podem te convidar para tocar ao vivo.' },
  { title: 'Multicâmera de verdade.', text: 'Transmita seus próprios shows com quantas câmeras quiser.' },
  { title: 'Replay que continua vendendo.', text: 'Tudo é gravado; venda o acesso à gravação depois do fim.' },
];

const STEPS: { number: string; title: string; text: string }[] = [
  { number: '01', title: 'Análise rápida', text: 'Revisamos a candidatura e avisamos por e-mail.' },
  { number: '02', title: 'Perfil liberado', text: 'Seu perfil de artista é criado automaticamente.' },
  { number: '03', title: 'Primeira apresentação', text: 'Complete seu perfil e entre em contato com organizadores.' },
];

const TRUST_CHIPS = ['SEM MENSALIDADE', 'SEM CARTÃO AGORA', 'RESPOSTA POR E-MAIL'];

export function ArtistApplicationContent() {
  const { isLoggedIn, isLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const [artistName, setArtistName] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [genreDraft, setGenreDraft] = useState('');
  const [about, setAbout] = useState('');

  const mutation = useCreateArtistApplication(() => setSubmitted(true));

  if (isLoading) return null;

  if (!isLoggedIn) {
    return (
      <main className={styles.main}>
        <div className={styles.gate}>
          <p className={styles.eyebrow}>
            <span className={styles.dot} />
            SEJA UM ARTISTA
          </p>
          <h1 className={styles.gateHeading}>Candidate-se como artista</h1>
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

  const addGenre = () => {
    const genre = genreDraft.trim();
    setGenreDraft('');
    if (!genre) return;
    if (genres.length >= MAX_GENRES) return;
    if (genres.includes(genre)) return;
    setGenres((prev) => [...prev, genre]);
  };

  const handleGenreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addGenre();
    } else if (e.key === 'Backspace' && genreDraft === '' && genres.length > 0) {
      setGenres((prev) => prev.slice(0, -1));
    }
  };

  const removeGenre = (genre: string) => {
    setGenres((prev) => prev.filter((g) => g !== genre));
  };

  const doneCount =
    (artistName.trim().length > 1 ? 1 : 0) +
    (about.trim().length >= ABOUT_MIN ? 1 : 0);

  const canSubmit = artistName.trim().length > 1 && about.trim().length >= ABOUT_MIN;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      artistName: artistName.trim(),
      genres,
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
            SEJA UM ARTISTA
          </p>
          <h1 className={styles.h1}>
            Seu próximo show, <span className={styles.accent}>ao vivo e vendendo.</span>
          </h1>
          <p className={styles.lead}>
            Ganhe um perfil de artista, entre na lineup dos eventos e transmita suas próprias
            apresentações. Sem mensalidade: você só paga quando vende.
          </p>

          <ul className={styles.perks}>
            {PERKS.map(({ title, text }) => (
              <li key={title} className={styles.perk}>
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
                Recebemos, {artistName.trim() || 'artista'}.
              </h2>
              <p className={styles.successText}>
                Vamos analisar e responder por e-mail. Enquanto isso, prepare fotos e um pouco
                de material do seu trabalho para o seu perfil.
              </p>
              <button
                type="button"
                className={styles.resetButton}
                onClick={() => {
                  setSubmitted(false);
                  setArtistName('');
                  setSocialLink('');
                  setGenres([]);
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
                  <h2 className={styles.cardTitle}>Candidate-se como artista</h2>
                  <p className={styles.cardSub}>Leva menos de dois minutos.</p>
                </div>
                <p className={styles.progress}>{doneCount} / 2 PREENCHIDOS</p>
              </div>

              <div className={styles.inputRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>NOME ARTÍSTICO *</span>
                  <input
                    className={styles.input}
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Ex: Banda Meia-Noite"
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
                <div className={styles.fieldHead}>
                  <span className={styles.fieldLabel}>GÊNEROS</span>
                  <span className={styles.fieldNote}>ENTER PARA ADICIONAR</span>
                </div>
                <div className={styles.chipsInput}>
                  {genres.map((genre) => (
                    <span key={genre} className={styles.genreChip}>
                      {genre}
                      <button
                        type="button"
                        onClick={() => removeGenre(genre)}
                        className={styles.genreChipRemove}
                        aria-label={`Remover ${genre}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className={styles.chipsInputField}
                    value={genreDraft}
                    onChange={(e) => setGenreDraft(e.target.value)}
                    onKeyDown={handleGenreKeyDown}
                    onBlur={addGenre}
                    maxLength={40}
                    placeholder={genres.length === 0 ? 'MPB, rock, sertanejo…' : ''}
                    disabled={genres.length >= MAX_GENRES}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHead}>
                  <span className={styles.fieldLabel}>CONTE SOBRE VOCÊ *</span>
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
                  placeholder="Ex: Sou cantora e compositora, faço shows autorais de MPB e já me apresentei em bares e festivais da cidade. Quero transmitir meus próximos shows ao vivo."
                />
                <p className={styles.helper}>
                  O que você faz, com que frequência se apresenta e onde. Não precisa ser
                  perfeito.
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
