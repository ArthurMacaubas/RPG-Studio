'use client';

import { useEffect, useState } from 'react';
import { Eye, LockKeyhole, Users } from 'lucide-react';
import { fileAccessApi, type FileAccessData } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './FileAccessPanel.module.css';

export function FileAccessPanel({ fileId }: { fileId: string }) {
  const [access, setAccess] = useState<FileAccessData | null>(null);
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fileAccessApi.get(fileId).then((data) => { setAccess(data); setAvailable(true); }).catch(() => setAvailable(false));
  }, [fileId]);

  if (!available || !access?.file) return null;
  const currentAccess = access;

  async function save(next: FileAccessData) {
    const previous = currentAccess;
    setAccess(next);
    setSaving(true);
    try {
      const updated = await fileAccessApi.update(fileId, { restrictToGrants: Boolean(next.file?.restrictToGrants), grants: next.members.map((member) => ({ userId: member.id, canView: member.canView })) });
      setAccess(updated);
      toast({ tone: 'success', title: 'Visibilidade atualizada' });
    } catch (error) {
      setAccess(previous);
      toast({ tone: 'error', title: 'Não foi possível atualizar a visibilidade', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setSaving(false);
    }
  }

  function toggleRestricted() {
    void save({ ...currentAccess, file: { ...currentAccess.file!, restrictToGrants: !currentAccess.file!.restrictToGrants } });
  }

  function toggleMember(userId: string) {
    void save({ ...currentAccess, members: currentAccess.members.map((member) => member.id === userId ? { ...member, canView: !member.canView } : member) });
  }

  return <section className={styles.panel} aria-labelledby="file-access-title"><header className={styles.header}><div><div id="file-access-title" className={styles.title}>Visibilidade do arquivo</div><p>Controle o que cada jogador consegue consultar.</p></div><LockKeyhole size={16} /></header><label className={styles.mode}><input type="checkbox" checked={access.file.restrictToGrants} onChange={toggleRestricted} disabled={saving} /><span><strong>{access.file.restrictToGrants ? 'Somente jogadores selecionados' : 'Todos os jogadores da campanha'}</strong><small>{access.file.restrictToGrants ? 'Ative os jogadores abaixo para liberar este conteúdo.' : 'O arquivo segue visível para membros quando for publicado.'}</small></span></label>{access.file.restrictToGrants && <div className={styles.members}>{access.members.length === 0 ? <div className={styles.empty}><Users size={15} />Nenhum jogador convidado ainda.</div> : access.members.map((member) => <label key={member.id} className={styles.member}><input type="checkbox" checked={member.canView} onChange={() => toggleMember(member.id)} disabled={saving} /><span><strong>{member.name}</strong><small>{member.email}</small></span><Eye size={13} className={member.canView ? styles.visible : styles.hidden} /></label>)}</div>}</section>;
}
