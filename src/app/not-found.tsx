import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/shared/components/Navbar';
import { NotFoundContent } from '@/shared/components/NotFoundContent';
import { Footer } from '@/shared/components/Footer/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('notFound');
  return { title: t('metaTitle') };
}

/**
 * 404 da aplicação inteira.
 *
 * Uma rota não encontrada não passa por nenhum layout de route group, então a
 * Navbar não vem de graça como vem em `(public)` ou `(user)` — ela é montada
 * aqui de propósito. Sem isso o usuário cai numa página sem nenhuma saída de
 * navegação, que é exatamente o que um 404 não pode ser.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <NotFoundContent />
      <Footer />
    </>
  );
}
