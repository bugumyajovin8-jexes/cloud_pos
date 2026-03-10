import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { CheckCircle, Phone, User, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { useStore } from '../store';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../supabase';

export default function Madeni() {
  const user = useStore(state => state.user);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const { data: sales, loading: salesLoading, refresh } = useSupabaseData<any>('sales');
  const { data: saleItems, loading: itemsLoading } = useSupabaseData<any>('sale_items');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.shop_id) {
      supabase.from('shops').select('*').eq('id', user.shop_id).single().then(({ data }) => setShopSettings(data));
    }
  }, [user?.shop_id]);

  const currency = shopSettings?.currency || 'TZS';
  
  const unpaidDebts = sales
    .filter(s => s.payment_method === 'credit' && s.status === 'pending')
    .filter(s => s.customer_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const totalDebt = unpaidDebts.reduce((sum, s) => sum + s.total_amount, 0);

  const handleMarkAsPaid = async (id: string) => {
    if (confirm('Thibitisha kuwa deni hili limelipwa?')) {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) {
        alert('Imeshindwa kusasisha: ' + error.message);
      } else {
        refresh();
      }
    }
  };

  if (salesLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Madeni</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Simamia wateja wanaodaiwa na makusanyo</p>
        </div>
        <div className="w-full md:w-auto bg-rose-50 border border-rose-100 px-4 md:px-6 py-3 rounded-xl md:rounded-2xl flex items-center space-x-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-rose-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-rose-800 uppercase">Jumla ya Madeni</p>
            <p className="text-lg md:text-xl font-bold text-rose-600">{formatCurrency(totalDebt, currency)}</p>
          </div>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Tafuta mteja..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {unpaidDebts.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-slate-200">
            <User className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Hakuna madeni yoyote kwa sasa.</p>
          </div>
        ) : (
          unpaidDebts.map(debt => (
            <div key={debt.id} className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 md:p-6 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center">
                      <User className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm md:text-base">{debt.customer_name}</h3>
                      <p className="text-[10px] md:text-xs text-slate-500 flex items-center mt-0.5">
                        <Phone className="w-3 h-3 mr-1" /> {debt.customer_phone || 'Namba haipo'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base md:text-lg font-bold text-rose-600">{formatCurrency(debt.total_amount, currency)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{format(new Date(debt.created_at), 'MMM dd, yyyy')}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl md:rounded-2xl p-3 md:p-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bidhaa Alizochukua:</p>
                  {saleItems.filter(i => i.sale_id === debt.id).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] md:text-xs">
                      <span className="text-slate-600 font-medium">{item.product_name} x{item.qty}</span>
                      <span className="text-slate-900 font-bold">{formatCurrency(item.sell_price * item.qty, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 md:p-6 bg-slate-50/50 flex items-center justify-between mt-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Kikomo cha Malipo</span>
                  <span className="text-xs md:text-sm font-bold text-slate-700">
                    {debt.due_date ? format(new Date(debt.due_date), 'dd/MM/yyyy') : 'Hakuna'}
                  </span>
                </div>
                <button 
                  onClick={() => handleMarkAsPaid(debt.id)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Limelipwa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

