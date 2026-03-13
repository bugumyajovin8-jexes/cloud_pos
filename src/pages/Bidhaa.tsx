import { useState, useEffect } from 'react';
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from '../utils/format';
import { Plus, Search, Edit, Trash2, AlertCircle, RefreshCw, Package, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../supabase';

export default function Bidhaa() {
  const user = useStore(state => state.user);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const { data: products, loading, refresh } = useSupabaseData<any>('products');
  
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<any | null>(null);
  const [stockToAdd, setStockToAdd] = useState('');

  // Form states for formatting
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formSellPrice, setFormSellPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setFormBuyPrice(formatNumberWithCommas(editingProduct.buy_price));
      setFormSellPrice(formatNumberWithCommas(editingProduct.sell_price));
      setFormStock(formatNumberWithCommas(editingProduct.stock));
      setFormMinStock(formatNumberWithCommas(editingProduct.min_stock || 5));
    } else {
      setFormBuyPrice('');
      setFormSellPrice('');
      setFormStock('');
      setFormMinStock('5');
    }
  }, [editingProduct, isAdding]);

  useEffect(() => {
    if (user?.shop_id) {
      supabase.from('shops').select('*').eq('id', user.shop_id).single().then(({ data }) => setShopSettings(data));
    }
  }, [user?.shop_id]);

  const currency = shopSettings?.currency || 'TZS';

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = editingProduct?.id || uuidv4();
    
    const productData = {
      id,
      shop_id: user?.shop_id || '',
      name: formData.get('name') as string,
      buy_price: parseFormattedNumber(formBuyPrice),
      sell_price: parseFormattedNumber(formSellPrice),
      stock: parseFormattedNumber(formStock),
      min_stock: parseFormattedNumber(formMinStock),
      unit: 'pcs',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('products').upsert(productData);
    
    if (error) {
      alert('Imeshindwa kuhifadhi: ' + error.message);
    } else {
      refresh();
      setIsAdding(false);
      setEditingProduct(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Una uhakika unataka kufuta bidhaa hii?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Imeshindwa kufuta: ' + error.message);
      } else {
        refresh();
      }
    }
  };

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    
    const amount = parseFormattedNumber(stockToAdd);
    if (isNaN(amount) || amount <= 0) {
      alert('Tafadhali weka namba sahihi.');
      return;
    }
    
    const { error } = await supabase
      .from('products')
      .update({ 
        stock: stockModalProduct.stock + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', stockModalProduct.id);
    
    if (error) {
      alert('Imeshindwa kuongeza stock: ' + error.message);
    } else {
      refresh();
      setStockModalProduct(null);
      setStockToAdd('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (isAdding || editingProduct) {
    const p = editingProduct;
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <button 
          onClick={() => { setIsAdding(false); setEditingProduct(null); }}
          className="flex items-center text-slate-500 hover:text-slate-900 font-medium mb-6 md:mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Nyuma
        </button>

        <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-6 md:mb-8">
            {p ? 'Hariri Bidhaa' : 'Ongeza Bidhaa Mpya'}
          </h1>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Jina la Bidhaa</label>
              <input required name="name" defaultValue={p?.name} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Mfano: Sukari 1kg" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bei ya Kununua</label>
                <input 
                  required 
                  type="text" 
                  value={formBuyPrice}
                  onChange={e => setFormBuyPrice(formatNumberWithCommas(e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bei ya Kuuza</label>
                <input 
                  required 
                  type="text" 
                  value={formSellPrice}
                  onChange={e => setFormSellPrice(formatNumberWithCommas(e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Idadi ya Stock</label>
                <input 
                  required 
                  type="text" 
                  value={formStock}
                  onChange={e => setFormStock(formatNumberWithCommas(e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tahadhari ya Stock (Min)</label>
                <input 
                  required 
                  type="text" 
                  value={formMinStock}
                  onChange={e => setFormMinStock(formatNumberWithCommas(e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              Hifadhi Bidhaa
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Bidhaa Zilizopo</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Simamia bidhaa zako na idadi ya stock</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5 mr-2" /> Ongeza Bidhaa
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Tafuta bidhaa kwa jina..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Bidhaa</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Bei ya Kuuza</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-right">Vitendo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mr-4">
                        <Package className="w-5 h-5 text-slate-500" />
                      </div>
                      <span className="font-bold text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-medium text-slate-700">{formatCurrency(product.sell_price, currency)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${product.stock <= (product.min_stock || 5) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {product.stock} pcs
                      </span>
                      <button 
                        onClick={() => setStockModalProduct(product)}
                        className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {product.stock <= (product.min_stock || 5) && (
                        <AlertCircle className="w-4 h-4 text-rose-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setEditingProduct(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredProducts.map(product => (
            <div key={product.id} className="p-4 flex flex-col space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                    <Package className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{product.name}</h3>
                    <p className="text-sm font-medium text-blue-600">{formatCurrency(product.sell_price, currency)}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => setEditingProduct(product)} className="p-2 text-slate-400 hover:text-blue-600">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                <div className="flex items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase mr-2">Stock:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${product.stock <= (product.min_stock || 5) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {product.stock} pcs
                  </span>
                  {product.stock <= (product.min_stock || 5) && (
                    <AlertCircle className="w-4 h-4 text-rose-500 ml-2" />
                  )}
                </div>
                <button 
                  onClick={() => setStockModalProduct(product)}
                  className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  <Plus className="w-3 h-3" />
                  <span>Ongeza</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Hakuna bidhaa zilizopatikana.</p>
          </div>
        )}
      </div>

      {/* Stock Addition Modal */}
      {stockModalProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ongeza Stock</h2>
            <p className="text-slate-500 mb-8">
              Unaongeza idadi ya <span className="font-bold text-slate-900">{stockModalProduct.name}</span>. 
              Stock ya sasa ni <span className="font-bold text-slate-900">{stockModalProduct.stock}</span>.
            </p>
            
            <form onSubmit={handleAddStockSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Idadi ya Kuongeza</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder="Mfano: 10"
                  value={stockToAdd}
                  onChange={e => setStockToAdd(formatNumberWithCommas(e.target.value))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold"
                />
              </div>
              
              <div className="flex space-x-4">
                <button 
                  type="button"
                  onClick={() => { setStockModalProduct(null); setStockToAdd(''); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Ghairi
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                >
                  Ongeza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

