import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  Lock, 
  UserX, 
  UserCheck, 
  Save, 
  X,
  CheckCircle2,
  Download,
  Upload,
  Database,
  AlertTriangle,
  Wand2,
  Box,
  Building
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../hooks/useCompanySettings';
import ProductMoldSettings from '../components/settings/ProductMoldSettings';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface User {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isActive: number;
  password?: string;
}

interface LoginLog {
  id: string;
  userId: string | null;
  username: string | null;
  fullName: string | null;
  roleId: string | null;
  roleName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isSuccess: number;
  message: string | null;
  loginAt: string;
  logoutAt?: string | null;
  durationSeconds?: number | null;
}

interface ActionLog {
  id: string;
  userId: string | null;
  username: string | null;
  fullName: string | null;
  roleId: string | null;
  roleName: string | null;
  ipAddress: string | null;
  path: string | null;
  actionType: string;
  payload?: string | null;
  createdAt: string;
}

interface ErrorLog {
  id: string;
  userId: string | null;
  username: string | null;
  path: string | null;
  method: string | null;
  ipAddress: string | null;
  message: string;
  stack?: string | null;
  context?: string | null;
  createdAt: string;
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'backup' | 'molds' | 'company' | 'logs'>('users');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Company Settings Hook
  const { settings: companySettings, updateSettings: updateCompanySettings, loading: companyLoading } = useCompanySettings();
  const [companyForm, setCompanyForm] = useState(companySettings);

  useEffect(() => {
      setCompanyForm(companySettings);
  }, [companySettings]);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [showSeedModal, setShowSeedModal] = useState(false);
  
  // Form States
  const [currentRole, setCurrentRole] = useState<Partial<Role>>({ name: '', permissions: [] });
  const [currentUser, setCurrentUser] = useState<Partial<User>>({ username: '', fullName: '', roleId: '', isActive: 1 });
  const [passwordForm, setPasswordForm] = useState({ userId: '', newPassword: '' });

