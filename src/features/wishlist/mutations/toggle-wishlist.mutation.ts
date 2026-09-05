'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { wishlistService } from '../services/wishlist.service';
import { wishlistKeys } from '../queries/get-wishlist';
import { normalizeError } from '@/lib/http/errors';

interface ToggleWishlistArgs {
  eventId: string;
  /** Estado ATUAL (antes do toggle) — decide se a mutation soma ou remove. */
  saved: boolean;
}

/**
 * Único ponto do repo com `onMutate` otimista (nenhum outro hoje faz isso).
 * Deliberado: um coração que só preenche depois do round-trip lê como clique
 * falho. Contido aqui de propósito — não copie este padrão para outra
 * mutation só porque está ao lado; a maioria dos fluxos (carrinho, ingressos)
 * precisa da confirmação do servidor antes de mudar a tela.
 */
export function useToggleWishlistMutation() {
  const qc = useQueryClient();
  const t = useTranslations('wishlist');

  return useMutation({
    mutationFn: async ({ eventId, saved }: ToggleWishlistArgs) => {
      try {
        if (saved) {
          await wishlistService.remove(eventId);
        } else {
          await wishlistService.add(eventId);
        }
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onMutate: async ({ eventId, saved }: ToggleWishlistArgs) => {
      await qc.cancelQueries({ queryKey: wishlistKeys.ids });

      const previous = qc.getQueryData<string[]>(wishlistKeys.ids);

      qc.setQueryData<string[]>(wishlistKeys.ids, (current) => {
        const ids = current ?? [];
        if (saved) return ids.filter((id) => id !== eventId);
        // Dois botões do mesmo evento podem estar na tela (card e detalhe) e
        // disparar juntos; sem esta guarda a lista ganharia o id duplicado.
        return ids.includes(eventId) ? ids : [...ids, eventId];
      });

      return { previous };
    },
    onSuccess: (_data, { saved }) => {
      // `saved` é o estado ANTES do toggle: se estava salvo, a mutation removeu.
      toast.success(saved ? t('removedToast') : t('savedToast'));
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(wishlistKeys.ids, context.previous);
      }
      // O app é trilíngue e a chave já existe; o carrinho hardcodar português
      // é dívida antiga, não convenção a repetir.
      toast.error(t('errorToast'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: wishlistKeys.ids });
      qc.invalidateQueries({ queryKey: wishlistKeys.list });
    },
  });
}
