import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { formatCurrency } from '../utils/format';
import { Plus, Minus, Trash2, Search, ShoppingBag, CreditCard, User, Calendar, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { useSupabaseData } from '../hooks/useSupabaseData';

export default function Kikapu() {
  const user = useStore(state => state.user);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const { data: products, loading: productsLoading, refresh } = useSupabaseData<any>('products');
  const { data: allSales, refresh: refreshSales } = useSupabaseData<any>('sales');
  
  const { cart, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartProfit } = useStore();
  
  const [search, setSearch] = useState('');
  const [isCheckout, setIsCheckout] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    if (user?.shop_id) {
      supabase.from('shops').select('*').eq('id', user.shop_id).single().then(({ data }) => setShopSettings(data));
    }
  }, [user?.shop_id]);

  const currency = shopSettings?.currency || 'TZS';

  const uniqueCustomers = useMemo(() => {
    const customers = new Map<string, string>();
    allSales.forEach(s => {
      if (s.customer_name) {
        customers.set(s.customer_name.toLowerCase(), s.customer_name);
      }
    });
    return Array.from(customers.values());
  }, [allSales]);

  const filteredCustomers = uniqueCustomers.filter(c => 
    c.toLowerCase().includes(customerName.toLowerCase())
  );

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && p.stock > 0 && !p.isDeleted)
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectCustomer = (name: string) => {
    setCustomerName(name);
    setShowSuggestions(false);
    const previousSale = allSales.find(s => s.customer_name === name && s.customer_phone);
    if (previousSale?.customer_phone) {
      setCustomerPhone(previousSale.customer_phone);
    }
  };

  const handleCompleteSale = async (method: 'cash' | 'credit') => {
    if (cart.length === 0 || !user || isProcessing || processingRef.current) return;
    
    if (method === 'credit' && !customerName) {
      setIsCredit(true);
      setIsCheckout(true);
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    const saleId = uuidv4();

    try {
      // Final stock check
      const { data: currentProducts, error: stockCheckError } = await supabase
        .from('products')
        .select('id, name, stock')
        .in('id', cart.map(item => item.id));

      if (stockCheckError) throw stockCheckError;

      for (const item of cart) {
        const dbProduct = currentProducts?.find(p => p.id === item.id);
        if (!dbProduct || dbProduct.stock < item.qty) {
          throw new Error(`Bidhaa "${item.name}" haina stock ya kutosha. Stock iliyopo: ${dbProduct?.stock || 0}`);
        }
      }

      const sale = {
        id: saleId,
        shop_id: user.shop_id,
        user_id: user.id,
        total_amount: cartTotal(),
        total_profit: cartProfit(),
        payment_method: method,
        status: method === 'credit' ? 'pending' : 'completed',
        customer_name: method === 'credit' ? customerName : null,
        customer_phone: method === 'credit' ? customerPhone : null,
        due_date: method === 'credit' && dueDate ? new Date(dueDate).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const saleItems = cart.map(item => ({
        id: uuidv4(),
        sale_id: saleId,
        shop_id: user.shop_id,
        product_id: item.id,
        product_name: item.name,
        qty: item.qty,
        buy_price: item.buy_price,
        sell_price: item.sell_price,
        created_at: new Date().toISOString(),
      }));

      // 1. Insert Sale
      const { error: saleError } = await supabase.from('sales').insert(sale);
      if (saleError) throw saleError;

      // 2. Insert Sale Items
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // 3. Update Stocks
      // Note: Stock reduction is handled by database triggers on the sale_items table.
      // Manual update here was causing double reduction.

      refresh();
      refreshSales();
      clearCart();
      setIsCheckout(false);
      setIsCredit(false);
      setCustomerName('');
      setCustomerPhone('');
      setDueDate('');
      
      // Use a non-blocking notification instead of alert()
      // For now, we'll just clear the cart and reset the UI instantly
      // The user will see the cart is empty and can proceed to the next customer
    } catch (error: any) {
      alert('Kuna tatizo: ' + error.message);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden relative">
      {/* Left Side: Product Selection */}
      <div className="flex-1 flex flex-col border-r border-slate-200 bg-white min-w-0 h-full">
        <div className="p-4 md:p-6 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">Chagua Bidhaa</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Tafuta bidhaa..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6 items-start">
            {filteredProducts.map(product => (
              <button 
                key={product.id} 
                onClick={() => addToCart(product)}
                className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left relative overflow-hidden flex flex-col h-full min-h-[120px]"
              >
                <div className="absolute top-0 right-0 p-2 opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1 text-sm md:text-base line-clamp-2 leading-tight">{product.name}</h3>
                  <p className="text-lg font-black text-blue-600 mt-auto">{formatCurrency(product.sell_price, currency)}</p>
                </div>
                <div className="mt-4 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-50 pt-3">
                  <span className={`w-2 h-2 rounded-full mr-2 ${product.stock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                  Stock: {product.stock}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart Button */}
      {cart.length > 0 && !showCartMobile && (
        <button 
          onClick={() => {
            setShowCartMobile(true);
            setIsCheckout(true);
          }}
          className="md:hidden fixed bottom-6 right-6 bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl z-40 flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-4 duration-300 border-2 border-white/20"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-emerald-600">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase font-bold opacity-80 leading-none mb-1">Lipa Sasa</p>
            <p className="font-black text-sm leading-none">{formatCurrency(cartTotal(), currency)}</p>
          </div>
        </button>
      )}

      {/* Right Side: Cart & Checkout (Desktop) */}
      <div className={`
        fixed inset-0 z-50 md:relative md:z-0 md:flex md:w-[400px] lg:w-[450px] flex-col bg-slate-50 shadow-2xl transition-transform duration-300 h-full overflow-hidden
        ${showCartMobile ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}>
        <div className="p-6 md:p-8 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            <button onClick={() => setShowCartMobile(false)} className="md:hidden mr-4 p-2 hover:bg-slate-100 rounded-xl">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center">
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-blue-600" /> Kikapu
            </h2>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-rose-500 text-xs md:text-sm font-bold hover:underline">Futa Vyote</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 space-y-3 md:space-y-4">
            {cart.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                <p className="font-bold text-sm md:text-base">Kikapu kipo wazi</p>
              </div>
            ) : (
              <>
                {isCheckout && isCredit && (
                  <div className="space-y-4 md:space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-4">
                    <div className="space-y-3 md:space-y-4 p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 flex items-center">
                        <User className="w-4 h-4 mr-2 text-blue-600" /> Taarifa za Mkopo
                      </h3>
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 md:mb-2">Jina la Mteja</label>
                        <div className="relative">
                          <User className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 md:w-4 md:h-4" />
                          <input 
                            required 
                            placeholder="Tafuta au ingiza jina..."
                            value={customerName} 
                            onChange={e => {
                              setCustomerName(e.target.value);
                              setShowSuggestions(true);
                            }} 
                            onFocus={() => setShowSuggestions(true)}
                            className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm" 
                          />
                        </div>
                        {showSuggestions && filteredCustomers.length > 0 && customerName && (
                          <div className="absolute z-20 w-full bg-white mt-2 border border-slate-200 rounded-xl md:rounded-2xl shadow-2xl max-h-40 overflow-y-auto">
                            {filteredCustomers.map(c => (
                              <button
                                key={c}
                                onClick={() => handleSelectCustomer(c)}
                                className="w-full text-left p-3 md:p-4 hover:bg-blue-50 border-b border-slate-100 last:border-0 text-xs md:text-sm font-bold text-slate-700"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 md:mb-2">Namba ya Simu</label>
                        <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full p-2 md:p-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 md:mb-2">Tarehe ya Kulipa</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 md:w-4 md:h-4" />
                          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-3 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {cart.map(item => {
                  const isAtMaxStock = item.qty >= item.stock;
                  return (
                    <div key={item.id} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-3 md:space-x-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs md:text-sm truncate">{item.name}</h4>
                        <p className="text-blue-600 font-bold text-xs md:text-sm">{formatCurrency(item.sell_price, currency)}</p>
                      </div>
                      <div className="flex items-center bg-slate-100 rounded-xl md:rounded-2xl p-0.5 md:p-1">
                        <button 
                          onClick={() => item.qty > 1 ? updateQty(item.id, item.qty - 1) : removeFromCart(item.id)} 
                          className="p-1.5 md:p-2 text-slate-600 hover:bg-white rounded-lg md:rounded-xl transition-colors"
                        >
                          <Minus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <span className="w-6 md:w-8 text-center font-bold text-slate-900 text-xs md:text-sm">{item.qty}</span>
                        <button 
                          onClick={() => item.qty < item.stock && updateQty(item.id, item.qty + 1)} 
                          disabled={isAtMaxStock}
                          className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors ${isAtMaxStock ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white'}`}
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-rose-500 p-1.5 md:p-2 hover:bg-rose-50 rounded-lg md:rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Checkout Section - Fixed at Bottom */}
        <div className="p-6 md:p-8 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex-shrink-0">
          <div className="mb-4 md:mb-6">
            <div className="flex justify-between text-slate-500 font-bold text-[10px] md:text-sm uppercase tracking-widest mb-1">
              <span>Jumla ya Malipo</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-900 font-black text-2xl md:text-3xl">{formatCurrency(cartTotal(), currency)}</span>
              <span className="text-slate-400 text-[10px] md:text-xs font-bold mb-1">{cart.reduce((sum, item) => sum + item.qty, 0)} Bidhaa</span>
            </div>
          </div>

          {!isCheckout ? (
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => handleCompleteSale('cash')}
                disabled={cart.length === 0 || isProcessing}
                className="w-full bg-emerald-600 disabled:bg-slate-200 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-3"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                <span>Kamilisha Mauzo (Cash)</span>
              </button>
              <button 
                onClick={() => { setIsCredit(true); setIsCheckout(true); }}
                disabled={cart.length === 0 || isProcessing}
                className="w-full bg-amber-500 disabled:bg-slate-200 text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center justify-center space-x-3"
              >
                <CreditCard className="w-5 h-5" />
                <span>Uza kwa Mkopo (Deni)</span>
              </button>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button 
                onClick={() => { setIsCheckout(false); setIsCredit(false); }}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 md:py-4 rounded-xl md:rounded-2xl hover:bg-slate-200 transition-colors text-sm md:text-base"
              >
                Ghairi
              </button>
              <button 
                onClick={() => handleCompleteSale('credit')}
                disabled={!customerName || isProcessing}
                className="flex-[2] bg-emerald-600 disabled:bg-slate-200 text-white font-bold py-3 md:py-4 rounded-xl md:rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 md:space-x-3 text-sm md:text-base"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />}
                <span>{isProcessing ? 'Inasindika...' : 'Kamilisha Mkopo'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

