'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Sparkles, Package, ScrollText, Trash2, UserRound, Skull } from 'lucide-react';
import { customSystemApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DiceRoller } from '@/components/ui/DiceRoller';
import {
  ORDEM_PARANORMAL_ATTRIBUTES,
  ORDEM_PARANORMAL_SKILLS,
  DND5E_ATTRIBUTES,
  DND5E_SKILLS,
  type SheetAttribute,
  type SheetSkill
} from '@/lib/systemPresets';
import type { CampaignClassDef, CampaignRaceDef, SheetAbilityItem, SheetData, SheetInventoryItem, SystemType } from '@/types';
import { SYSTEM_LABELS } from '@/types';
import styles from './CharacterSheet.module.css';

type SheetTab = 'overview' | 'skills' | 'abilities' | 'inventory' | 'notes';

interface CharacterSheetProps {
  campaignId: string;
  system: SystemType;
  data: SheetData;
  onChange: (next: SheetData) => void;
  variant?: 'CHARACTER' | 'THREAT';
}

const TAB_LABELS: Record<SheetTab, string> = {
  overview: 'Visão geral',
  skills: 'Perícias',
  abilities: 'Habilidades',
  inventory: 'Inventário',
  notes: 'Notas'
};

export function CharacterSheet({ campaignId, system, data, onChange, variant = 'CHARACTER' }: CharacterSheetProps) {
  const [attributes, setAttributes] = useState<SheetAttribute[]>([]);
  const [skills, setSkills] = useState<SheetSkill[]>([]);
  const [classes, setClasses] = useState<CampaignClassDef[]>([]);
  const [races, setRaces] = useState<CampaignRaceDef[]>([]);
  const [activeTab, setActiveTab] = useState<SheetTab>('overview');
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [newAbility, setNewAbility] = useState('');
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    setActiveTab('overview');
    if (system === 'ORDEM_PARANORMAL') {
      setAttributes(ORDEM_PARANORMAL_ATTRIBUTES);
      setSkills(ORDEM_PARANORMAL_SKILLS);
      setClasses([]);
      setRaces([]);
      return;
    }
    if (system === 'DND_5E') {
      setAttributes(DND5E_ATTRIBUTES);
      setSkills(DND5E_SKILLS);
      setClasses([]);
      setRaces([]);
      return;
    }
    Promise.all([
      customSystemApi.listAttributes(campaignId),
      customSystemApi.listSkills(campaignId),
      customSystemApi.listClasses(campaignId),
      customSystemApi.listRaces(campaignId)
    ]).then(([attrs, sk, cl, rc]) => {
      setAttributes(attrs.map((a) => ({ id: a.id, name: a.name, shortLabel: a.shortLabel ?? a.name.slice(0, 3).toUpperCase(), min: a.min, max: a.max, defaultVal: a.defaultVal })));
      setSkills(sk.map((s) => ({ id: s.id, name: s.name, linkedAttr: s.linkedAttr ?? undefined })));
      setClasses(cl);
      setRaces(rc);
    }).catch(() => {
      setAttributes([]);
      setSkills([]);
      setClasses([]);
      setRaces([]);
    });
  }, [campaignId, system]);

  const themeClass = system === 'ORDEM_PARANORMAL' ? styles.themeOrdem : system === 'DND_5E' ? styles.themeDnd : styles.themeCustom;
  const isOrdem = system === 'ORDEM_PARANORMAL';
  const isDnd = system === 'DND_5E';
  const isThreat = variant === 'THREAT';
  const visibleSkills = showAllSkills ? skills : skills.slice(0, 12);
  const coreAttributes = useMemo(() => isOrdem ? attributes.filter((attr) => ['forca', 'agilidade', 'intelecto', 'vigor', 'presenca'].includes(attr.id)) : isDnd ? attributes.filter((attr) => ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(attr.id)) : attributes, [attributes, isDnd, isOrdem]);

  function patch(patchData: Partial<SheetData>) {
    onChange({ ...data, ...patchData });
  }

  function setAttrValue(attrId: string, value: number) {
    patch({ attributes: { ...data.attributes, [attrId]: value } });
  }

  function setVital(key: 'current' | 'max' | 'secondaryCurrent' | 'secondaryMax', value: number) {
    patch({ vitals: { ...data.vitals, [key]: value } });
  }

  function setCombat(key: 'defense' | 'initiative' | 'movement' | 'proficiency', value: number) {
    patch({ combat: { ...data.combat, [key]: value } });
  }

  function toggleSkill(skillId: string) {
    patch({ skills: { ...data.skills, [skillId]: !(data.skills?.[skillId] ?? false) } });
  }

  function skillModifier(skill: SheetSkill) {
    if (!skill.linkedAttr) return 0;
    const value = data.attributes?.[skill.linkedAttr] ?? attributes.find((attr) => attr.id === skill.linkedAttr)?.defaultVal ?? 0;
    return isDnd ? Math.floor((value - 10) / 2) : value;
  }

  function addAbility() {
    const name = newAbility.trim();
    if (!name) return;
    const item: SheetAbilityItem = { id: `${Date.now()}-ability`, name };
    patch({ abilities: [...(data.abilities ?? []), item] });
    setNewAbility('');
  }

  function updateAbility(id: string, next: Partial<SheetAbilityItem>) {
    patch({ abilities: (data.abilities ?? []).map((item) => item.id === id ? { ...item, ...next } : item) });
  }

  function moveAbility(id: string, direction: -1 | 1) {
    const current = [...(data.abilities ?? [])];
    const index = current.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    const first = current[index];
    const second = current[target];
    if (!first || !second) return;
    current[index] = second;
    current[target] = first;
    patch({ abilities: current });
  }

  function removeAbility(id: string) {
    patch({ abilities: (data.abilities ?? []).filter((item) => item.id !== id) });
  }

  function addInventoryItem() {
    const name = newItem.trim();
    if (!name) return;
    const item: SheetInventoryItem = { id: `${Date.now()}-item`, name, quantity: 1 };
    patch({ inventory: [...(data.inventory ?? []), item] });
    setNewItem('');
  }

  function updateInventoryItem(id: string, next: Partial<SheetInventoryItem>) {
    patch({ inventory: (data.inventory ?? []).map((item) => item.id === id ? { ...item, ...next } : item) });
  }

  function moveInventoryItem(id: string, direction: -1 | 1) {
    const current = [...(data.inventory ?? [])];
    const index = current.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    const first = current[index];
    const second = current[target];
    if (!first || !second) return;
    current[index] = second;
    current[target] = first;
    patch({ inventory: current });
  }

  function removeInventoryItem(id: string) {
    patch({ inventory: (data.inventory ?? []).filter((item) => item.id !== id) });
  }

  if (attributes.length === 0 && skills.length === 0) return <EmptyState icon={<Sparkles size={18} />} title="Configure o sistema da campanha" description="Adicione atributos e perícias nas configurações para liberar a ficha personalizada." />;

  return (
    <section className={`${styles.panel} ${themeClass}`}>
      <header className={styles.sheetHeader}>
        <div className={styles.sheetIdentity}><div className={styles.sheetIcon}>{isThreat ? <Skull size={18} /> : <UserRound size={18} />}</div><div><div className={styles.panelTitle}>{isThreat ? 'Ficha de ameaça' : 'Ficha de personagem'}</div><div className={styles.systemLabel}>{SYSTEM_LABELS[system]}</div></div></div>
        <Badge tone={isThreat ? 'warning' : isOrdem ? 'accent' : isDnd ? 'info' : 'success'}>{isThreat ? 'Ameaça' : isOrdem ? 'Agente' : isDnd ? 'Aventureiro' : 'Personalizada'}</Badge>
      </header>

      <nav className={styles.tabs} aria-label="Abas da ficha">
        {(Object.keys(TAB_LABELS) as SheetTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>{TAB_LABELS[tab]}</button>)}
      </nav>

      {activeTab === 'overview' && <div className={styles.tabContent}>
        <div className={styles.identityGrid}>
          <label className={styles.field}><span>{isThreat ? 'Arquétipo ou subtipo' : 'Nome do personagem'}</span><input value={data.concept ?? ''} onChange={(event) => patch({ concept: event.target.value })} placeholder={isThreat ? 'Ex.: criatura aberrante, cultista veterano' : isOrdem ? 'Nome do agente' : isDnd ? 'Nome do aventureiro' : 'Nome ou conceito'} /></label>
          {!isThreat && <label className={styles.field}><span>Jogador</span><input value={data.playerName ?? ''} onChange={(event) => patch({ playerName: event.target.value })} placeholder="Nome do jogador" /></label>}
          {!isThreat && <label className={styles.field}><span>Pronomes</span><input value={data.pronouns ?? ''} onChange={(event) => patch({ pronouns: event.target.value })} placeholder="Ex.: ela/dela" /></label>}
          <label className={styles.field}><span>{isOrdem ? 'Origem' : isDnd ? 'Antecedente' : 'Contexto'}</span><input value={data.background ?? ''} onChange={(event) => patch({ background: event.target.value })} placeholder={isOrdem ? 'Ex.: Operário, Universitário' : isDnd ? 'Ex.: Criminoso, Herói do povo' : 'Defina o contexto'} /></label>
          <label className={styles.field}><span>{isOrdem ? 'NEX' : 'Nível'}</span><input type="number" min={1} value={data.level ?? 1} onChange={(event) => patch({ level: Number(event.target.value) })} /></label>
        </div>

        {!isThreat && (classes.length > 0 || races.length > 0) ? <div className={styles.selectRow}>
          {classes.length > 0 && <label className={styles.field}><span>Classe</span><select value={data.classId ?? ''} onChange={(event) => patch({ classId: event.target.value || undefined })}><option value="">Selecione</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          {races.length > 0 && <label className={styles.field}><span>Raça</span><select value={data.raceId ?? ''} onChange={(event) => patch({ raceId: event.target.value || undefined })}><option value="">Selecione</option>{races.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        </div> : null}

        <div className={styles.sectionHeading}><span>{isThreat ? 'Atributos da ameaça' : isOrdem ? 'Atributos do agente' : isDnd ? 'Atributos base' : 'Atributos definidos pelo Mestre'}</span><Badge tone="neutral">{coreAttributes.length} campos</Badge></div>
        <div className={styles.attrGrid}>{coreAttributes.map((attr) => <label key={attr.id} className={styles.attrCell}><span className={styles.attrLabel}>{attr.shortLabel}</span><small>{attr.name}</small><input type="number" min={attr.min} max={attr.max} value={data.attributes?.[attr.id] ?? attr.defaultVal} onChange={(event) => setAttrValue(attr.id, Number(event.target.value))} /></label>)}</div>

        {(isOrdem || isDnd) && <div className={styles.vitalsGrid}>
          <label className={`${styles.vitalCard} ${styles.vitalPrimary}`}><span>{isOrdem ? 'PV · Pontos de vida' : 'HP · Pontos de vida'}</span><div><input type="number" value={data.vitals?.current ?? data.attributes?.[isOrdem ? 'pv' : 'hp'] ?? 0} onChange={(event) => setVital('current', Number(event.target.value))} /><b>/</b><input type="number" value={data.vitals?.max ?? data.attributes?.[isOrdem ? 'pv' : 'hp'] ?? 0} onChange={(event) => setVital('max', Number(event.target.value))} /></div></label>
          <label className={styles.vitalCard}><span>{isOrdem ? 'PE · Esforço' : 'CA · Defesa'}</span><input type="number" value={isOrdem ? data.vitals?.secondaryCurrent ?? data.attributes?.pe ?? 0 : data.combat?.defense ?? data.attributes?.ac ?? 10} onChange={(event) => isOrdem ? setVital('secondaryCurrent', Number(event.target.value)) : setCombat('defense', Number(event.target.value))} /></label>
          {isOrdem && <label className={styles.vitalCard}><span>SAN · Sanidade</span><input type="number" value={data.vitals?.secondaryMax ?? data.attributes?.sanidade ?? 0} onChange={(event) => setVital('secondaryMax', Number(event.target.value))} /></label>}
        </div>}

        {isDnd && <div className={styles.combatGrid}><label className={styles.field}><span>Iniciativa</span><input type="number" value={data.combat?.initiative ?? 0} onChange={(event) => setCombat('initiative', Number(event.target.value))} /></label><label className={styles.field}><span>Deslocamento</span><input type="number" value={data.combat?.movement ?? 9} onChange={(event) => setCombat('movement', Number(event.target.value))} /></label><label className={styles.field}><span>Bônus de proficiência</span><input type="number" value={data.combat?.proficiency ?? 2} onChange={(event) => setCombat('proficiency', Number(event.target.value))} /></label></div>}
      </div>}

      {activeTab === 'skills' && <div className={styles.tabContent}><div className={styles.sectionHeading}><span>{isThreat ? 'Resistências e perícias' : isOrdem ? 'Perícias do agente' : isDnd ? 'Perícias e proficiências' : 'Perícias personalizadas'}</span><Badge tone="info">{Object.values(data.skills ?? {}).filter(Boolean).length} marcadas</Badge></div><div className={styles.skillsGrid}>{visibleSkills.map((skill) => { const checked = data.skills?.[skill.id] ?? false; return <label key={skill.id} className={`${styles.skillRow} ${checked ? styles.skillRowChecked : ''}`}><input type="checkbox" className={styles.skillCheckbox} checked={checked} onChange={() => toggleSkill(skill.id)} /><span>{skill.name}</span>{skill.linkedAttr && <small>{attributes.find((attr) => attr.id === skill.linkedAttr)?.shortLabel ?? skill.linkedAttr}</small>} {(isOrdem || isDnd) && <DiceRoller label={skill.name} modifier={skillModifier(skill)} />}</label>; })}</div>{skills.length > 12 && <Button variant="ghost" size="sm" onClick={() => setShowAllSkills((value) => !value)}>{showAllSkills ? 'Mostrar menos' : `Mostrar todas (${skills.length})`}</Button>}</div>}

      {activeTab === 'abilities' && <div className={styles.tabContent}><div className={styles.sectionHeading}><span>{isThreat ? 'Ações, poderes e ataques' : isOrdem ? 'Poderes e rituais' : isDnd ? 'Características e talentos' : 'Habilidades personalizadas'}</span><Badge tone="accent">{(data.abilities ?? []).length} itens</Badge></div><div className={styles.addRow}><input value={newAbility} onChange={(event) => setNewAbility(event.target.value)} placeholder={isThreat ? 'Nome da ação ou ataque' : isOrdem ? 'Nome do poder ou ritual' : isDnd ? 'Nome da característica ou talento' : 'Nome da habilidade'} onKeyDown={(event) => event.key === 'Enter' && addAbility()} /><Button icon={<Plus size={14} />} size="sm" onClick={addAbility}>Adicionar</Button></div>{(data.abilities ?? []).length === 0 ? <EmptyState icon={<Sparkles size={18} />} title="Nenhuma habilidade registrada" description="Adicione poderes, talentos, rituais ou capacidades especiais." /> : <div className={styles.itemList}>{data.abilities?.map((item, index) => <article key={item.id} className={styles.itemCard}><div className={styles.itemEditor}><input className={styles.itemInput} value={item.name} onChange={(event) => updateAbility(item.id, { name: event.target.value })} aria-label="Nome da habilidade" /><textarea className={styles.itemTextarea} value={item.description ?? ''} onChange={(event) => updateAbility(item.id, { description: event.target.value })} placeholder="Descrição, efeito e detalhes" aria-label="Descrição da habilidade" /><div className={styles.itemMetaRow}><label>Usos <input type="number" min={0} value={item.uses ?? 0} onChange={(event) => updateAbility(item.id, { uses: Number(event.target.value) })} /></label></div></div><div className={styles.itemActions}><button type="button" onClick={() => moveAbility(item.id, -1)} disabled={index === 0} aria-label="Mover habilidade para cima"><ArrowUp size={13} /></button><button type="button" onClick={() => moveAbility(item.id, 1)} disabled={index === (data.abilities?.length ?? 1) - 1} aria-label="Mover habilidade para baixo"><ArrowDown size={13} /></button><button type="button" onClick={() => removeAbility(item.id)} aria-label="Remover habilidade"><Trash2 size={13} /></button></div></article>)}</div>}</div>}

      {activeTab === 'inventory' && <div className={styles.tabContent}><div className={styles.sectionHeading}><span>{isOrdem ? 'Equipamento e itens' : isDnd ? 'Equipamento' : 'Inventário customizado'}</span><Badge tone="success">{(data.inventory ?? []).length} itens</Badge></div><div className={styles.addRow}><input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Nome do item ao inventário" onKeyDown={(event) => event.key === 'Enter' && addInventoryItem()} /><Button icon={<Plus size={14} />} size="sm" onClick={addInventoryItem}>Adicionar</Button></div>{(data.inventory ?? []).length === 0 ? <EmptyState icon={<Package size={18} />} title="Inventário vazio" description="Registre armas, equipamentos, artefatos e outros itens importantes." /> : <div className={styles.itemList}>{data.inventory?.map((item, index) => <article key={item.id} className={styles.itemCard}><div className={styles.itemEditor}><input className={styles.itemInput} value={item.name} onChange={(event) => updateInventoryItem(item.id, { name: event.target.value })} aria-label="Nome do item" /><textarea className={styles.itemTextarea} value={item.description ?? ''} onChange={(event) => updateInventoryItem(item.id, { description: event.target.value })} placeholder="Descrição e observações" aria-label="Descrição do item" /><div className={styles.itemMetaRow}><label>Quantidade <input type="number" min={0} value={item.quantity ?? 1} onChange={(event) => updateInventoryItem(item.id, { quantity: Number(event.target.value) })} /></label><label>Usos <input type="number" min={0} value={item.uses ?? 0} onChange={(event) => updateInventoryItem(item.id, { uses: Number(event.target.value) })} /></label></div></div><div className={styles.itemActions}><button type="button" onClick={() => moveInventoryItem(item.id, -1)} disabled={index === 0} aria-label="Mover item para cima"><ArrowUp size={13} /></button><button type="button" onClick={() => moveInventoryItem(item.id, 1)} disabled={index === (data.inventory?.length ?? 1) - 1} aria-label="Mover item para baixo"><ArrowDown size={13} /></button><button type="button" onClick={() => removeInventoryItem(item.id)} aria-label="Remover item"><Trash2 size={13} /></button></div></article>)}</div>}</div>}

      {activeTab === 'notes' && <div className={styles.tabContent}><div className={styles.sectionHeading}><span><ScrollText size={15} /> Anotações da ficha</span><Badge tone="neutral">Privado da ficha</Badge></div><textarea className={styles.notes} value={data.notes ?? ''} onChange={(event) => patch({ notes: event.target.value })} placeholder={isOrdem ? 'Anote pistas, condições, exposição paranormal e observações do agente...' : isDnd ? 'Anote magias, condições, objetivos e detalhes da aventura...' : 'Registre qualquer informação adicional da ficha...'} /></div>}
    </section>
  );
}
