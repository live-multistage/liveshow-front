'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cartService, type CartView } from '../services/cart.service';
import { CART_KEY } from '../queries/cart.queries';
import { normalizeError, type AppError } from '@/lib/http/errors';

function cartErrorMessage(err: AppError): string {
  if (err.status === 409) return 'Este ingresso já está no carrinho.';
  if (err.status === 404) return 'Ingresso não encontrado.';
  if (err.status === 0) return 'Sem conexão. Verifique sua internet.';
  return err.message || 'Erro inesperado. Tente novamente.';
}

function useCartMutation<T>(
  fn: (arg: T) => Promise<CartView>,
  onSuccessToast?: (data: CartView) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg: T) => {
      try {
        return await fn(arg);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(CART_KEY, data);
      onSuccessToast?.(data);
    },
    onError: (err: AppError) => {
      toast.error(cartErrorMessage(err));
    },
  });
}

export const useAddToCartMutation = () =>
  useCartMutation(
    (id: string) => cartService.add(id),
    () => toast.success('Ingresso adicionado ao carrinho!'),
  );

export const useRemoveFromCartMutation = () =>
  useCartMutation(
    (eventId: string) => cartService.remove(eventId),
    () => toast.success('Ingresso removido do carrinho.'),
  );

export const useClearCartMutation = () =>
  useCartMutation(
    (_: void) => cartService.clear(),
    () => toast.success('Carrinho limpo.'),
  );
