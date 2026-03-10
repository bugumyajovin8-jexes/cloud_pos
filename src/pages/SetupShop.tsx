import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Store, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { SyncService } from '../services/sync';

export default function SetupShop() {
  const { user, setAuth, token } = useStore();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;
    
    setError('');
    setLoading(true);

    try {
      const shopId = uuidv4();

      // 1. Create the Shop
      const { error: shopError } = await supabase
        .from('shops')
        .insert({
          id: shopId,
          name: shopName.trim(),
          status: 'active',
          owner_name: user.name || user.email.split('@')[0],
          created_by: user.id
        });

      if (shopError) throw shopError;

      // 2. Update User Profile with the new shop_id
      const { error: userError } = await supabase
        .from('users')
        .update({
          shop_id: shopId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // 3. Update local state
      const updatedUser = {
        ...user,
        shop_id: shopId,
        shopId: shopId,
        role: 'admin' as const,
        isActive: true,
        status: 'active' as const
      };

      setAuth(token, updatedUser);
      
      // 4. Initial sync
      SyncService.sync().catch(console.error);
      
      // 5. Done!
      navigate('/');
    } catch (err: any) {
      console.error('Setup shop error:', err);
      setError(err.message || 'Kuna tatizo limetokea wakati wa kuandaa duka lako.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Karibu!</h1>
        <p className="text-gray-500 mb-8">Hatua moja ya mwisho: Tupe jina la duka lako kuanza kutumia mfumo.</p>

        <form onSubmit={handleSetup} className="space-y-6">
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
              Jina la Duka Lako
            </label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Mfano: Juma General Store"
                required
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={!shopName.trim() || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Inaandaa...
              </>
            ) : (
              <>
                Anza Sasa
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
