import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      login(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Branding/Image */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90 z-10"></div>
        <img 
            src="/login-visual.png" 
            alt="Symi CRM" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
            }}
        />
        <div className="relative z-20 text-white p-12 max-w-xl text-center">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 mx-auto border border-white/20 shadow-2xl">
                <LayoutDashboard size={48} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-6 tracking-tight">symi</h1>
            <p className="text-xl text-blue-100 font-light mb-12">
                Sales & CRM • Planning & Management • Production & Logistics • Analytics & Profit
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <h3 className="font-semibold text-lg mb-1">Sales & CRM</h3>
                    <p className="text-sm text-blue-200">Müşteri ilişkileri ve satış yönetimi</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <h3 className="font-semibold text-lg mb-1">Production</h3>
                    <p className="text-sm text-blue-200">Üretim planlama ve takip</p>
                </div>
            </div>
        </div>
        
        {/* Abstract Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Symi'ye Giriş Yap</h2>
            <p className="text-slate-500">Devam etmek için hesabınıza giriş yapın</p>
          </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 border border-red-100">
            <span className="font-medium">Hata:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Firma Kısa İsmi / Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Kullanıcı adınızı girin"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-2">
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.99]"
            >
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
                Lisans hakkı ve geliştirmesi Symi Tekstil Bilişim Hizmetleri Yazılım ve Danışmanlık Ltd Şti<br/>
                Telefon: +90 533 732 89 83<br/>
                Lisans satış ile ilgili bizimle iletişime geçebilirsiniz.
            </p>
            <p className="text-[10px] text-slate-300 mt-2">v.0.9.3</p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Login;
