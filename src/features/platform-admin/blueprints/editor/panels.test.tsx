vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = (key: string) => !key.startsWith('editor.enum.NONE');
    return t;
  },
}));

vi.mock('../../mailing/queries/mailing.queries', () => ({
  useMailingTemplatesQuery: () => ({
    data: [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Lembrete de show', category: 'ANNOUNCEMENT', language: 'pt', version: 3, lastTestedVersion: 2, updatedAt: '' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Boas-vindas', category: 'MARKETING', language: 'pt', version: 1, lastTestedVersion: 1, updatedAt: '' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { useEffect, useReducer } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintAnalysisError, BlueprintGraph } from '@live-show/api-contracts';
import buyers from './__fixtures__/reminder-buyers.json';
import { CATALOG, CATALOG_MAP } from './__fixtures__/catalog';
import { Palette } from './Palette';
import { Inspector } from './Inspector';
import { ProblemsFooter } from './ProblemsFooter';
import savers from './__fixtures__/reminder-savers.json';
import { editorReducer, graphToState, stateToGraph, type AvailableField, type EditorAction, type EditorState } from './useEditorGraph';
import { WaitUntilBuilder } from './fields/WaitUntilBuilder';

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('Palette', () => {
  it('groups the catalog by kind and adds a node on click', async () => {
    const onAdd = vi.fn();
    render(<Palette catalog={CATALOG} loading={false} disabled={false} highlightTriggers={false} onAdd={onAdd} />);
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'editor.groups.trigger', 'editor.groups.data', 'editor.groups.core', 'editor.groups.action',
    ]);
    await userEvent.click(screen.getByRole('button', { name: /Enviar e-mail/ }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ key: 'mailing.sendEmail' }));
  });

  it('filters by name, key or description, ignoring accents', async () => {
    render(<Palette catalog={CATALOG} loading={false} disabled={false} highlightTriggers={false} onAdd={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'editor.palette.search' }), 'condicao');
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([expect.stringContaining('Condição')]);
    await userEvent.clear(screen.getByRole('textbox', { name: 'editor.palette.search' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'editor.palette.search' }), 'zzz');
    expect(screen.getByText('editor.palette.empty')).toBeInTheDocument();
  });

  it('is disabled in read-only mode', () => {
    render(<Palette catalog={CATALOG} loading={false} disabled highlightTriggers={false} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pedido pago/ })).toBeDisabled();
  });
});

function InspectorHarness({ initial, errors = [], readOnly = false, onState, onDispatch }: {
  initial: EditorState; errors?: BlueprintAnalysisError[]; readOnly?: boolean; onState?(s: EditorState): void; onDispatch?(d: (a: EditorAction) => void): void;
}) {
  const [state, dispatch] = useReducer(editorReducer, initial);
  onState?.(state);
  useEffect(() => { onDispatch?.(dispatch); }, [onDispatch]);
  return <Inspector state={state} dispatch={dispatch} catalog={CATALOG_MAP} errors={errors} readOnly={readOnly} />;
}

const buyersAt = (selected: string) => graphToState(buyers as BlueprintGraph, selected);

