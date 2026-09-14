import type { BlueprintCatalogEntry } from '@live-show/api-contracts';

// Mirrors GET /blueprints/catalog on the orchestrator (BlueprintCatalog.entries():
// triggers carry the injected dedupeKey, core.condition carries ports).
const dedupeKey = {
  kind: 'text', template: true, acceptsPersonal: false, maxLength: 200, required: true,
  description: 'Chave de deduplicação, ex.: purchase:{{t.eventId}}:{{t.userId}}',
} as const;
const uuidRef = (description: string) => ({ kind: 'ref', type: 'uuid', required: true, description }) as const;

export const CATALOG: BlueprintCatalogEntry[] = [
  { kind: 'core', key: 'core.condition', version: 1, label: 'Condição', description: 'Compara valores e segue por "se verdadeiro" ou "se falso".',
    config: { expression: { kind: 'condition', required: true, description: 'Expressão de comparação' } }, outputs: {}, ports: ['true', 'false'] },
  { kind: 'core', key: 'core.waitUntil', version: 1, label: 'Esperar até', description: 'Pausa a execução até um horário absoluto ou relativo a um dado.',
    config: {
      at: { kind: 'datetimeExpr', required: true, description: 'Ex.: {{e.startsAt}} - 24h' },
      ifPast: { kind: 'enum', values: ['continue', 'end'], required: true, description: 'Se o horário já passou' },
    }, outputs: {} },
  { kind: 'core', key: 'core.end', version: 1, label: 'Fim', description: 'Encerra a execução.', config: {}, outputs: {} },
  // Mirrors the orchestrator's CORE_NODES entries (domain/core-nodes.ts) for forEach/switch.
  { kind: 'core', key: 'core.forEach', version: 1, label: 'Para cada',
    description: 'Executa o ramo "cada item" uma vez por item da lista, em execuções filhas; segue por "depois" imediatamente.',
    ports: ['each', 'done'], dynamicOutputs: 'forEach',
    config: {
      items: { kind: 'ref', type: { list: 'json' }, required: true, description: 'Lista a percorrer' },
      maxItems: { kind: 'number', min: 1, max: 5000, required: false, description: 'Máximo de itens (padrão 500)' },
    },
    outputs: {
      item: { type: 'json', class: 'INTERNAL', description: 'Item atual', port: 'each' },
      index: { type: 'number', class: 'INTERNAL', description: 'Posição (0-based)', port: 'each' },
    } },
  { kind: 'core', key: 'core.switch', version: 1, label: 'Escolher',
    description: 'Compara um valor com cada caso e segue pela porta correspondente, ou por "padrão".',
    ports: ['default'], dynamicPorts: 'switch',
    config: {
      value: { kind: 'ref', type: 'string', required: true, description: 'Valor a comparar' },
      cases: { kind: 'cases', maxCases: 12, required: true, description: 'Casos' },
    }, outputs: {} },
  { kind: 'trigger', key: 'events.published', version: 1, event: 'event.published', label: 'Evento publicado', description: 'Um evento foi publicado.',
    config: { dedupeKey }, outputs: {
      eventId: { type: 'uuid', class: 'INTERNAL', description: 'Evento publicado' },
      organizationId: { type: 'uuid', class: 'INTERNAL', description: 'Organização' },
      title: { type: 'string', class: 'PUBLIC', description: 'Título' },
    } },
  { kind: 'data', key: 'follows.artistFollowers', version: 1, label: 'Seguidores do artista', description: 'Lista os seguidores de um artista, lida no momento em que o nó executa.',
    config: { eventId: uuidRef('Evento') }, outputs: {
      followers: {
        type: { list: { object: { userId: { type: 'uuid', class: 'INTERNAL', description: 'Seguidor' } } } },
        class: 'INTERNAL', description: 'Seguidores',
      },
      count: { type: 'number', class: 'INTERNAL', description: 'Total de seguidores' },
    } },
  { kind: 'trigger', key: 'orders.paid', version: 1, event: 'order.paid', label: 'Pedido pago', description: 'Um pedido foi pago; uma execução por evento do pedido.',
    config: { dedupeKey }, outputs: {
      userId: { type: 'uuid', class: 'INTERNAL', description: 'Comprador' },
      eventId: { type: 'uuid', class: 'INTERNAL', description: 'Evento comprado' },
      orderId: { type: 'uuid', class: 'INTERNAL', description: 'Pedido' },
    } },
  { kind: 'trigger', key: 'wishlist.itemAdded', version: 1, event: 'wishlist.item-added', label: 'Salvou um evento', description: 'Um usuário adicionou um evento à lista de salvos.',
    config: { dedupeKey }, outputs: {
      userId: { type: 'uuid', class: 'INTERNAL', description: 'Quem salvou' },
      eventId: { type: 'uuid', class: 'INTERNAL', description: 'Evento salvo' },
    } },
  { kind: 'data', key: 'events.byId', version: 1, label: 'Evento por id', description: 'Dados públicos de um evento, lidos no momento em que o nó executa.',
    config: { eventId: uuidRef('Evento') }, outputs: {
      title: { type: 'string', class: 'PUBLIC', description: 'Título' },
      slug: { type: 'string', class: 'PUBLIC', description: 'Slug público' },
      startsAt: { type: 'datetime', class: 'PUBLIC', description: 'Início' },
      status: { type: 'string', class: 'INTERNAL', description: 'Status (PUBLISHED, LIVE, CANCELLED…)' },
    } },
  { kind: 'data', key: 'ticketing.hasAccess', version: 1, label: 'Tem ingresso?', description: 'Se o usuário tem qualquer acesso ao evento.',
    config: { userId: uuidRef('Usuário'), eventId: uuidRef('Evento') }, outputs: { hasAccess: { type: 'boolean', class: 'INTERNAL', description: 'true se tem acesso' } } },
  { kind: 'data', key: 'wishlist.stillSaved', version: 1, label: 'Ainda está salvo?', description: 'Se o evento continua na lista de salvos do usuário.',
    config: { userId: uuidRef('Usuário'), eventId: uuidRef('Evento') }, outputs: { saved: { type: 'boolean', class: 'INTERNAL', description: 'true se ainda salvo' } } },
  { kind: 'data', key: 'account.profile', version: 1, label: 'Perfil do usuário', description: 'Primeiro nome para personalizar mensagens.',
    config: { userId: uuidRef('Usuário') }, outputs: { firstName: { type: 'string', class: 'PERSONAL', description: 'Primeiro nome' } } },
  { kind: 'action', key: 'notifications.inApp', version: 1, label: 'Notificação no app', description: 'Cria a notificação do sino (e o push, se habilitado).',
    config: {
      recipient: uuidRef('Destinatário (userId)'),
      type: { kind: 'enum', values: ['EVENT', 'TICKET', 'RECOMMENDATION'], required: true, description: 'Categoria' },
      title: { kind: 'text', template: true, acceptsPersonal: true, maxLength: 120, required: true, description: 'Título' },
      message: { kind: 'text', template: true, acceptsPersonal: true, maxLength: 500, required: true, description: 'Mensagem' },
      link: { kind: 'text', template: true, acceptsPersonal: false, maxLength: 300, required: false, description: 'Caminho interno' },
    }, outputs: {} },
  { kind: 'action', key: 'mailing.sendEmail', version: 1, label: 'Enviar e-mail', description: 'Envia um template testado do mailing.',
    config: {
      templateId: { kind: 'uuid', required: true, description: 'Template do mailing (precisa estar testado)' },
      recipient: uuidRef('Destinatário (userId)'),
      eventRef: { kind: 'ref', type: 'uuid', required: false, description: 'Evento usado pelos cartões "evento do contexto"' },
      preference: { kind: 'enum', values: ['TICKET_REMINDERS', 'NEWS_PROMOS', 'NONE'], required: true, description: 'Preferência' },
    }, outputs: {} },
  { kind: 'core', key: 'core.delay', version: 1, label: 'Esperar', description: 'Pausa a execução por um intervalo fixo (ex.: 2h, 3d).',
    config: { duration: { kind: 'duration', required: true, description: 'Intervalo: 30m, 2h, 3d (máx. 30 dias)' } }, outputs: {} },
  // Mirrors the real http.request@1 node definition (orchestrator src/blueprints/nodes/http/http-request.node.ts).
  { kind: 'action', key: 'http.request', version: 1, mode: 'call', label: 'Chamar HTTP',
    description: 'Faz uma requisição HTTP a um host da allowlist da plataforma. Bloqueia hosts fora da allowlist e IPs privados (SSRF).',
    secretFields: ['url', 'headers'], ports: ['next', 'error'], optionalPorts: ['error'],
    config: {
      method: { kind: 'enum', values: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true, description: 'Método HTTP' },
      url: { kind: 'text', template: true, acceptsPersonal: false, maxLength: 2000, required: true, description: 'URL de destino (https, host precisa estar na allowlist)' },
      headers: { kind: 'keyValueList', template: true, maxItems: 20, required: false, description: 'Cabeçalhos da requisição' },
      body: { kind: 'text', template: true, acceptsPersonal: false, maxLength: 20000, required: false, description: 'Corpo da requisição' },
      timeoutMs: { kind: 'number', required: false, description: 'Timeout em milissegundos', min: 100, max: 10000 },
    },
    outputs: {
      status: { type: 'number', class: 'INTERNAL', description: 'Código de status HTTP' },
      ok: { type: 'boolean', class: 'INTERNAL', description: 'true quando status < 300' },
      body: { type: 'json', class: 'INTERNAL', description: 'Corpo da resposta' },
      headers: { type: 'json', class: 'INTERNAL', description: 'Cabeçalhos da resposta' },
      error: {
        type: { object: { code: { type: 'string', class: 'INTERNAL', description: 'Código do erro' }, message: { type: 'string', class: 'INTERNAL', description: 'Mensagem do erro' } } },
        class: 'INTERNAL', description: 'Erro da chamada', port: 'error',
      },
    } },
  // Mirrors the `test.http` call-action fixture from the analyzer spec (Task 4): next/error ports,
  // a json output and a nested object output — used to exercise availableFields' port + path handling.
  { kind: 'action', key: 'test.http', version: 1, mode: 'call', label: 'HTTP', description: 'Chama um endpoint externo.',
    secretFields: ['url', 'headers'], ports: ['next', 'error'], optionalPorts: ['error'],
    config: {
      url: { kind: 'text', template: true, acceptsPersonal: false, maxLength: 2000, required: true, description: 'URL' },
      headers: { kind: 'keyValueList', template: true, maxItems: 20, required: false, description: 'Cabeçalhos' },
    },
    outputs: {
      status: { type: 'number', class: 'INTERNAL', description: 'Status HTTP' },
      body: { type: 'json', class: 'INTERNAL', description: 'Corpo da resposta' },
      partner: { type: { object: { name: { type: 'string', class: 'PUBLIC', description: 'Nome' } } }, class: 'INTERNAL', description: 'Dados do parceiro' },
      error: {
        type: { object: { code: { type: 'string', class: 'INTERNAL', description: 'Código' }, message: { type: 'string', class: 'INTERNAL', description: 'Mensagem' } } },
        class: 'INTERNAL', description: 'Erro', port: 'error',
      },
    } },
];

export const CATALOG_MAP = new Map(CATALOG.map((e) => [`${e.key}@${e.version}`, e]));
