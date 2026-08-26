'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { customSystemApi } from '@/lib/api';
import type { CampaignAttributeDef, CampaignSkillDef, CampaignClassDef, CampaignRaceDef } from '@/types';
import styles from './CustomSystemBuilder.module.css';

type Tab = 'attributes' | 'skills' | 'classes' | 'races';

const TABS: { id: Tab; label: string }[] = [
  { id: 'attributes', label: 'Atributos' },
  { id: 'skills', label: 'Perícias' },
  { id: 'classes', label: 'Classes' },
  { id: 'races', label: 'Raças' }
];

export function CustomSystemBuilder({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<Tab>('attributes');
  const [attributes, setAttributes] = useState<CampaignAttributeDef[]>([]);
  const [skills, setSkills] = useState<CampaignSkillDef[]>([]);
  const [classes, setClasses] = useState<CampaignClassDef[]>([]);
  const [races, setRaces] = useState<CampaignRaceDef[]>([]);

  const [attrName, setAttrName] = useState('');
  const [attrShort, setAttrShort] = useState('');
  const [attrMax, setAttrMax] = useState(100);
  const [skillName, setSkillName] = useState('');
  const [className, setClassName] = useState('');
  const [raceName, setRaceName] = useState('');

  async function refresh() {
    const [a, s, c, r] = await Promise.all([
      customSystemApi.listAttributes(campaignId),
      customSystemApi.listSkills(campaignId),
      customSystemApi.listClasses(campaignId),
      customSystemApi.listRaces(campaignId)
    ]);
    setAttributes(a);
    setSkills(s);
    setClasses(c);
    setRaces(r);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function addAttribute() {
    if (!attrName.trim()) return;
    await customSystemApi.createAttribute(campaignId, {
      name: attrName.trim(),
      shortLabel: attrShort.trim() || undefined,
      max: attrMax
    });
    setAttrName('');
    setAttrShort('');
    setAttrMax(100);
    refresh();
  }

  async function addSkill() {
    if (!skillName.trim()) return;
    await customSystemApi.createSkill(campaignId, { name: skillName.trim() });
    setSkillName('');
    refresh();
  }

  async function addClass() {
    if (!className.trim()) return;
    await customSystemApi.createClass(campaignId, { name: className.trim() });
    setClassName('');
    refresh();
  }

  async function addRace() {
    if (!raceName.trim()) return;
    await customSystemApi.createRace(campaignId, { name: raceName.trim() });
    setRaceName('');
    refresh();
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Sistema Personalizado</div>
      <div className={styles.panelHint}>
        Defina os atributos, perícias, classes e raças usados nas fichas de NPCs e Personagens desta campanha.
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'attributes' && (
        <>
          <div className={styles.list}>
            {attributes.length === 0 && <div className={styles.emptyRow}>Nenhum atributo criado ainda.</div>}
            {attributes.map((a) => (
              <div key={a.id} className={styles.row}>
                <span className={styles.rowName}>{a.name}</span>
                <span className={styles.rowMeta}>
                  {a.shortLabel ?? '—'} · {a.min}–{a.max}
                </span>
                <span className={styles.rowSpacer} />
                <button
                  className={styles.deleteButton}
                  onClick={async () => {
                    await customSystemApi.removeAttribute(campaignId, a.id);
                    refresh();
                  }}
                  aria-label={`Excluir atributo ${a.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.newRow}>
            <input className={styles.input} placeholder="Nome (ex: Sanidade)" value={attrName} onChange={(e) => setAttrName(e.target.value)} />
            <input className={styles.smallInput} placeholder="SAN" value={attrShort} onChange={(e) => setAttrShort(e.target.value)} />
            <input
              className={styles.smallInput}
              type="number"
              placeholder="Máx."
              value={attrMax}
              onChange={(e) => setAttrMax(Number(e.target.value))}
            />
            <button className={styles.addButton} onClick={addAttribute} disabled={!attrName.trim()}>
              Adicionar
            </button>
          </div>
        </>
      )}

      {tab === 'skills' && (
        <>
          <div className={styles.list}>
            {skills.length === 0 && <div className={styles.emptyRow}>Nenhuma perícia criada ainda.</div>}
            {skills.map((s) => (
              <div key={s.id} className={styles.row}>
                <span className={styles.rowName}>{s.name}</span>
                <span className={styles.rowSpacer} />
                <button
                  className={styles.deleteButton}
                  onClick={async () => {
                    await customSystemApi.removeSkill(campaignId, s.id);
                    refresh();
                  }}
                  aria-label={`Excluir perícia ${s.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.newRow}>
            <input className={styles.input} placeholder="Nome da perícia" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
            <button className={styles.addButton} onClick={addSkill} disabled={!skillName.trim()}>
              Adicionar
            </button>
          </div>
        </>
      )}

      {tab === 'classes' && (
        <>
          <div className={styles.list}>
            {classes.length === 0 && <div className={styles.emptyRow}>Nenhuma classe criada ainda.</div>}
            {classes.map((c) => (
              <div key={c.id} className={styles.row}>
                <span className={styles.rowName}>{c.name}</span>
                <span className={styles.rowSpacer} />
                <button
                  className={styles.deleteButton}
                  onClick={async () => {
                    await customSystemApi.removeClass(campaignId, c.id);
                    refresh();
                  }}
                  aria-label={`Excluir classe ${c.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.newRow}>
            <input className={styles.input} placeholder="Nome da classe" value={className} onChange={(e) => setClassName(e.target.value)} />
            <button className={styles.addButton} onClick={addClass} disabled={!className.trim()}>
              Adicionar
            </button>
          </div>
        </>
      )}

      {tab === 'races' && (
        <>
          <div className={styles.list}>
            {races.length === 0 && <div className={styles.emptyRow}>Nenhuma raça criada ainda.</div>}
            {races.map((r) => (
              <div key={r.id} className={styles.row}>
                <span className={styles.rowName}>{r.name}</span>
                <span className={styles.rowSpacer} />
                <button
                  className={styles.deleteButton}
                  onClick={async () => {
                    await customSystemApi.removeRace(campaignId, r.id);
                    refresh();
                  }}
                  aria-label={`Excluir raça ${r.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.newRow}>
            <input className={styles.input} placeholder="Nome da raça" value={raceName} onChange={(e) => setRaceName(e.target.value)} />
            <button className={styles.addButton} onClick={addRace} disabled={!raceName.trim()}>
              Adicionar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