describe('Inspector', () => {
  it('asks to select a node when nothing is selected', () => {
    render(<InspectorHarness initial={graphToState(buyers as BlueprintGraph)} />);
    expect(screen.getByText('editor.inspector.empty')).toBeInTheDocument();
  });

  it('edits a text field and inserts a variable at the caret', async () => {
    let latest: EditorState | undefined;
    render(<InspectorHarness initial={buyersAt('n')} onState={(s) => { latest = s; }} />);
    const title = screen.getByLabelText('Título') as HTMLInputElement;
    expect(title.value).toBe('{{e2.title}} começa em 2h');
    expect(screen.getByText(/editor.fields.counter:\{"count":25,"max":120\}/)).toBeInTheDocument();

    await userEvent.clear(title);
    await userEvent.type(title, 'Oi ');
    const addVariable = screen.getAllByRole('button', { name: 'editor.fields.addVariable' })[0];
    await userEvent.click(addVariable);
    await userEvent.click(await screen.findByRole('menuitem', { name: /\{\{e2\.title\}\}/ }));
    expect(stateToGraph(latest!).nodes.find((n) => n.id === 'n')?.config.title).toBe('Oi {{e2.title}}');
  });

  it('lists upstream refs grouped by node, with type mismatches and personal data disabled', async () => {
    let latest: EditorState | undefined;
    const withProfile = editorReducer(
      editorReducer(buyersAt('e1'), { type: 'add', entry: CATALOG_MAP.get('account.profile@1')!, position: { x: 0, y: 400 } }),
      { type: 'connect', from: 't', to: 'p1' },
    );
    const state = editorReducer(editorReducer(withProfile, { type: 'connect', from: 'p1', to: 'e1' }), { type: 'select', id: 'e1' });
    render(<InspectorHarness initial={state} onState={(s) => { latest = s; }} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Evento' }));
    expect(screen.getByRole('option', { name: /p1 · Perfil do usuário → firstName/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: /t · Pedido pago → orderId/ })).not.toHaveAttribute('aria-disabled');
    await userEvent.click(screen.getByRole('option', { name: /t · Pedido pago → orderId/ }));
    expect(latest!.nodes.find((n) => n.id === 'e1')?.config.eventId).toBe('{{t.orderId}}');
  });

  it('shows the mailing template select with tested state and category', async () => {
    let latest: EditorState | undefined;
    render(<InspectorHarness initial={buyersAt('m')} onState={(s) => { latest = s; }} />);
    expect(screen.getByText(/editor.template.notFound/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'editor.template.label' }));
    expect(screen.getByRole('option', { name: /Lembrete de show.*templates.untested/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: /Boas-vindas.*templates.tested/ }));
    expect(latest!.nodes.find((n) => n.id === 'm')?.config.templateId).toBe('22222222-2222-2222-2222-222222222222');
    expect(screen.getByText(/editor.template.category:\{"category":"category.MARKETING"\}/)).toBeInTheDocument();
  });

  it('builds the wait expression and the if-past choice', async () => {
    let latest: EditorState | undefined;
    render(<InspectorHarness initial={buyersAt('w')} onState={(s) => { latest = s; }} />);
    const amount = screen.getByRole('spinbutton', { name: 'editor.wait.amount' });
    expect(amount).toHaveValue(2);
    expect(screen.getByText(/editor.wait.summary/)).toHaveTextContent('"amount":2');
    await userEvent.clear(amount);
    await userEvent.type(amount, '24');
    expect(latest!.nodes.find((n) => n.id === 'w')?.config.at).toBe('{{e1.startsAt}} - 24h');

    expect(screen.getByRole('radio', { name: 'editor.wait.end' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'editor.wait.continue' }));
    expect(latest!.nodes.find((n) => n.id === 'w')?.config.ifPast).toBe('continue');
  });

  it('edits condition rules: toggles E/OU, sets "agora", removes and adds rules', async () => {
    let latest: EditorState | undefined;
    render(<InspectorHarness initial={buyersAt('c')} onState={(s) => { latest = s; }} />);
    const expr = () => latest!.nodes.find((n) => n.id === 'c')?.config.expression;

    expect(screen.getByRole('button', { name: /editor.condition.now/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'editor.condition.and' }));
    expect(expr()).toEqual({ or: [{ eq: ['{{e2.status}}', 'PUBLISHED'] }, { gt: ['{{e2.startsAt}}', 'now'] }] });

    await userEvent.click(screen.getAllByRole('button', { name: 'editor.condition.removeRule' })[1]);
    expect(expr()).toEqual({ or: [{ eq: ['{{e2.status}}', 'PUBLISHED'] }] });

    // "+ Adicionar regra" adds an incomplete row (no ref, no value) but must
    // not change the emitted config — an incomplete rule never serializes.
    await userEvent.click(screen.getByRole('button', { name: 'editor.condition.addRule' }));
    expect(expr()).toEqual({ or: [{ eq: ['{{e2.status}}', 'PUBLISHED'] }] });
    expect(screen.getByText('editor.condition.incomplete')).toBeInTheDocument();

    // Completing the new row (pick a field, fill the value) emits it too.
    const combos = screen.getAllByRole('combobox');
    await userEvent.click(combos[combos.length - 2]);
    await userEvent.click(await screen.findByRole('option', { name: /e2 · Evento por id → status/ }));
    const operands = screen.getAllByRole('textbox', { name: 'editor.condition.value' });
    await userEvent.type(operands[operands.length - 1], 'LIVE');
    expect(expr()).toEqual({ or: [{ eq: ['{{e2.status}}', 'PUBLISHED'] }, { eq: ['{{e2.status}}', 'LIVE'] }] });
    expect(screen.queryByText('editor.condition.incomplete')).not.toBeInTheDocument();

    expect(within(screen.getByText('editor.inspector.outputs').parentElement as HTMLElement).getByText(/editor.ports.true → Notificação no app/)).toBeInTheDocument();
  });

  it('drops the stale ConditionBuilder draft when a different version loads with the same node id', () => {
    let dispatch: ((a: EditorAction) => void) | undefined;
    render(<InspectorHarness initial={buyersAt('c')} onDispatch={(d) => { dispatch = d; }} />);
    // buyers' "c" has 2 and-joined rules.
    expect(screen.getAllByRole('button', { name: 'editor.condition.removeRule' })).toHaveLength(2);

    act(() => dispatch!({ type: 'load', graph: savers as BlueprintGraph, selectedId: 'c' }));

    // savers' "c" has 4 and-joined rules — the stale 2-row draft must not
    // still be on screen (it would otherwise show the wrong condition, and
    // rulesToCondition would then silently re-emit only those 2 rules).
    expect(screen.getAllByRole('button', { name: 'editor.condition.removeRule' })).toHaveLength(4);
  });

  it('shows the invalid-JSON hint on blur instead of silently dropping the raw condition', async () => {
    let latest: EditorState | undefined;
    const withRawCondition = editorReducer(buyersAt('c'), {
      type: 'setConfig', id: 'c', field: 'expression', value: { not: { eq: ['{{e2.status}}', 'LIVE'] } },
    });
    render(<InspectorHarness initial={withRawCondition} onState={(s) => { latest = s; }} />);
    const textarea = screen.getByRole('textbox', { name: 'editor.inspector.rules' });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '{{{{not json');
    await userEvent.tab();
    expect(screen.getByText('detail.invalidJson')).toBeInTheDocument();
    expect(latest!.nodes.find((n) => n.id === 'c')?.config.expression).toEqual({ not: { eq: ['{{e2.status}}', 'LIVE'] } });
  });

  it('lists this node\'s problems, and duplicates / deletes the node', async () => {
    let latest: EditorState | undefined;
    render(<InspectorHarness initial={buyersAt('m')} errors={[{ nodeId: 'm', code: 'BAD_REFERENCE', message: '{{e6.title}} is not available here' }]} onState={(s) => { latest = s; }} />);
    expect(screen.getByText('errors.BAD_REFERENCE')).toBeInTheDocument();
    expect(screen.getByText('{{e6.title}} is not available here')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'editor.inspector.duplicate' }));
    expect(latest!.selectedId).toBe('m1');
    await userEvent.click(screen.getByRole('button', { name: 'editor.inspector.remove' }));
    expect(latest!.nodes.some((n) => n.id === 'm1')).toBe(false);
  });

  it('renames the node id on blur, rewriting references', async () => {
    let latest: EditorState | undefined;
    render(<InspectorHarness initial={buyersAt('e2')} onState={(s) => { latest = s; }} />);
    const id = screen.getByRole('textbox', { name: 'editor.inspector.nodeId' });
    await userEvent.clear(id);
    await userEvent.type(id, 'ev{Enter}');
    expect(latest!.selectedId).toBe('ev');
    expect(latest!.nodes.find((n) => n.id === 'n')?.config.link).toBe('/events/{{ev.slug}}');
  });

  it('disables every control in read-only mode', () => {
    render(<InspectorHarness initial={buyersAt('n')} readOnly />);
    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'editor.inspector.nodeId' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'editor.inspector.remove' })).toBeDisabled();
  });
});

