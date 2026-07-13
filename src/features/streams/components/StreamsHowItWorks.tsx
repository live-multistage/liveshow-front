'use client';

import { useState } from 'react';
import { Radio, Layers, Rss, Camera, Plug, ChevronDown, BookOpen } from 'lucide-react';
import styles from './StreamsHowItWorks.module.scss';

const CONCEPTS = [
  { icon: Radio, name: 'Stream', desc: 'A transmissão do evento. Dê um título para identificá-la.' },
  { icon: Layers, name: 'Palco', desc: 'Agrupa as câmeras do evento (ex: Palco Principal).' },
  { icon: Rss, name: 'Feed', desc: 'Canais de vídeo dentro do palco (ex: Câmera Central).' },
  { icon: Camera, name: 'Câmera', desc: 'Recebe o sinal do OBS ou software de streaming via SRT.' },
] as const;

const STEPS = [
  <>Selecione o <strong>evento</strong> no topo da tela.</>,
  <>Clique em <strong>Nova transmissão</strong> — ou use <strong>Como começar</strong> para o passo a passo guiado.</>,
  <>Dentro da stream, crie um <strong>palco</strong>, depois um <strong>feed</strong> e então uma <strong>câmera</strong>.</>,
  <>Na câmera, abra <strong>Credenciais OBS</strong> para ver o Servidor (SRT URL) e a Stream Key.</>,
  <>Configure seu broadcaster com essas credenciais e inicie a transmissão.</>,
] as const;

const OBS_STEPS = [
  <>Abra o OBS Studio e vá em <strong>Configurações → Transmissão</strong>.</>,
  <>Em <strong>Serviço</strong>, selecione <strong>Personalizado</strong>.</>,
  <>Cole o <strong>Servidor (SRT URL)</strong> no campo "Servidor".</>,
  <>Cole a <strong>Stream Key</strong> no campo "Chave de transmissão".</>,
  <>Clique em <strong>OK</strong> e depois em <strong>Iniciar transmissão</strong>.</>,
] as const;

export function StreamsHowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.panel}>
      <button
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <BookOpen size={14} className={styles.toggleIcon} />
        <span className={styles.toggleLabel}>COMO FUNCIONA</span>
        <span className={styles.toggleHint}>Stream › Palco › Feed › Câmera</span>
        <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div className={styles.body}>
          {/* 1 — hierarquia */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>HIERARQUIA</div>
            <div className={styles.concepts}>
              {CONCEPTS.map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={c.name} className={styles.conceptWrap}>
                    <div className={styles.concept}>
                      <div className={styles.conceptIcon}>
                        <Icon size={16} />
                      </div>
                      <div className={styles.conceptName}>{c.name}</div>
                      <div className={styles.conceptDesc}>{c.desc}</div>
                    </div>
                    {i < CONCEPTS.length - 1 && <span className={styles.conceptArrow}>›</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2 — passo a passo */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>PASSO A PASSO</div>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={i} className={styles.step}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <span className={styles.stepText}>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 3 — conectar broadcaster */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <Plug size={12} className={styles.sectionLabelIcon} />
              CONECTAR UM BROADCASTER
            </div>
            <p className={styles.paragraph}>
              As câmeras recebem vídeo pelo protocolo <strong>SRT</strong>. Cada câmera tem seu
              próprio <strong>Servidor (SRT URL)</strong> e <strong>Stream Key</strong>, disponíveis
              no botão <strong>Credenciais OBS</strong> da câmera.
            </p>
            <div className={styles.obsCard}>
              <div className={styles.obsTitle}>OBS Studio</div>
              <ol className={styles.steps}>
                {OBS_STEPS.map((s, i) => (
                  <li key={i} className={styles.step}>
                    <span className={styles.stepNum}>{i + 1}</span>
                    <span className={styles.stepText}>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className={styles.note}>
              Streamlabs, vMix e ffmpeg seguem o mesmo padrão SRT — use o Servidor e a Stream Key nos
              campos equivalentes. Precisa invalidar uma key vazada? Use <strong>Rotacionar key</strong> na
              câmera; a key anterior para de funcionar na hora.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
