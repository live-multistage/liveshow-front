'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';
import { AGE_BRACKETS, AGE_BRACKET_LABELS, type AgeBracket } from '../types/age-bracket.types';
import styles from './AgePersonalizationModal.module.scss';

interface Props {
  open: boolean;
  onSave: (ageBracket: AgeBracket) => void;
  onSkip: () => void;
  saving?: boolean;
}

export function AgePersonalizationModal({ open, onSave, onSkip, saving }: Props) {
  const [selected, setSelected] = useState<AgeBracket | null>(null);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onSkip(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sua faixa etária</DialogTitle>
          <DialogDescription>
            Usamos sua faixa etária para personalizar os anúncios que você vê. Leia nossa{' '}
            <Link href="/privacidade" className={styles.privacyLink}>política de privacidade</Link>.
          </DialogDescription>
        </DialogHeader>

        <fieldset className={styles.brackets}>
          <legend className={styles.srOnly}>Faixa etária</legend>
          {AGE_BRACKETS.map((bracket) => (
            <label
              key={bracket}
              className={`${styles.bracket} ${selected === bracket ? styles.bracketSelected : ''}`}
            >
              <input
                type="radio"
                name="ageBracket"
                value={bracket}
                checked={selected === bracket}
                onChange={() => setSelected(bracket)}
                className={styles.srOnly}
              />
              {AGE_BRACKET_LABELS[bracket]}
            </label>
          ))}
        </fieldset>

        <DialogFooter>
          <Button variant="outline" onClick={onSkip} disabled={saving}>
            Pular
          </Button>
          <Button disabled={!selected || saving} onClick={() => selected && onSave(selected)}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
