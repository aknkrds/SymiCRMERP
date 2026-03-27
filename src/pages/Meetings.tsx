import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, Trash2, Edit, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { useUsers } from '../hooks/useUsers';

type MeetingListItem = {
  id: string;
  title: string;
  date: string;
  organizerId?: string;
  organizerName?: string;
  status?: 'accepted' | 'pending' | 'declined' | 'unknown' | string;
};

const fireShortcut = (eventName: string) => {
  try {
    sessionStorage.setItem(`symi:shortcut:${eventName}`, String(Date.now()));
  } catch {}
  window.setTimeout(() => window.dispatchEvent(new Event(eventName)), 0);
};

export default function Meetings() {
  const { user } = useAuth();
  const { users: activeUsers } = useUsers({ includeAdmins: true });

  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDateTimeLocal, setMeetingDateTimeLocal] = useState('');
  const [meetingUserSearch, setMeetingUserSearch] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [activeDeclineMeetingId, setActiveDeclineMeetingId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings?userId=${encodeURIComponent(user.id)}&includePending=1`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      const normalized = arr.map((m: any) => ({
        id: String(m.id),
        title: String(m.title || 'Toplantı'),
        date: String(m.date),
        organizerId: m.organizerId ? String(m.organizerId) : undefined,
        organizerName: m.organizerName,
        status: m.status
      })) as MeetingListItem[];
      setMeetings(normalized);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchMeetings();
    const onUpdated = () => fetchMeetings();
    window.addEventListener('symi:meetingsUpdated', onUpdated);
    return () => window.removeEventListener('symi:meetingsUpdated', onUpdated);
  }, [fetchMeetings, user?.id]);

  const openNewMeeting = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setEditingMeetingId(null);
    setMeetingTitle('');
    setMeetingDateTimeLocal(local);
    setMeetingUserSearch('');
    setSelectedParticipantIds([]);
    setIsMeetingModalOpen(true);
  };

  useEffect(() => {
    const onCreate = () => openNewMeeting();
    window.addEventListener('symi:meetings:create', onCreate);
    try {
      const key = 'symi:shortcut:symi:meetings:create';
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        openNewMeeting();
      }
    } catch {}
    return () => window.removeEventListener('symi:meetings:create', onCreate);
  }, []);

  const openMeetingEditor = async (meetingId: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/meetings/${meetingId}?userId=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error('not ok');
      const m = await res.json();
      setEditingMeetingId(meetingId);
      setMeetingTitle(String(m.title || ''));
      const iso = String(m.scheduledAt || '');
      const d = iso ? new Date(iso) : new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setMeetingDateTimeLocal(local);
      const p = Array.isArray(m.participants) ? m.participants : [];
      setSelectedParticipantIds(
        p
          .map((x: any) => x && x.userId)
          .filter(Boolean)
          .map((x: any) => String(x))
          .filter((id: string) => id !== String(user.id))
      );
      setMeetingUserSearch('');
      setIsMeetingModalOpen(true);
    } catch {
      alert('Toplantı bilgileri alınamadı.');
    }
  };

  const handleSaveMeeting = async () => {
    if (!user?.id) return;
    const title = meetingTitle.trim();
    const dt = meetingDateTimeLocal.trim();
    if (!title || !dt) return;
    const scheduledAt = new Date(dt).toISOString();
    try {
      const isEdit = !!editingMeetingId;
      const res = await fetch(isEdit ? `/api/meetings/${editingMeetingId}` : '/api/meetings', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: user.id,
          scheduledAt,
          title,
          participantIds: selectedParticipantIds
        })
      });
      if (!res.ok) throw new Error('not ok');
      setIsMeetingModalOpen(false);
      setEditingMeetingId(null);
      window.dispatchEvent(new Event('symi:meetingsUpdated'));
    } catch {
      alert('Toplantı kaydedilirken hata oluştu.');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!user?.id) return;
    const ok = window.confirm('Toplantı silinsin mi?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/meetings/${meetingId}?organizerId=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('not ok');
      window.dispatchEvent(new Event('symi:meetingsUpdated'));
    } catch {
      alert('Toplantı silinemedi.');
    }
  };

  const respondMeeting = async (meetingId: string, response: 'accepted' | 'declined', reason?: string) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/meetings/${meetingId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, response, reason })
      });
      if (!res.ok) throw new Error('not ok');
      window.dispatchEvent(new Event('symi:meetingsUpdated'));
    } catch {
      alert('Toplantı yanıtı gönderilemedi.');
    }
  };

  const canManage = (m: MeetingListItem) => user?.id && m.organizerId && String(m.organizerId) === String(user.id);

  const filteredUsers = useMemo(() => {
    const q = meetingUserSearch.trim().toLowerCase();
    return activeUsers
      .filter(u => u.id !== user?.id)
      .filter(u => {
        if (!q) return true;
        return (
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.roleName || '').toLowerCase().includes(q)
        );
      });
  }, [activeUsers, meetingUserSearch, user?.id]);

  return (
    <div className="mx-auto max-w-screen-xl">
      <Modal
        isOpen={declineOpen}
        onClose={() => { setDeclineOpen(false); setDeclineReason(''); setActiveDeclineMeetingId(null); }}
        title="Toplantıya Katılamıyorum"
        size="md"
        theme="minimal"
      >
        <div className="space-y-3">
          <div className="text-sm text-[var(--text-muted)]">Neden katılamayacağınızı yazın.</div>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Örn: Aynı saatte başka toplantım var."
            className="w-full min-h-24 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setDeclineOpen(false); setDeclineReason(''); setActiveDeclineMeetingId(null); }}
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-slate-50 text-sm"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={async () => {
                const id = activeDeclineMeetingId;
                const r = declineReason.trim();
                if (!id || !r) return;
                await respondMeeting(id, 'declined', r);
                setDeclineOpen(false);
                setDeclineReason('');
                setActiveDeclineMeetingId(null);
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
            >
              Gönder
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isMeetingModalOpen}
        onClose={() => { setIsMeetingModalOpen(false); setEditingMeetingId(null); }}
        title={editingMeetingId ? 'Toplantı Düzenle' : 'Toplantı Planla'}
        size="lg"
        theme="minimal"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Tarih & Saat</div>
              <input
                type="datetime-local"
                value={meetingDateTimeLocal}
                onChange={(e) => setMeetingDateTimeLocal(e.target.value)}
                aria-label="Tarih ve saat"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
              />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Konu</div>
              <input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Toplantı konusu..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Katılımcılar</div>
              <div className="text-[10px] text-[var(--text-muted)]">{selectedParticipantIds.length} kişi</div>
            </div>
            <input
              value={meetingUserSearch}
              onChange={(e) => setMeetingUserSearch(e.target.value)}
              placeholder="Kişi ara..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-sm outline-none mb-2"
            />
            <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {filteredUsers.map(u => {
                const checked = selectedParticipantIds.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedParticipantIds(prev => {
                          if (e.target.checked) return Array.from(new Set([...prev, u.id]));
                          return prev.filter(x => x !== u.id);
                        });
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-main)] truncate">{u.fullName}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{u.roleName} • {u.username}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setIsMeetingModalOpen(false); setEditingMeetingId(null); }}
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-slate-50 text-sm"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSaveMeeting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              {editingMeetingId ? 'Kaydet' : 'Planla'}
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-main)]">Toplantılar</div>
            <div className="text-[11px] text-[var(--text-muted)]">Davetler, onaylar ve planlama</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { fireShortcut('symi:meetings:create'); }}
          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={16} />
          Yeni
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Kayıtlar</div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono">{meetings.length}</div>
        </div>

        {loading ? (
          <div className="p-5 text-[var(--text-muted)] text-sm">Yükleniyor...</div>
        ) : meetings.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)] text-sm">Toplantı bulunamadı.</div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {meetings.map((m) => {
              const dateStr = (() => {
                try {
                  const d = new Date(m.date);
                  if (isNaN(d.getTime())) return '';
                  return d.toLocaleString('tr-TR', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                } catch {
                  return '';
                }
              })();
              const pending = m.status === 'pending';
              return (
                <div key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-main)] truncate">{m.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-mono">{dateStr}</span>
                        {m.organizerName && <span className="inline-flex items-center gap-1"><UsersIcon size={12} /> {m.organizerName}</span>}
                        {m.status && <span className="px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-[10px]">{String(m.status)}</span>}
                      </div>
                    </div>
                    {canManage(m) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openMeetingEditor(m.id)}
                          className="p-2 rounded-xl border border-[var(--border-subtle)] hover:bg-white/5 text-[var(--text-main)]"
                          title="Düzenle"
                          aria-label="Düzenle"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeeting(m.id)}
                          className="p-2 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400"
                          title="Sil"
                          aria-label="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {pending && (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setActiveDeclineMeetingId(m.id); setDeclineOpen(true); }}
                        className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-white/5 text-sm font-semibold"
                      >
                        Katılamayacağım
                      </button>
                      <button
                        type="button"
                        onClick={() => respondMeeting(m.id, 'accepted')}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                      >
                        Katılacağım
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
