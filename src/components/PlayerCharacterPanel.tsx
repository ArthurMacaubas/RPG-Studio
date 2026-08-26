'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, Cloud, Sparkles } from 'lucide-react';
import { playerCharacterApi } from '@/lib/api';
import { CharacterSheet } from '@/components/CharacterSheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { CampaignFile, SheetData, SystemType } from '@/types';
import styles from './PlayerCharacterPanel.module.css';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = { campaignId: string; system: SystemType };

function readSheet(file: CampaignFile): SheetData {
  return (file.data ?? {}) as SheetData;
}

export function PlayerCharacterPanel({ campaignId, system }: Props) {
  const [character, setCharacter] = useState<CampaignFile | null>(null);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await playerCharacterApi.get(campaignId);
      setCharacter(response.character);
      setSheet(response.character ? readSheet(response.character) : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar sua ficha.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  async function createCharacter(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const response = await playerCharacterApi.create(campaignId, name.trim());
      setCharacter(response.character);
      setSheet(readSheet(response.character));
      setName('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Não foi possível criar sua ficha.');
    } finally {
      setCreating(false);
    }
  }

  function changeSheet(next: SheetData) {
    setSheet(next);
    if (!character) return;
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await playerCharacterApi.update(character.id, next as Record<string, unknown>);
        setCharacter(updated);
        setSaveState('saved');
      } catch (saveError) {
        setSaveState('error');
        setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar sua ficha.');
      }
    }, 650);
  }

  const saveLabel = saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Salvo' : saveState === 'error' ? 'Erro ao salvar' : 'Autosave ativo';
  const SaveIcon = saveState === 'saving' ? Cloud : saveState === 'error' ? CircleAlert : Check;

  if (loading) return <section className={styles.panel}><div className={styles.loading}>Carregando sua ficha...</div></section>;

  return <section className={styles.panel}>
    <header className={styles.header}><div><div className={styles.eyebrow}><Sparkles size={13} /> Oficina do jogador</div><h2>Meu personagem</h2><p>Crie e desenvolva sua ficha sem acessar os controles do Mestre. O sistema da campanha define o formato da ficha.</p></div>{character && <Badge tone={saveState === 'error' ? 'danger' : saveState === 'saving' ? 'warning' : 'success'}><SaveIcon size={12} /> {saveLabel}</Badge>}</header>
    {error && <p className={styles.error}>{error}</p>}
    {!character ? <div className={styles.createCard}><div><strong>Você ainda não tem uma ficha nesta campanha.</strong><span>Comece pelo nome do personagem e personalize atributos, perícias, habilidades, inventário e notas.</span></div><form className={styles.createForm} onSubmit={createCharacter}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do personagem" aria-label="Nome do personagem" maxLength={160} required /><Button type="submit" variant="primary" size="sm" disabled={creating || !name.trim()}>{creating ? 'Criando...' : 'Criar minha ficha'}</Button></form></div> : sheet && <div className={styles.sheet}><div className={styles.characterHeading}><span>Ficha editável pelo jogador</span><strong>{character.name}</strong></div><CharacterSheet campaignId={campaignId} system={system} data={sheet} onChange={changeSheet} /></div>}
  </section>;
}
