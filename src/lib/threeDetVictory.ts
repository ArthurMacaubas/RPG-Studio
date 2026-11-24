export const THREEDET_SYSTEM_ID = '3det-victory' as const;
export const THREEDET_DEFAULT_BUDGET = 10;
export const THREEDET_DEFAULT_DISADVANTAGE_LIMIT = 2;

export type ThreeDetResourceKey = 'pa' | 'pm' | 'pv';

export interface ThreeDetResources {
  pa: { current: number; max: number };
  pm: { current: number; max: number };
  pv: { current: number; max: number };
}

export interface ThreeDetBuildInput {
  attributes: { poder?: number; habilidade?: number; resistencia?: number };
  skills?: Record<string, boolean>;
  advantages?: Array<{ cost?: number }>;
  disadvantages?: Array<{ value?: number }>;
  archetypes?: Array<{ cost?: number }>;
  budget?: number;
  disadvantageLimit?: number;
}

export function calculateThreeDetResources(
  attributes: ThreeDetBuildInput['attributes'],
  modifiers: Partial<Record<ThreeDetResourceKey, number>> = {},
  current?: Partial<Record<ThreeDetResourceKey, number>>
): ThreeDetResources {
  const max = {
    pa: Math.max(1, attributes.poder ?? 0) + (modifiers.pa ?? 0),
    pm: Math.max(1, attributes.habilidade ?? 0) * 5 + (modifiers.pm ?? 0),
    pv: Math.max(1, attributes.resistencia ?? 0) * 5 + (modifiers.pv ?? 0)
  };
  return {
    pa: { max: Math.max(1, max.pa), current: clamp(current?.pa ?? max.pa, 0, Math.max(1, max.pa)) },
    pm: { max: Math.max(1, max.pm), current: clamp(current?.pm ?? max.pm, 0, Math.max(1, max.pm)) },
    pv: { max: Math.max(1, max.pv), current: clamp(current?.pv ?? max.pv, 0, Math.max(1, max.pv)) }
  };
}

export function calculateThreeDetBuild(input: ThreeDetBuildInput) {
  const attributes = (input.attributes.poder ?? 0) + (input.attributes.habilidade ?? 0) + (input.attributes.resistencia ?? 0);
  const skills = Object.values(input.skills ?? {}).filter(Boolean).length;
  const advantages = (input.advantages ?? []).reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const archetypes = (input.archetypes ?? []).reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const returnedByDisadvantages = Math.min(
    input.disadvantageLimit ?? THREEDET_DEFAULT_DISADVANTAGE_LIMIT,
    (input.disadvantages ?? []).reduce((sum, item) => sum + Math.max(0, item.value ?? 0), 0)
  );
  const spent = attributes + skills + advantages + archetypes;
  const budget = input.budget ?? THREEDET_DEFAULT_BUDGET;
  return { budget, attributes, skills, advantages, archetypes, spent, returnedByDisadvantages, remaining: budget - spent + returnedByDisadvantages, valid: spent <= budget + returnedByDisadvantages };
}

export interface ThreeDetRollResult {
  dice: number[];
  diceCount: number;
  diceTotal: number;
  attribute: number;
  criticalCount: number;
  criticalAttributeMultiplier: number;
  total: number;
  target?: number;
  success?: boolean;
  criticalFailure: boolean;
}

export function calculateThreeDetDiceCount(input: { hasSkill?: boolean; gains?: number; losses?: number }) {
  const modifier = Math.sign((input.gains ?? 0) - (input.losses ?? 0));
  return Math.max(1, Math.min(3, 1 + (input.hasSkill ? 1 : 0) + modifier));
}

export function rollThreeDetTest(input: {
  attribute: number;
  hasSkill?: boolean;
  gains?: number;
  losses?: number;
  target?: number;
  criticalAttributeMultiplier?: number;
  random?: () => number;
}): ThreeDetRollResult {
  const diceCount = calculateThreeDetDiceCount(input);
  const random = input.random ?? (() => Math.random());
  const dice = Array.from({ length: diceCount }, () => Math.floor(random() * 6) + 1);
  const criticalCount = dice.filter((die) => die === 6).length;
  const criticalAttributeMultiplier = input.criticalAttributeMultiplier ?? 1;
  const total = dice.reduce((sum, die) => sum + die, 0) + input.attribute + criticalCount * input.attribute * criticalAttributeMultiplier;
  return {
    dice,
    diceCount,
    diceTotal: dice.reduce((sum, die) => sum + die, 0),
    attribute: input.attribute,
    criticalCount,
    criticalAttributeMultiplier,
    total,
    target: input.target,
    success: input.target === undefined ? undefined : total >= input.target,
    criticalFailure: dice.every((die) => die === 1)
  };
}

export function resolveThreeDetOpposed(left: ThreeDetRollResult, right: ThreeDetRollResult) {
  return left.total === right.total ? 'TIE' as const : left.total > right.total ? 'LEFT' as const : 'RIGHT' as const;
}

export function calculateThreeDetDamage(attack: number, defense: number) {
  if (defense >= attack * 2) return 0;
  return Math.max(1, attack - defense);
}

export function calculateThreeDetExperience(xp: number, xpSpent: number) {
  return { xp: Math.max(0, xp), xpSpent: Math.max(0, Math.min(xp, xpSpent)), characterPoints: Math.floor(Math.max(0, xpSpent) / 10) };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? Math.trunc(value) : min));
}

export const THREEDET_RULEBOOK = [
  { id: 'creation', category: 'Criação', title: 'Criação por pontos', summary: 'A ficha usa pontos de personagem para atributos, perícias e características. Custos não confirmados permanecem configuráveis pelo Mestre.', source: 'Regras resumidas e originais do RPG Campaign Studio.' },
  { id: 'attributes', category: 'Ficha', title: 'Poder, Habilidade e Resistência', summary: 'Os três atributos podem ser aplicados conforme a ação narrativa, inclusive em desafios mentais e sociais.' },
  { id: 'resources', category: 'Ficha', title: 'Recursos', summary: 'PA deriva de Poder; PM de Habilidade vezes cinco; PV de Resistência vezes cinco. O mínimo de cada máximo é 1.' },
  { id: 'tests', category: 'Testes', title: 'Testes com d6', summary: 'A rolagem usa de um a três d6, soma os dados ao atributo e permite meta ou oposição.' },
  { id: 'gains-losses', category: 'Testes', title: 'Ganhos e Perdas', summary: 'Ganhos e Perdas se cancelam; o modificador líquido desses efeitos fica limitado a um dado.' },
  { id: 'critical', category: 'Testes', title: 'Críticos', summary: 'Cada seis acrescenta novamente o atributo. Todos os dados em um sinalizam falha crítica para decisão narrativa do Mestre.' },
  { id: 'combat', category: 'Combate', title: 'Ataque, defesa e dano', summary: 'Ataques normalmente usam Poder, defesas normalmente usam Resistência e o dano é a diferença, com mínimo de um salvo defesa perfeita.' },
  { id: 'progression', category: 'Progressão', title: 'XP', summary: 'A ficha registra XP, gastos e evolução autorizada; a conversão base configurada é 10 XP para um ponto de personagem.' }
] as const;
