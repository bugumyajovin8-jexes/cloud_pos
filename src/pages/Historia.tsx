import { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import { format, startOfDay, startOfWeek, startOfMonth, subMonths, startOfYear } from 'date-fns';
import { Receipt, Calendar, Download, TrendingUp, BarChart3, RefreshCw, ChevronRight, ShoppingBag } from 'lucide-react';
import { useStore } from '../store';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../supabase';

export default function Historia() {
  const user = useStore(state => state.user);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const { data: sales, loading: salesLoading } = useSupabaseData<any>('sales');
  const { data: saleItems, loading: itemsLoading } = useSupabaseData<any>('sale_items');
  
  const [view, setView] = useState<'risiti' | 'ripoti'>('risiti');
  const [filter, setFilter] = useState('leo');
  const [reportType, setReportType] = useState<'mwezi' | 'mwaka'>('mwezi');

  useEffect(() => {
    if (user?.shop_id) {
      supabase.from('shops').select('*').eq('id', user.shop_id).single().then(({ data }) => setShopSettings(data));
    }
  }, [user?.shop_id]);

  const currency = shopSettings?.currency || 'TZS';

  const now = new Date();
  const getStartDate = () => {
    switch(filter) {
      case 'leo': return startOfDay(now).getTime();
      case 'wiki': return startOfWeek(now).getTime();
      case 'mwezi': return startOfMonth(now).getTime();
      case 'miezi6': return subMonths(now, 6).getTime();
      case 'mwaka': return startOfYear(now).getTime();
      default: return 0;
    }
  };

  const startDate = getStartDate();
  const filteredSales = sales
    .filter(s => new Date(s.created_at).getTime() >= startDate)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.total_profit || 0), 0);

  const exportCSV = () => {
    const headers = ['Tarehe', 'Kiasi', 'Faida', 'Aina', 'Mteja'];
    const rows = filteredSales.map(s => [
      `"${format(new Date(s.created_at), 'yyyy-MM-dd HH:mm')}"`,
      `"${s.total_amount}"`,
      `"${s.total_profit}"`,
      `"${s.payment_method === 'credit' ? 'Mkopo' : 'Taslimu'}"`,
      `"${s.customer_name || 'Taslimu'}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mauzo_${filter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportData = useMemo(() => {
    const groups: Record<string, { mapato: number, faida: number, mauzo: number }> = {};
    
    sales.forEach(sale => {
      const date = new Date(sale.created_at);
      const dateStr = reportType === 'mwezi' 
        ? format(date, 'MMM yyyy') 
        : format(date, 'yyyy');
        
      if (!groups[dateStr]) {
        groups[dateStr] = { mapato: 0, faida: 0, mauzo: 0 };
      }
      groups[dateStr].mapato += sale.total_amount;
      groups[dateStr].faida += (sale.total_profit || 0);
      groups[dateStr].mauzo += 1;
    });

    return Object.entries(groups).map(([label, data]) => ({
      label,
      ...data
    })).sort((a, b) => b.label.localeCompare(a.label));
  }, [sales, reportType]);

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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Historia & Ripoti</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Tazama mauzo yako na ripoti za faida</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl w-full md:w-auto">
          <button 
            onClick={() => setView('risiti')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center justify-center transition-all ${view === 'risiti' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Receipt className="w-4 h-4 mr-2" /> Risiti
          </button>
          <button 
            onClick={() => setView('ripoti')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center justify-center transition-all ${view === 'ripoti' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Ripoti
          </button>
        </div>
      </header>

      {view === 'risiti' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {['leo', 'wiki', 'mwezi', 'miezi6', 'mwaka', 'yote'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`whitespace-nowrap px-4 md:px-5 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all ${
                    filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button 
              onClick={exportCSV} 
              className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center hover:bg-slate-50 transition-all"
            >
              <Download className="w-4 h-4 mr-2" /> Pakua CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mapato</p>
              <p className="text-lg md:text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue, currency)}</p>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faida</p>
              <p className="text-lg md:text-2xl font-bold text-emerald-600">{formatCurrency(totalProfit, currency)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Tarehe</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Bidhaa</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Aina</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-right">Kiasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center text-slate-600 text-sm font-medium">
                          <Calendar className="w-4 h-4 mr-2 opacity-50" />
                          {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-slate-900 max-w-xs truncate">
                          {saleItems.filter(i => i.sale_id === sale.id).map(i => i.product_name).join(', ')}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {saleItems.filter(i => i.sale_id === sale.id).reduce((a, b) => a + b.qty, 0)} items
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sale.payment_method === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {sale.payment_method === 'credit' ? 'Mkopo' : 'Taslimu'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(sale.total_amount, currency)}</div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Faida: {formatCurrency(sale.total_profit, currency)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredSales.map(sale => (
                <div key={sale.id} className="p-4 flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center text-slate-500 text-[10px] font-bold uppercase">
                      <Calendar className="w-3 h-3 mr-1 opacity-50" />
                      {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${sale.payment_method === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {sale.payment_method === 'credit' ? 'Mkopo' : 'Taslimu'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 line-clamp-2">
                    {saleItems.filter(i => i.sale_id === sale.id).map(i => i.product_name).join(', ')}
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-slate-50">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      {saleItems.filter(i => i.sale_id === sale.id).reduce((a, b) => a + b.qty, 0)} items
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">{formatCurrency(sale.total_amount, currency)}</div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Faida: {formatCurrency(sale.total_profit, currency)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredSales.length === 0 && (
              <div className="text-center py-20">
                <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Hakuna mauzo katika kipindi hiki.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={() => setReportType('mwezi')}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl md:rounded-2xl text-sm font-bold transition-all ${reportType === 'mwezi' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              Ripoti ya Kila Mwezi
            </button>
            <button
              onClick={() => setReportType('mwaka')}
              className={`flex-1 md:flex-none px-6 py-3 rounded-xl md:rounded-2xl text-sm font-bold transition-all ${reportType === 'mwaka' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              Ripoti ya Kila Mwaka
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {reportData.map((report, idx) => (
              <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-6 md:mb-8 pb-4 border-b border-slate-100">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mr-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base md:text-lg">{report.label}</h3>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">
                    {report.mauzo} Mauzo
                  </span>
                </div>
                
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mapato ya Jumla</p>
                    <p className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(report.mapato, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Faida ya Jumla</p>
                    <p className="text-xl md:text-2xl font-bold text-emerald-600 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      {formatCurrency(report.faida, currency)}
                    </p>
                  </div>
                </div>
                
                <button className="mt-8 w-full flex items-center justify-center text-blue-600 font-bold text-sm hover:underline">
                  Tazama Maelezo <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            ))}
            {reportData.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-slate-200">
                <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Hakuna data ya ripoti inayopatikana.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

