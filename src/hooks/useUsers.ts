import { useEffect, useState } from 'react';

interface UserItem {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isActive: number;
}

export function useUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then((data: UserItem[]) => {
        const active = Array.isArray(data) ? data.filter(u => u.isActive) : [];
        const filtered = active.filter(u => 
          u.username !== 'admin' && 
          u.roleName !== 'Admin' && 
          u.fullName !== 'System Admin' &&
          u.roleName !== 'Genel Müdür'
        );
        setUsers(filtered);
      })
      .catch(err => console.error('Error fetching users:', err))
      .finally(() => setLoading(false));
  }, []);

  return { users, loading };
}
