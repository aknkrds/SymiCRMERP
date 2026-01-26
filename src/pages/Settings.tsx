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
  CheckCircle2
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

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
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('users');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
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
        fetch('http://localhost:3000/roles'),
        fetch('http://localhost:3000/users')
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

  // Role Operations
  const handleSaveRole = async () => {
    try {
      const url = currentRole.id 
        ? `http://localhost:3000/roles/${currentRole.id}`
        : 'http://localhost:3000/roles';
      
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
      await fetch(`http://localhost:3000/roles/${id}`, { method: 'DELETE' });
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
        ? 'http://localhost:3000/users'
        : `http://localhost:3000/users/${currentUser.id}`;
      
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
      const res = await fetch(`http://localhost:3000/users/${passwordForm.userId}`, {
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
      await fetch(`http://localhost:3000/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: user.isActive ? 0 : 1 })
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`http://localhost:3000/users/${id}`, { method: 'DELETE' });
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
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} />
            Kullanıcılar
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield size={18} />
            Roller ve İzinler
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
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

              <div className="overflow-x-auto">
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
                              onClick={() => {
                                setCurrentUser(user);
                                setShowUserModal(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Rol ve Bilgileri Düzenle"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setPasswordForm({ userId: user.id, newPassword: '' });
                                setShowPasswordModal(true);
                              }}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                              title="Şifre Değiştir"
                            >
                              <Lock size={16} />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user)}
                              className={`p-1.5 rounded ${
                                user.isActive 
                                  ? 'text-slate-600 hover:bg-slate-100' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.isActive ? 'Kullanıcıyı Dondur' : 'Kullanıcıyı Aktif Et'}
                            >
                              {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Sil"
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
                          onClick={() => {
                            setCurrentRole(role);
                            setShowRoleModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
                  />
                  <span className="text-sm text-slate-700">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowRoleModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              İptal
            </button>
            <button
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
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              value={currentUser.roleId || ''}
              onChange={e => setCurrentUser({ ...currentUser, roleId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Seçiniz</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              İptal
            </button>
            <button
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
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              İptal
            </button>
            <button
              onClick={handleChangePassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Güncelle
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
