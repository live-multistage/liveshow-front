import { httpClient } from '@/lib/http/client';
import type { AccessibleEvent } from '../types/my-list.types';

export const myListService = {
  /**
   * Os eventos que ESTE usuário pode assistir. O backend deriva o id do token
   * — não existe parâmetro de usuário nesta rota, por decisão de segurança.
   */
  getAccessibleEvents: async (): Promise<AccessibleEvent[]> => {
    const { data } = await httpClient.get<AccessibleEvent[]>('/me/accessible-events');
    return data;
  },
};