  const { user: loggedInUser } = useAuth();

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, usersRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/users')
      ]);
      
      const rolesData = await rolesRes.json();
      const usersData = await usersRes.json();
      
      setRoles(rolesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const [loginRes, actionRes, errorRes] = await Promise.all([
        fetch('/api/logs/login?limit=200'),
        fetch('/api/logs/actions?limit=200'),
        fetch('/api/logs/errors?limit=200'),
      ]);

      const [loginData, actionData, errorData] = await Promise.all([
        loginRes.json(),
        actionRes.json(),
        errorRes.json(),
      ]);

      setLoginLogs(Array.isArray(loginData) ? loginData : []);
      setActionLogs(Array.isArray(actionData) ? actionData : []);
      setErrorLogs(Array.isArray(errorData) ? errorData : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  // Role Operations
  const handleSaveRole = async () => {
    try {
      const url = currentRole.id 
        ? `/api/roles/${currentRole.id}`
        : '/api/roles';
      
      const method = currentRole.id ? 'PATCH' : 'POST';
      
      const body = {
        ...currentRole,
        id: currentRole.id || crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowRoleModal(false);
        fetchData();
        setCurrentRole({ name: '', permissions: [] });
      }
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('Bu rolü silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  // User Operations
  const handleSaveUser = async () => { // Used for adding new user (if needed) or updating role
    try {
      const isNew = !currentUser.id;
      const url = isNew 
        ? '/api/users'
        : `/api/users/${currentUser.id}`;
      
      const method = isNew ? 'POST' : 'PATCH';
      
      const body = {
        ...currentUser,
        id: currentUser.id || crypto.randomUUID(),
        createdAt: isNew ? new Date().toISOString() : undefined
      };
      
      // If new user, add default password if not provided (though in this UI we might not have password field for edit)
      if (isNew && !body.password) {
        // Assume password provided in another way or required
        // For this task, we will just use a default or handle it in the modal
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }

      setShowUserModal(false);
      fetchData();
      setCurrentUser({ username: '', fullName: '', roleId: '', isActive: 1 });
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch(`/api/users/${passwordForm.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.newPassword })
      });

      if (res.ok) {
        setShowPasswordModal(false);
        setPasswordForm({ userId: '', newPassword: '' });
        alert('Şifre başarıyla güncellendi.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: user.isActive ? 0 : 1 })
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  // Backup Handlers
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Yedek alınamadı.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export backup error:', error);
      alert('Yedek alınırken hata oluştu.');
    }
  };

  const [backupFile, setBackupFile] = useState<File | null>(null);
  const handleImportBackup = async () => {
    if (!backupFile) {
      alert('Lütfen bir yedek arşivi seçin.');
      return;
    }
    try {
      const form = new FormData();
      form.append('archive', backupFile);
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Yedek geri yüklenemedi.');
        return;
      }
      alert(data.message || 'Yedek geri yüklendi. Sunucu yeniden başlayacak.');
    } catch (error) {
      console.error('Import backup error:', error);
      alert('Yedek geri yüklenirken hata oluştu.');
    }
  };

  const handleResetData = async () => {
    if (resetConfirmation !== 'SIFIRLA') {
      alert('Lütfen onaylamak için kutucuğa SIFIRLA yazın.');
      return;
    }

    try {
      const res = await fetch('/api/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'SIFIRLA' })
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        setShowResetModal(false);
        setResetConfirmation('');
        window.location.reload(); // Reload to clear any cached state
      } else {
        alert(data.error || 'Sıfırlama başarısız.');
      }
    } catch (error) {
      console.error('Reset error:', error);
      alert('Bir hata oluştu.');
    }
  };

  const handleSeedData = async () => {
    try {
      const res = await fetch('/api/seed-data', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowSeedModal(false);
        window.location.reload();
      } else {
        alert(data.error || 'Test verileri oluşturulamadı.');
      }
    } catch (error) {
      console.error('Seed error:', error);
      alert('Bir hata oluştu.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Ayarlar</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} />
            Kullanıcılar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'company'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building size={18} />
            Firma Bilgileri
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'roles'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield size={18} />
            Roller ve İzinler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('molds')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'molds'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Box size={18} />
            Ürün Kalıpları
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'backup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database size={18} />
            Veri Yönetimi
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              if (loginLogs.length === 0 && actionLogs.length === 0 && errorLogs.length === 0) {
                fetchLogs();
              }
            }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === 'logs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database size={18} />
            Loglar
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'company' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <div className="mb-6 pb-6 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800">Firma Bilgileri</h3>
                  <p className="text-sm text-slate-500">Uygulama genelinde kullanılacak firma ve yetkili kişi bilgileri.</p>
              </div>

              <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                      await updateCompanySettings(companyForm);
                      alert('Firma bilgileri başarıyla güncellendi.');
                  } catch (error) {
                      alert('Güncelleme sırasında bir hata oluştu.');
                  }
              }} className="space-y-6">
                
                {/* Logo Upload Section */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Firma Logosu</label>
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group shrink-0">
                            {companyForm.logoUrl ? (
                                <>
                                    <img src={companyForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            type="button"
                                            onClick={() => setCompanyForm({...companyForm, logoUrl: ''})}
                                            className="text-white p-1 hover:text-red-400"
                                            title="Logoyu Sil"
                                            aria-label="Logoyu Sil"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <Building className="text-slate-300" size={32} />
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
                                <Upload size={16} />
                                Logo Yükle
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    aria-label="Logo Yükle"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const formData = new FormData();
                                        formData.append('image', file);
                                        // Use 'company' folder for organization
                                        
                                        try {
                                            const res = await fetch('/api/upload?folder=company', {
                                                method: 'POST',
                                                body: formData
                                            });
                                            
                                            if (!res.ok) throw new Error('Yükleme başarısız');
                                            
                                            const data = await res.json();
                                            setCompanyForm({...companyForm, logoUrl: data.url});
                                        } catch (error) {
                                            console.error('Logo upload error:', error);
                                            alert('Logo yüklenirken bir hata oluştu.');
                                        }
                                    }}
                                />
                            </label>
                            <p className="text-xs text-slate-500 mt-2">
                                PNG, JPG veya SVG formatında. Tavsiye edilen boyut: 200x200px.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Firma İsmi</label>
                        <input
                            type="text"
                            value={companyForm.companyName}
                            onChange={e => setCompanyForm({...companyForm, companyName: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Örn: Symi Tekstil"
                            required
                            aria-label="Firma İsmi"
                        />
                        <p className="text-xs text-slate-500 mt-1">Bu isim uygulamanın sol üst köşesindeki başlık alanında görünecektir.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Yetkili Kişi Adı Soyadı</label>
                            <input
                                type="text"
                                value={companyForm.contactName}
                                onChange={e => setCompanyForm({...companyForm, contactName: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Ad Soyad"
                                aria-label="Yetkili Kişi Adı Soyadı"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Yetkili Cep Telefonu</label>
                            <input
                                type="text"
                                value={companyForm.mobile}
                                onChange={e => setCompanyForm({...companyForm, mobile: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="05XX XXX XX XX"
                                aria-label="Yetkili Cep Telefonu"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Firma Sabit Telefon</label>
                            <input
                                type="text"
                                value={companyForm.phone}
                                onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="0212 XXX XX XX"
                                aria-label="Firma Sabit Telefon"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Firma Adresi</label>
                        <textarea
                            value={companyForm.address}
                            onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition-all"
                            placeholder="Açık adres..."
                            aria-label="Firma Adresi"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={companyLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Save size={18} />
                        {companyLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUser({ isActive: 1, roleId: roles[0]?.id });
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Kullanıcı Ekle
                </button>
              </div>

              {/* Mobile View (Cards) for Users */}
              <div className="md:hidden space-y-4">
                  {users.map(user => (
                    <div key={user.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-medium text-slate-800">{user.fullName}</div>
                                <div className="text-sm text-slate-500">@{user.username}</div>
                            </div>
                            {user.isActive ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                                  <CheckCircle2 size={12} /> Aktif
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded-full">
                                  <X size={12} /> Pasif
                                </span>
                              )}
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                             <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                {user.roleName}
                              </span>
                             <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentUser(user);
                                    setShowUserModal(true);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Rol ve Bilgileri Düzenle"
                                  aria-label="Rol ve Bilgileri Düzenle"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPasswordForm({ userId: user.id, newPassword: '' });
                                    setShowPasswordModal(true);
                                  }}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                                  title="Şifre Değiştir"
                                  aria-label="Şifre Değiştir"
                                >
                                  <Lock size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleUserStatus(user)}
                                  className={`p-1.5 rounded ${
                                    user.isActive 
                                      ? 'text-slate-600 hover:bg-slate-100' 
                                      : 'text-green-600 hover:bg-green-50'
                                  }`}
                                  title={user.isActive ? 'Kullanıcıyı Dondur' : 'Kullanıcıyı Aktif Et'}
                                  aria-label={user.isActive ? 'Kullanıcıyı Dondur' : 'Kullanıcıyı Aktif Et'}
                                >
                                  {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Sil"
                                  aria-label="Sil"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </div>
                        </div>
                    </div>
                  ))}
              </div>

              {/* Desktop View (Table) for Users */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-3 px-4 font-medium text-slate-600">Ad Soyad</th>
                      <th className="py-3 px-4 font-medium text-slate-600">Kullanıcı Adı</th>
                      <th className="py-3 px-4 font-medium text-slate-600">Rol</th>
                      <th className="py-3 px-4 font-medium text-slate-600">Durum</th>
                      <th className="py-3 px-4 font-medium text-slate-600 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">{user.fullName}</td>
                        <td className="py-3 px-4">{user.username}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                            {user.roleName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {user.isActive ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle2 size={14} /> Aktif
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 text-sm">
                              <X size={14} /> Pasif
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentUser(user);
                                setShowUserModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Rol ve Bilgileri Düzenle"
                              aria-label="Rol ve Bilgileri Düzenle"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordForm({ userId: user.id, newPassword: '' });
                                setShowPasswordModal(true);
                              }}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                              title="Şifre Değiştir"
                              aria-label="Şifre Değiştir"
                            >
                              <Lock size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(user)}
                              className={`p-1.5 rounded ${
                                user.isActive 
                                  ? 'text-slate-600 hover:bg-slate-100' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Kullanıcıyı Dondur' : 'Kullanıcıyı Aktif Et'}
                              aria-label={user.isActive ? 'Kullanıcıyı Dondur' : 'Kullanıcıyı Aktif Et'}
                            >
                              {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Sil"
                              aria-label="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentRole({ permissions: [] });
                    setShowRoleModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Rol Ekle
                </button>
              </div>

              <div className="grid gap-4">
                {roles.map(role => (
                  <div key={role.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-800">{role.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {role.permissions.includes('all') 
                            ? 'Tam Yetki' 
                            : `${role.permissions.length} izin tanımlı`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentRole(role);
                            setShowRoleModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Rolü Düzenle"
                          aria-label="Rolü Düzenle"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Rolü Sil"
                          aria-label="Rolü Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map(perm => {
                        const label = PERMISSIONS.find(p => p.id === perm)?.label || perm;
                        return (
                          <span key={perm} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'molds' && <ProductMoldSettings />}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Backup & Restore Section */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Download size={16} /> Yedek Al
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Veritabanı ve tüm yüklenen dosyalar (img, doc) tek arşivde sıkıştırılır.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download size={18} />
                    Yedeği İndir
                  </button>
                </div>
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Upload size={16} /> Yedeği Yükle
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Sıkıştırılmış yedek arşivini yükleyerek verileri ve dosyaları geri yükler.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".tar.gz,.tgz"
                      onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                      className="text-sm"
                      aria-label="Yedek Dosyası Seç"
                    />
                    <button
                      type="button"
                      onClick={handleImportBackup}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Geri Yükle
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Not: Geri yükleme sonrası sunucu otomatik yeniden başlatılır.
                  </p>
                </div>
              </div>

              {/* Danger Zone: Reset Data */}
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <Wand2 size={18} /> Örnek Veri Yükle (Test)
                </h3>
                <p className="text-sm text-blue-600 mb-4">
                  Sistemi test etmek için rastgele Müşteriler, Ürünler ve Siparişler oluşturur.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSeedModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Test Verisi Oluştur
                </button>
              </div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} /> Verileri Sıfırla / Fabrika Ayarları
                </h3>
                <p className="text-sm text-red-600 mb-4">
                  Sisteme girilen tüm operasyonel verileri (Siparişler, Müşteriler, Stok, Üretim vb.) ve yüklenen dosyaları siler.
                  <br />
                  <strong>Silinmeyecekler:</strong> Kullanıcılar, Roller, Firma Bilgileri ve Firma Logosu.
                </p>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Verileri Temizle
                </button>
              </div>
            </div>
          )}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Sistem Logları</h3>
                  <p className="text-sm text-slate-500">
                    Giriş denemeleri, kullanıcı aksiyonları ve hata kayıtlarını inceleyebilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchLogs}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  <Wand2 size={16} />
                  Yenile
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">Giriş Logları</h4>
                      <p className="text-xs text-slate-500">Son giriş ve giriş denemeleri</p>
                    </div>
                    {logsLoading && (
                      <span className="text-xs text-slate-400">Yükleniyor...</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-auto text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Kullanıcı</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">IP</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Durum</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Zaman</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.map(log => (
                          <tr key={log.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">
                                  {log.fullName || log.username || '-'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {log.roleName || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-slate-700">{log.ipAddress || '-'}</span>
                                {typeof log.durationSeconds === 'number' && log.durationSeconds > 0 && (
                                  <span className="text-[10px] text-slate-500">
                                    Süre: {Math.floor(log.durationSeconds / 60)} dk
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {log.isSuccess ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700">
                                  <CheckCircle2 size={10} />
                                  Başarılı
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600">
                                  <X size={10} />
                                  Başarısız
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-slate-700">
                                  {new Date(log.loginAt).toLocaleString('tr-TR')}
                                </span>
                                {log.message && (
                                  <span className="text-[10px] text-slate-500">
                                    {log.message}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {loginLogs.length === 0 && !logsLoading && (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                              Kayıt bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-semibold text-slate-800 text-sm">Aksiyon Logları</h4>
                    <p className="text-xs text-slate-500">Son kullanıcı hareketleri</p>
                  </div>
                  <div className="max-h-80 overflow-auto text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Kullanıcı</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Aksiyon</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Sayfa</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Zaman</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actionLogs.map(log => (
                          <tr key={log.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">
                                  {log.fullName || log.username || '-'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {log.ipAddress || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                {log.actionType}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-slate-700">
                                {log.path || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-slate-700">
                                {new Date(log.createdAt).toLocaleString('tr-TR')}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {actionLogs.length === 0 && !logsLoading && (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                              Kayıt bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h4 className="font-semibold text-slate-800 text-sm">Hata Logları</h4>
                    <p className="text-xs text-slate-500">Son hata kayıtları</p>
                  </div>
                  <div className="max-h-80 overflow-auto text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Mesaj</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Kullanıcı / Yol</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Zaman</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorLogs.map(log => (
                          <tr key={log.id} className="border-t border-slate-100 align-top">
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-red-700 font-medium">{log.message}</span>
                                {log.stack && (
                                  <span className="text-[10px] text-slate-500 line-clamp-2">
                                    {log.stack}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-slate-700">
                                  {log.fullName || log.username || '-'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {log.method} {log.path} • {log.ipAddress || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-slate-700">
                                {new Date(log.createdAt).toLocaleString('tr-TR')}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {errorLogs.length === 0 && !logsLoading && (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                              Kayıt bulunamadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={currentRole.id ? "Rolü Düzenle" : "Yeni Rol Ekle"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol Adı</label>
            <input
              type="text"
              value={currentRole.name || ''}
              onChange={e => setCurrentRole({ ...currentRole, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              aria-label="Rol Adı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">İzinler</label>
            <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-lg">
              {PERMISSIONS.map(perm => (
                <label key={perm.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentRole.permissions?.includes(perm.id)}
                    onChange={e => {
                      const perms = new Set(currentRole.permissions);
                      if (e.target.checked) perms.add(perm.id);
                      else perms.delete(perm.id);
                      setCurrentRole({ ...currentRole, permissions: Array.from(perms) });
                    }}
                    className="rounded border-slate-300 text-blue-600"
                    aria-label={`İzin: ${perm.label}`}
                  />
                  <span className="text-sm text-slate-700">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowRoleModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSaveRole}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={currentUser.id ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad</label>
            <input
              type="text"
              value={currentUser.fullName || ''}
              onChange={e => setCurrentUser({ ...currentUser, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              aria-label="Ad Soyad"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Adı</label>
            <input
              type="text"
              value={currentUser.username || ''}
              onChange={e => setCurrentUser({ ...currentUser, username: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              disabled={!!currentUser.id} // Cannot change username
              aria-label="Kullanıcı Adı"
            />
          </div>
          {!currentUser.id && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
              <input
                type="text"
                value={currentUser.password || ''}
                onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Şifre belirleyin"
                aria-label="Şifre"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              value={currentUser.roleId || ''}
              onChange={e => setCurrentUser({ ...currentUser, roleId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              aria-label="Rol Seçimi"
            >
              <option value="">Seçiniz</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSaveUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Şifre Değiştir"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Yeni Şifre</label>
            <input
              type="text"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Yeni şifreyi girin"
              aria-label="Yeni Şifre"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleChangePassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Güncelle
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="DİKKAT: Veri Sıfırlama"
      >
        <div className="space-y-4">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            <p className="font-bold flex items-center gap-2">
              <AlertTriangle size={20} />
              BU İŞLEM GERİ ALINAMAZ!
            </p>
            <p className="mt-2 text-sm">
              Siparişler, stok hareketleri, üretim kayıtları, müşteri bilgileri ve <strong>TÜM YÜKLENEN DOSYALAR (Resimler, Belgeler)</strong> kalıcı olarak silinecektir.
            </p>
            <p className="mt-2 text-sm font-semibold">
              Sadece Kullanıcılar ve Roller (Şifreler dahil) KORUNACAKTIR.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Onaylamak için kutucuğa <strong>SIFIRLA</strong> yazın:
            </label>
            <input
              type="text"
              value={resetConfirmation}
              onChange={e => setResetConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              placeholder="SIFIRLA"
              aria-label="Sıfırlama Onayı"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowResetModal(false);
                setResetConfirmation('');
              }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleResetData}
              disabled={resetConfirmation !== 'SIFIRLA'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Tüm Verileri Sil
            </button>
          </div>
        </div>
        </Modal>

        {/* Seed Confirmation Modal */}
        <Modal
          isOpen={showSeedModal}
          onClose={() => setShowSeedModal(false)}
          title="Örnek Veri Yükleme"
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              Bu işlem sisteme rastgele test verileri ekleyecektir:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 ml-2 space-y-1">
              <li>10 Adet Müşteri (Yıldız Ambalaj, Demir Lojistik vb.)</li>
              <li>5 Adet Ürün (Kutular, Koliler vb.)</li>
              <li>15 Adet Sipariş (Farklı durum ve tarihlerde)</li>
            </ul>
            <p className="text-sm text-slate-500 italic mt-2">
              Mevcut veriler silinmez, üzerine eklenir. Temiz bir başlangıç için önce "Verileri Sıfırla" yapabilirsiniz.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSeedData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Verileri Oluştur
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
};

export default Settings;
