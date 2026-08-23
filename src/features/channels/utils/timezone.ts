const FALLBACK_TIMEZONE = 'America/Sao_Paulo';

// O fuso do navegador como padrão: quem cria o canal quase sempre está no fuso
// em que ele vai ao ar, e digitar "America/Sao_Paulo" à mão é um convite a erro.
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function supportedTimezones(): string[] {
  try {
    const zones = Intl.supportedValuesOf?.('timeZone') ?? [];
    // jsdom e navegadores antigos não expõem a lista — sem ela o select ficaria
    // vazio e o usuário não conseguiria escolher o fuso já detectado.
    return zones.length > 0 ? zones : [FALLBACK_TIMEZONE];
  } catch {
    return [FALLBACK_TIMEZONE];
  }
}
