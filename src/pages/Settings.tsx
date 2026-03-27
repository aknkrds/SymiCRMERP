import { useState, useEffect } from 'react';
import {
  Users, Shield, Plus, Trash2, Edit, Lock, UserX, UserCheck, Download, Upload, Database, AlertTriangle, Wand2, Box, Building, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { useCompanySettings } from '../hooks/useCompanySettings';
import ProductMoldSettings from '../components/settings/ProductMoldSettings';
import { ERPPageLayout } from '../components/ui/ERPPageLayout';

interface Role { id: string; name: string; permissions: string[]; }
interface User { id: string; username: string; fullName: string; roleId: string; roleName: string; isActive: number; password?: string; }
interface LoginLog { id: string; userId: string | null; username: string | null; fullName: string | null; roleId: string | null; roleName: string | null; ipAddress: string | null; userAgent: string | null; isSuccess: number; message: string | null; loginAt: string; logoutAt?: string | null; durationSeconds?: number | null; }
interface ActionLog { id: string; userId: string | null; username: string | null; fullName: string | null; roleId: string | null; roleName: string | null; ipAddress: string | null; path: string | null; actionType: string; payload?: string | null; createdAt: string; }
interface ErrorLog { id: string; userId: string | null; username: string | null; path: string | null; method: string | null; ipAddress: string | null; message: string; stack?: string | null; context?: string | null; createdAt: string; }

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'backup' | 'molds' | 'company' | 'logs'>('users');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const { settings: companySettings, updateSettings: updateCompanySettings, loading: companyLoading } = useCompanySettings();
  const [companyForm, setCompanyForm] = useState(companySettings);

  useEffect(() => { setCompanyForm(companySettings); }, [companySettings]);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [showSeedModal, setShowSeedModal] = useState(false);

  const [currentRole, setCurrentRole] = useState<Partial<Role>>({ name: '', permissions: [] });
  const [currentUser, setCurrentUser] = useState<Partial<User>>({ username: '', fullName: '', roleId: '', isActive: 1 });
  const [passwordForm, setPasswordForm] = useState({ userId: '', newPassword: '' });


  const PERMISSIONS = [
    { id: 'all', label: 'Tam Yetki (Admin)' },
    { id: 'all_except_settings', label: 'Ayarlar Hariç Her Şey' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Ürünler' },
    { id: 'recipes', label: 'Reçeteler' },
    { id: 'orders', label: 'Siparişler' },
    { id: 'design', label: 'Tasarım' },
    { id: 'planning', label: 'Planlama' },
    { id: 'procurement', label: 'Tedarik' },
    { id: 'production', label: 'Üretim' },
    { id: 'logistics', label: 'Sevkiyat' },
    { id: 'accounting', label: 'Muhasebe' },
  ];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, usersRes] = await Promise.all([fetch('/api/roles'), fetch('/api/users')]);
      const rolesData = await rolesRes.json();
      const usersData = await usersRes.json();
      setRoles(rolesData);
      setUsers(usersData);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const [loginRes, actionRes, errorRes] = await Promise.all([
        fetch('/api/logs/login?limit=200'),
        fetch('/api/logs/actions?limit=200'),
        fetch('/api/logs/errors?limit=200'),
      ]);
      const [loginData, actionData, errorData] = await Promise.all([loginRes.json(), actionRes.json(), errorRes.json()]);
      setLoginLogs(Array.isArray(loginData) ? loginData : []);
      setActionLogs(Array.isArray(actionData) ? actionData : []);
      setErrorLogs(Array.isArray(errorData) ? errorData : []);
    } catch (error) { console.error('Error:', error); }
    finally { setLogsLoading(false); }
  };

  const handleSaveRole = async () => {
    try {
      const url = currentRole.id ? `/api/roles/${currentRole.id}` : '/api/roles';
      const method = currentRole.id ? 'PATCH' : 'POST';
      const body = { ...currentRole, id: currentRole.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setShowRoleModal(false); fetchData(); setCurrentRole({ name: '', permissions: [] }); }
    } catch (error) { console.error('Error:', error); }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('Bu rolü silmek istediğinize emin misiniz?')) return;
    try { await fetch(`/api/roles/${id}`, { method: 'DELETE' }); fetchData(); } catch (error) { console.error('Error:', error); }
  };

  const handleSaveUser = async () => {
    try {
      const isNew = !currentUser.id;
      const url = isNew ? '/api/users' : `/api/users/${currentUser.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const body = { ...currentUser, id: currentUser.id || crypto.randomUUID(), createdAt: isNew ? new Date().toISOString() : undefined };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); alert(err.error); return; }
      setShowUserModal(false); fetchData(); setCurrentUser({ username: '', fullName: '', roleId: '', isActive: 1 });
    } catch (error) { console.error('Error:', error); }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch(`/api/users/${passwordForm.userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordForm.newPassword }) });
      if (res.ok) { setShowPasswordModal(false); setPasswordForm({ userId: '', newPassword: '' }); alert('Şifre güncellendi.'); }
    } catch (error) { console.error('Error:', error); }
  };

  const toggleUserStatus = async (user: User) => {
    try { await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: user.isActive ? 0 : 1 }) }); fetchData(); } catch (error) { console.error('Error:', error); }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) { alert('Yedek alınamadı.'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (error) { alert('Yedek alınırken hata oluştu.'); }
  };

  const [backupFile, setBackupFile] = useState<File | null>(null);
  const handleImportBackup = async () => {
    if (!backupFile) { alert('Lütfen bir yedek arşivi seçin.'); return; }
    try {
      const form = new FormData(); form.append('archive', backupFile);
      const res = await fetch('/api/backup/import', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || 'Yedek geri yüklenemedi.'); return; }
      alert(data.message || 'Yedek geri yüklendi. Sunucu yeniden başlayacak.');
    } catch (error) { alert('Hata oluştu.'); }
  };

  const handleResetData = async () => {
    if (resetConfirmation !== 'SIFIRLA') { alert('Onaylamak için SIFIRLA yazın.'); return; }
    try {
      const res = await fetch('/api/reset-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: 'SIFIRLA' }) });
      const data = await res.json();
      if (res.ok) { alert(data.message); window.location.reload(); }
    } catch (error) { alert('Hata oluştu.'); }
  };

  const handleSeedData = async () => {
    try {
      const res = await fetch('/api/seed-data', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { alert(data.message); window.location.reload(); }
    } catch (error) { alert('Hata oluştu.'); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try { await fetch(`/api/users/${id}`, { method: 'DELETE' }); fetchData(); } catch (error) { console.error('Error:', error); }
  };

  return (
    <ERPPageLayout
      breadcrumbs={[{ label: 'Sistem' }, { label: 'Ayarlar', active: true }]}
      toolbar={
        <>
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {[
              { id: 'users', label: 'Kullanıcılar', icon: <Users size={12} /> },
              { id: 'company', label: 'Firma', icon: <Building size={12} /> },
              { id: 'roles', label: 'Roller', icon: <Shield size={12} /> },
              { id: 'molds', label: 'Kalıplar', icon: <Box size={12} /> },
              { id: 'backup', label: 'Veri', icon: <Database size={12} /> },
              { id: 'logs', label: 'Loglar', icon: <Activity size={12} />, onClick: () => { if (loginLogs.length === 0) fetchLogs(); } }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); if (tab.onClick) tab.onClick(); }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </>
      }
    >
      <div className="space-y-6">
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
             <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between whitespace-nowrap">
                <span className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Kullanıcı Yönetimi</span>
                <button onClick={() => { setCurrentUser({ isActive: 1, roleId: roles[0]?.id }); setShowUserModal(true); }} className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                  <Plus size={12} /> YENİ KULLANICI
                </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 border-r border-slate-100">Kullanıcı Bilgileri</th>
                    <th className="px-5 py-3 border-r border-slate-100">Kullanıcı Adı</th>
                    <th className="px-5 py-3 border-r border-slate-100">Yetki Rolü</th>
                    <th className="px-5 py-3 border-r border-slate-100">Sistem Durumu</th>
                    <th className="px-5 py-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-all group">
                      <td className="px-5 py-4 border-r border-slate-50 font-bold text-slate-700 uppercase tracking-tight">{user.fullName}</td>
                      <td className="px-5 py-4 border-r border-slate-50 font-mono text-[10px] font-bold text-blue-500">@{user.username}</td>
                      <td className="px-5 py-4 border-r border-slate-50">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black border border-indigo-100 uppercase tracking-tighter">
                          {user.roleName}
                        </span>
                      </td>
                      <td className="px-5 py-4 border-r border-slate-50">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter ${user.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {user.isActive ? 'AKTİF' : 'PASİF'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                          <button onClick={() => { setCurrentUser(user); setShowUserModal(true); }} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Düzenle"><Edit size={14} /></button>
                          <button onClick={() => { setPasswordForm({ userId: user.id, newPassword: '' }); setShowPasswordModal(true); }} className="p-2 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors border border-transparent hover:border-amber-100" title="Şifre Sıfırla"><Lock size={14} /></button>
                          <button onClick={() => toggleUserStatus(user)} className={`p-2 rounded-lg transition-colors border border-transparent ${user.isActive ? 'text-slate-400 hover:bg-slate-100 hover:border-slate-200' : 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100'}`} title={user.isActive ? 'Devre Dışı Bırak' : 'Etkinleştir'}>
                            {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Sil"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'company' && (
          <div className="max-w-2xl bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
             <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Firma Kurumsal Kimlik</h3>
              </div>
              <form onSubmit={async (e) => { e.preventDefault(); try { await updateCompanySettings(companyForm); alert('Güncellendi.'); } catch (e) { alert('Hata.'); } }} className="p-6 space-y-8">
                <div className="flex items-center gap-8 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                   <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden relative group shrink-0 shadow-sm">
                      {companyForm.logoUrl ? <img src={companyForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-3" /> : <Building className="text-slate-200" size={32} />}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all backdrop-blur-sm">
                        <Upload size={20} className="text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const fd = new FormData(); fd.append('image', file);
                          try { const r = await fetch('/api/upload?folder=company', { method: 'POST', body: fd }); if (!r.ok) return; const d = await r.json(); setCompanyForm({ ...companyForm, logoUrl: d.url }); } catch (e) {}
                        }} />
                      </label>
                   </div>
                   <div className="space-y-1.5">
                      <div className="text-[10px] font-black text-slate-800 uppercase tracking-widest">FİRMA LOGOSU</div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Antetli kağıtlar, teklif formları ve sevk irsaliyelerinde kullanılacak kurumsal logo.</p>
                      <div className="text-[9px] font-bold text-blue-500 mt-2 uppercase tracking-tighter">Tavsiye Edilen: PNG 400x400px</div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="col-span-2 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">RESMİ FİRMA UNVANI</label>
                      <input type="text" value={companyForm.companyName} onChange={e => setCompanyForm({ ...companyForm, companyName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" required />
                   </div>
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">YETKİLİ TEMSİLCİ</label>
                      <input type="text" value={companyForm.contactName} onChange={e => setCompanyForm({ ...companyForm, contactName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">İLETİŞİM NUMARASI</label>
                      <input type="text" value={companyForm.mobile} onChange={e => setCompanyForm({ ...companyForm, mobile: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" />
                   </div>
                   <div className="col-span-2 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">GENEL MERKEZ ADRESİ</label>
                      <textarea value={companyForm.address} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all min-h-[80px] resize-none" />
                   </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-50">
                  <button type="submit" disabled={companyLoading} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50">
                    {companyLoading ? 'GÜNCELLENİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
                  </button>
                </div>
              </form>
          </div>
        )}

        {activeTab === 'roles' && (
           <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden text-[11px]">
             <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between whitespace-nowrap">
                <span className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Roller & İzinler</span>
                <button onClick={() => { setCurrentRole({ permissions: [] }); setShowRoleModal(true); }} className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                  <Plus size={12} /> YENİ ROL
                </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map(role => (
                <div key={role.id} className="p-4 border border-slate-200/60 rounded-xl bg-white flex flex-col justify-between gap-4 hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all group">
                   <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">{role.name}</h4>
                        <div className="flex items-center gap-1.5 mt-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${role.permissions.includes('all') ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`}></div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{role.permissions.includes('all') ? 'TAM YETKİ' : `${role.permissions.length} MODÜL ERİŞİMİ`}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-400 transition-colors">
                        <Shield size={16} />
                      </div>
                   </div>
                   <div className="flex gap-1.5 pt-4 border-t border-slate-50">
                      <button onClick={() => { setCurrentRole(role); setShowRoleModal(true); }} className="flex-1 flex justify-center items-center p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group/btn">
                        <Edit size={14} />
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-widest">DÜZENLE</span>
                      </button>
                      <button onClick={() => handleDeleteRole(role.id)} className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm">
                        <Trash2 size={14} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'molds' && <ProductMoldSettings />}

        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
             <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Download size={20} />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">Veritabanı Yedekle</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-6 font-medium">Sistemdeki tüm operasyonel verileri, ayarları ve yüklenen dosyaları içeren güvenli bir arşiv oluşturur.</p>
                </div>
                <button onClick={handleExportBackup} className="w-full flex justify-center items-center gap-3 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                  <Download size={14} /> ŞİMDİ YEDEK OLUŞTUR
                </button>
             </div>

             <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-all">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={20} />
                  </div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">Yedekten Geri Yükle</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-6 font-medium">Daha önce alınmış olan sistem yedeğini geri yükler. Mevcut verilerin üzerine yazılacaktır.</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="relative flex-1">
                     <input type="file" accept=".tar.gz,.tgz" id="backup-upload" onChange={(e) => setBackupFile(e.target.files?.[0] || null)} className="hidden" />
                     <label htmlFor="backup-upload" className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors truncate">
                       {backupFile ? backupFile.name : 'Dosya Seçilmedi...'}
                     </label>
                   </div>
                   <button onClick={handleImportBackup} className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]">YÜKLE</button>
                </div>
             </div>

             <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 shadow-sm col-span-full flex items-start justify-between gap-6 border-l-4 border-l-blue-400">
                 <div>
                   <h4 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                     <Wand2 size={16} /> Örnek Veri Simülasyonu
                   </h4>
                   <p className="text-[10px] text-blue-600/70 font-medium leading-relaxed max-w-2xl">Sistemi test etmek için gerekli olan dummy verileri (Müşteri, Ürün, Sipariş) tek tıkla oluşturur. Canlı sistemlerde kullanılması önerilmez.</p>
                 </div>
                 <button onClick={() => setShowSeedModal(true)} className="whitespace-nowrap px-6 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-50 shadow-sm transition-all active:scale-[0.98]">VERİLERİ OLUŞTUR</button>
             </div>

             <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100 shadow-sm col-span-full flex items-start justify-between gap-6 border-l-4 border-l-red-500">
                 <div>
                    <h4 className="text-[11px] font-black text-red-800 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <AlertTriangle size={16} /> Kritik: Sistem Sıfırlama
                    </h4>
                    <p className="text-[10px] text-red-600/70 font-medium leading-relaxed max-w-2xl">Kullanıcılar hariç tüm operasyonel verileri kalıcı olarak temizler. Bu işlem geri alınamaz ve fabrika ayarlarına dönüş sağlar.</p>
                 </div>
                 <button onClick={() => setShowResetModal(true)} className="whitespace-nowrap px-6 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 shadow-sm transition-all active:scale-[0.98]">FABRİKA AYARLARI</button>
             </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {[
               { title: 'Sisteme Giriş Kayıtları', data: loginLogs, type: 'login', icon: <Lock size={14} className="text-emerald-500" /> },
               { title: 'Kullanıcı Aksiyonları', data: actionLogs, type: 'action', icon: <Activity size={14} className="text-blue-500" /> },
               { title: 'Kritik Hata Logları', data: errorLogs, type: 'error', icon: <AlertTriangle size={14} className="text-red-500" /> }
             ].map(logBox => (
               <div key={logBox.title} className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[500px] text-[11px]">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        {logBox.icon}
                        <span className="font-bold text-slate-700 uppercase tracking-tight">{logBox.title}</span>
                     </div>
                     {logsLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                     <table className="w-full border-collapse">
                        <tbody className="divide-y divide-slate-50">
                           {logBox.data.length === 0 ? (
                             <tr><td className="p-12 text-center text-slate-400 font-medium italic">Kayıt bulunamadı.</td></tr>
                           ) : logBox.data.map((log: any) => (
                             <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3">
                                   <div className="flex flex-col gap-1">
                                      <span className={`font-bold text-[11px] ${logBox.type === 'error' ? 'text-red-600' : 'text-slate-800'} uppercase tracking-tight`}>
                                        {log.fullName || log.username || log.message || '-'}
                                      </span>
                                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                         <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600 uppercase">
                                           {format(new Date(log.loginAt || log.createdAt), 'dd MMM HH:mm')}
                                         </span>
                                         {log.ipAddress && <span className="opacity-60 tabular-nums">{log.ipAddress}</span>}
                                      </div>
                                   </div>
                                </td>
                                {log.isSuccess !== undefined && (
                                   <td className="px-4 py-3 text-right shrink-0">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                        log.isSuccess ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                      }`}>
                                        <span className="text-[10px] font-black">{log.isSuccess ? 'OK' : 'ERR'}</span>
                                      </div>
                                   </td>
                                )}
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* Role Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={currentRole.id ? "Rolü Düzenle" : "Yeni Rol Tanımla"} size="md">
        <div className="space-y-6 p-2 text-[11px]">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">ROL İSMİ</label>
            <input value={currentRole.name || ''} onChange={e => setCurrentRole({ ...currentRole, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all font-sans" placeholder="Örn: Üretim Sorumlusu" />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">ERİŞİM YETKİLERİ</label>
            <div className="grid grid-cols-1 gap-1.5 p-3 bg-slate-50/50 border border-slate-200 rounded-2xl max-h-72 overflow-y-auto custom-scrollbar">
              {PERMISSIONS.map(perm => (
                <label key={perm.id} className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={currentRole.permissions?.includes(perm.id)} onChange={e => { const perms = new Set(currentRole.permissions); if (e.target.checked) perms.add(perm.id); else perms.delete(perm.id); setCurrentRole({ ...currentRole, permissions: Array.from(perms) }); }} className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button onClick={() => setShowRoleModal(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">Vazgeç</button>
            <button onClick={handleSaveRole} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">
              {currentRole.id ? 'GÜNCELLE' : 'ROLÜ OLUŞTUR'}
            </button>
          </div>
        </div>
      </Modal>

      {/* User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={currentUser.id ? "Kullanıcı Profilini Düzenle" : "Yeni Sistem Kullanıcısı"} size="md">
        <div className="space-y-6 p-2 text-[11px]">
          <div className="grid grid-cols-2 gap-5">
             <div className="col-span-2 space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">AD SOYAD</label>
                <input value={currentUser.fullName || ''} onChange={e => setCurrentUser({ ...currentUser, fullName: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" />
             </div>
             <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">KULLANICI ADI</label>
                <input value={currentUser.username || ''} onChange={e => setCurrentUser({ ...currentUser, username: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all disabled:opacity-50" disabled={!!currentUser.id} />
             </div>
             {!currentUser.id && (
               <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">ŞİFRE</label>
                  <input type="password" value={currentUser.password || ''} onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all" placeholder="••••••••" />
               </div>
             )}
             <div className="col-span-full space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">ATANACAK ROL</label>
                <select value={currentUser.roleId || ''} onChange={e => setCurrentUser({ ...currentUser, roleId: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all cursor-pointer">
                  <option value="">Seçiniz...</option>
                  {roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}
                </select>
             </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button onClick={() => setShowUserModal(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">Vazgeç</button>
            <button onClick={handleSaveUser} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">
              {currentUser.id ? 'GÜNCELLE' : 'KULLANICIYI OLUŞTUR'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Güvenlik: Şifre Yenileme" size="sm">
        <div className="space-y-6 p-2 text-[11px]">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">YENİ ŞİFRE</label>
            <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans font-bold outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 transition-all" placeholder="Yeni şifre belirleyin" />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button onClick={() => setShowPasswordModal(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">Vazgeç</button>
            <button onClick={handleChangePassword} className="px-8 py-2.5 bg-orange-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-orange-700 shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]">ŞİFREYİ GÜNCELLE</button>
          </div>
        </div>
      </Modal>

      {/* Reset Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="KRİTİK: Sistem Sıfırlama Onayı" size="md">
        <div className="space-y-6 p-2 text-[11px]">
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
               <AlertTriangle size={24} />
            </div>
            <div>
              <p className="font-black text-red-800 uppercase tracking-tight mb-1">DİKKAT! BU İŞLEM GERİ ALINAMAZ</p>
              <p className="text-[10px] text-red-600/80 font-bold uppercase tracking-widest leading-relaxed">Tüm siparişler, müşteriler, ürünler ve fiziksel dosyalar KALICI OLARAK silinecektir. Kullanıcı hesapları korunacaktır.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Onay İçin <strong>SIFIRLA</strong> Yazın:</label>
            <input value={resetConfirmation} onChange={e => setResetConfirmation(e.target.value)} className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl text-sm font-black text-red-600 placeholder:font-bold placeholder:text-red-200 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-center uppercase tracking-[0.2em]" placeholder="SIFIRLA" />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button onClick={() => { setShowResetModal(false); setResetConfirmation(''); }} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">Vazgeç</button>
            <button onClick={handleResetData} disabled={resetConfirmation !== 'SIFIRLA'} className="px-8 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-700 disabled:opacity-50 shadow-xl shadow-red-500/20 transition-all active:scale-[0.98]">TÜM VERİLERİ SİL</button>
          </div>
        </div>
      </Modal>

      {/* Seed Modal */}
      <Modal isOpen={showSeedModal} onClose={() => setShowSeedModal(false)} title="Örnek Veri Simülasyonu" size="sm">
        <div className="space-y-6 p-2 text-[11px] text-slate-600">
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <p className="font-bold text-blue-800 uppercase tracking-tight mb-3">Oluşturulacak Kayıtlar:</p>
            <ul className="space-y-2 ml-1">
              {[
                { label: 'Kayıtlı Müşteri', count: 10 },
                { label: 'Üretim Ürünü', count: 5 },
                { label: 'Örnek Sipariş', count: 15 }
              ].map(item => (
                <li key={item.label} className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                   <span className="font-black text-[10px] text-blue-600/80 uppercase tracking-widest leading-none">{item.count} {item.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button onClick={() => setShowSeedModal(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">Vazgeç</button>
            <button onClick={handleSeedData} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">VERİLERİ OLUŞTUR</button>
          </div>
        </div>
      </Modal>
    </ERPPageLayout>
  );
};

export default Settings;
