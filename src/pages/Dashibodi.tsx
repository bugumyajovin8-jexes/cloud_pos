import { useStore } from '../store';
import { formatCurrency } from '../utils/format';
import { startOfDay, startOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Package, ShieldCheck, CreditCard, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Dashibodi() {
  const user = useStore(state => state.user);
  const navigate = useNavigate();

  const { data: sales, loading: salesLoading } = useSupabaseData<any>('sales');
  const { data: products, loading: productsLoading } = useSupabaseData<any>('products');
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);

  useEffect(() => {
    const fetchShopData = () => {
      if (user?.shop_id) {
        supabase.from('shops').select('*').eq('id', user.shop_id).single().then(({ data }) => setShopSettings(data));
        supabase.from('licenses').select('*').eq('shop_id', user.shop_id).single().then(({ data }) => setLicense(data));
      }
    };

    fetchShopData();
    const interval = setInterval(fetchShopData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user?.shop_id]);

  const currency = shopSettings?.currency || 'TZS';

  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  const lastMonthStart = startOfMonth(subMonths(now, 1)).getTime();

  const todaySales = sales.filter(s => new Date(s.created_at).getTime() >= todayStart);
  const monthSales = sales.filter(s => new Date(s.created_at).getTime() >= monthStart);
  const lastMonthSales = sales.filter(s => {
    const saleTime = new Date(s.created_at).getTime();
    return saleTime >= lastMonthStart && saleTime < monthStart;
  });

  const calcTotal = (arr: any[]) => arr.reduce((sum, s) => sum + s.total_amount, 0);
  const calcProfit = (arr: any[]) => arr.reduce((sum, s) => sum + (s.total_profit || 0), 0);

  const currentMonthTotal = calcTotal(monthSales);
  const lastMonthTotal = calcTotal(lastMonthSales);
  const percentChange = lastMonthTotal > 0 
    ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
    : (currentMonthTotal > 0 ? 100 : 0);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockProducts = products.filter(p => p.stock <= (p.min_stock || 5));

  const daysRemaining = license ? Math.max(0, Math.ceil((new Date(license.expiry_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStart = startOfDay(d).getTime();
    const dayEnd = dayStart + 86400000;
    const daySales = sales.filter(s => {
      const saleTime = new Date(s.created_at).getTime();
      return saleTime >= dayStart && saleTime < dayEnd;
    });
    return {
      name: d.toLocaleDateString('sw-TZ', { weekday: 'short' }),
      Mapato: calcTotal(daySales),
    };
  });

  const totalDebt = sales.filter(s => s.payment_method === 'credit' && s.status !== 'completed').reduce((sum, s) => sum + s.total_amount, 0);

  if (salesLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Desktop Header */}
      <header className="hidden md:flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{shopSettings?.name || 'Dashibodi'}</h1>
          <p className="text-slate-500 mt-1">Karibu tena, {user?.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          {license && (
            <div className={`flex items-center px-4 py-2 rounded-xl text-sm font-semibold ${daysRemaining > 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
              {daysRemaining > 5 ? <ShieldCheck className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
              Siku {daysRemaining} zimebaki
            </div>
          )}
          <button 
            onClick={() => navigate('/kikapu')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            Uza Sasa
          </button>
        </div>
      </header>

      {/* Mobile License Status */}
      {license && (
        <div className="md:hidden">
          <div className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold ${daysRemaining > 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
            {daysRemaining > 5 ? <ShieldCheck className="w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
            Siku {daysRemaining} zimebaki
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Mapato (Leo)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(calcTotal(todaySales), currency)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Faida (Leo)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(calcProfit(todaySales), currency)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-rose-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Jumla ya Madeni</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalDebt, currency)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Stock Iliyopo</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalStock} Items</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Mwenendo wa Mapato</h2>
            <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500">
              <option>Siku 7 Zilizopita</option>
              <option>Mwezi Huu</option>
            </select>
          </div>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#64748b'}}
                  dy={10}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{fill: '#64748b'}}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, currency)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="Mapato" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Info Section */}
        <div className="space-y-6 md:space-y-8">
          <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-base md:text-lg font-semibold opacity-80">Mapato ya Mwezi</h2>
              <p className="text-2xl md:text-3xl font-bold mt-2">{formatCurrency(calcTotal(monthSales), currency)}</p>
              <div className={`mt-6 flex items-center text-sm font-medium ${percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {percentChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                <span>{percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}% tangu mwezi uliopita</span>
              </div>
              <button 
                onClick={() => navigate('/historia')}
                className="mt-8 w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center"
              >
                Angalia Ripoti <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>

          {lowStockProducts.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm">
              <div className="flex items-center space-x-3 text-rose-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-lg font-bold">Tahadhari ya Stock</h2>
              </div>
              <div className="space-y-4">
                {lowStockProducts.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm font-medium">{p.name}</span>
                    <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-xs font-bold">{p.stock} left</span>
                  </div>
                ))}
                {lowStockProducts.length > 3 && (
                  <button className="text-blue-600 text-sm font-semibold hover:underline">
                    + {lowStockProducts.length - 3} more items
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

