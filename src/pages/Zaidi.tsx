import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { LogOut, Phone, ShieldCheck, CreditCard, User, Store, Globe, HelpCircle, ChevronRight, Receipt } from 'lucide-react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function Zaidi() {
  const logout = useStore(state => state.logout);
  const user = useStore(state => state.user);
  const navigate = useNavigate();
  const [shopSettings, setShopSettings] = useState<any>(null);

  useEffect(() => {
    if (user?.shop_id) {
      supabase.from('shops').select('*').eq('id', user.shop_id).single().then(({ data }) => setShopSettings(data));
    }
  }, [user?.shop_id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  const menuItems = [
    { icon: User, label: 'Wasifu wa Mtumiaji', desc: 'Badili jina au namba ya simu', path: '#' },
    { icon: Store, label: 'Taarifa za Duka', desc: 'Jina la duka, anuani na sarafu', path: '#' },
    { icon: CreditCard, label: 'Malipo & Leseni', desc: 'Angalia hali ya usajili wako', path: '#' },
    { icon: Receipt, label: 'Matumizi ya Biashara', desc: 'Fuatilia gharama za uendeshaji', path: '/matumizi' },
    { icon: Globe, label: 'Lugha', desc: 'Badili lugha ya mfumo', path: '#' },
    { icon: HelpCircle, label: 'Msaada', desc: 'Maswali yanayoulizwa mara kwa mara', path: '#' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Mipangilio</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Simamia akaunti yako na taarifa za duka</p>
        </div>
        <button 
          onClick={handleLogout} 
          className="w-full md:w-auto bg-rose-50 text-rose-600 px-6 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-rose-100 transition-colors border border-rose-100"
        >
          <LogOut className="w-5 h-5 mr-2" /> Ondoka
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl md:text-3xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-slate-500 text-xs md:text-sm">{user?.email}</p>
            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center space-x-4">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Role</p>
                <p className="text-xs md:text-sm font-bold text-slate-700 capitalize">{user?.role || 'Admin'}</p>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                <div className="flex items-center text-emerald-600 text-xs md:text-sm font-bold">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Active
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl">
            <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">Huduma kwa Wateja</h3>
            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed">
              Unahitaji msaada? Timu yetu ipo tayari kukusaidia saa 24 kupitia WhatsApp au Simu.
            </p>
            <a 
              href="tel:0787979273" 
              className="flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              <Phone className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">0787979273</span>
            </a>
          </div>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm md:text-base">Mipangilio ya Mfumo</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {menuItems.map((item, idx) => (
              <button 
                key={idx}
                onClick={() => item.path !== '#' && navigate(item.path)}
                className="w-full flex items-center p-4 md:p-6 hover:bg-slate-50 transition-colors group text-left"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg md:rounded-xl flex items-center justify-center mr-4 md:mr-6 group-hover:bg-blue-50 transition-colors">
                  <item.icon className="w-5 h-5 md:w-6 md:h-6 text-slate-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-sm md:text-base">{item.label}</h4>
                  <p className="text-[10px] md:text-sm text-slate-500">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
              </button>
            ))}
          </div>
          <div className="p-6 md:p-8 bg-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-medium">Cloud POS Mobile Edition • Version 2.0.0</p>
            <p className="text-[10px] text-slate-300 mt-1">© 2026 POS Yangu. Haki zote zimehifadhiwa.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