describe('WaitUntilBuilder', () => {
  const fields: AvailableField[] = [
    { nodeId: 'p', nodeLabel: 'Perfil', field: 'birthAt', path: [], depth: 0, out: { type: 'datetime', class: 'PERSONAL', description: 'Nascimento' } },
    { nodeId: 'e', nodeLabel: 'Evento', field: 'startsAt', path: [], depth: 0, out: { type: 'datetime', class: 'PUBLIC', description: 'Início' } },
  ];

  it('rejects a PERSONAL datetime field even though its type matches', async () => {
    render(<WaitUntilBuilder id="w" value={undefined} fields={fields} onChange={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('combobox')[0]);
    expect(screen.getByRole('option', { name: /p · Perfil → birthAt/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('editor.fields.personalNotAllowed')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /e · Evento → startsAt/ })).not.toHaveAttribute('aria-disabled');
  });
});

describe('ProblemsFooter', () => {
  const errors: BlueprintAnalysisError[] = [
    { nodeId: 'e2', code: 'INVALID_CONFIG', message: '"eventId" is required' },
    { code: 'NO_TRIGGER', message: 'the blueprint needs one trigger node' },
  ];

  it('renders nothing without errors', () => {
    const { container } = render(<ProblemsFooter errors={[]} open onToggle={vi.fn()} onSelectNode={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists errors, selects a node on click and collapses', async () => {
    const onSelectNode = vi.fn();
    const onToggle = vi.fn();
    render(<ProblemsFooter errors={errors} open onToggle={onToggle} onSelectNode={onSelectNode} />);
    expect(screen.getByRole('button', { name: /editor.problems:\{"count":2\}/ })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: /e2.*errors.INVALID_CONFIG/ }));
    expect(onSelectNode).toHaveBeenCalledWith('e2');
    expect(screen.getByRole('button', { name: /errors.NO_TRIGGER/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /editor.problems/ }));
    expect(onToggle).toHaveBeenCalled();
  });
});
