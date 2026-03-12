import { useState } from 'react';
import { useStore } from '../store';
import { Lock, Mail, Store, Eye, EyeOff } from 'lucide-react';
import { SyncService } from '../services/sync';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Login() {
  const setAuth = useStore(state => state.setAuth);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Barua pepe yako bado haijathibitishwa. Tafadhali angalia email yako na ubonyeze link ya kuthibitisha kabla ya kuingia.');
        }
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Barua pepe au nenosiri si sahihi. Tafadhali jaribu tena.');
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('Kushindwa kuingia: Mtumiaji hakupatikana.');

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        console.warn('User profile missing, creating one and redirecting to setup');
        
        // Create missing profile
        await supabase.from('users').upsert({
          id: authData.user.id,
          email: authData.user.email || email,
          name: authData.user.email?.split('@')[0] || 'User',
          role: 'admin',
          status: 'active'
        });

        const token = authData.session?.access_token || '';
        setAuth(token, {
          id: authData.user.id,
          email: authData.user.email || email,
          name: authData.user.email?.split('@')[0] || 'User',
          role: 'admin' as const,
          shop_id: undefined,
          status: 'active' as const,
          isActive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          synced: 1
        });
        navigate('/');
        return;
      }

      if (userData.status !== 'active')
        throw new Error('Akaunti yako imezuiwa (Blocked). Tafadhali wasiliana na msimamizi wako ili kufunguliwa.');

      const token = authData.session?.access_token || '';

      setAuth(token, {
        id: userData.id,
        email: authData.user.email || email,
        name: userData.name,
        role: userData.role,
        shop_id: userData.shop_id,
        shopId: userData.shop_id,
        status: userData.status,
        isActive: true,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        synced: 1
      });

      SyncService.sync().catch(err => console.error('Login sync failed:', err));
      navigate('/');

    } catch (err: any) {
      console.error('Login error details:', err);
      setError(err.message || 'Kuna tatizo limetokea wakati wa kuingia');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">

      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Karibu</h1>
        <p className="text-gray-500 mb-8">Ingiza barua pepe na nenosiri kuendelea</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Barua pepe (Email)"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nenosiri (Password)"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={!email || !password || loading}
            className="w-full bg-blue-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-md transition-colors mt-4"
          >
            {loading ? 'Inaingia...' : 'Ingia'}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600">
          Hauna akaunti?{' '}
          <Link to="/register" className="text-blue-600 font-bold hover:underline">
            Tengeneza hapa
          </Link>
        </div>
      </div>

      {/* ✅ ADDED FOOTER TEXT HERE */}
      <p className="mt-6 text-xs text-gray-500 text-center">
        Made by Venics Software Company
      </p>

    </div>
  );
}
