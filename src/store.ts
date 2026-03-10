import { create } from 'zustand';
import { Product, User } from './db';

interface CartItem extends Product {
  qty: number;
}

interface PosState {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartProfit: () => number;
  
  // Auth
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  setAuth: (token: string | null, user: User | null) => void;
  logout: () => void;
}

export const useStore = create<PosState>((set, get) => ({
  cart: [],
  addToCart: (product) => set((state) => {
    const existing = state.cart.find(item => item.id === product.id);
    if (existing) {
      return {
        cart: state.cart.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      };
    }
    return { cart: [...state.cart, { ...product, qty: 1 }] };
  }),
  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter(item => item.id !== productId)
  })),
  updateQty: (productId, qty) => set((state) => ({
    cart: state.cart.map(item => 
      item.id === productId ? { ...item, qty } : item
    )
  })),
  clearCart: () => set({ cart: [] }),
  cartTotal: () => get().cart.reduce((total, item) => total + (item.sell_price * item.qty), 0),
  cartProfit: () => get().cart.reduce((total, item) => total + ((item.sell_price - item.buy_price) * item.qty), 0),
  
  isAuthenticated: false,
  token: localStorage.getItem('pos_token') || null,
  user: JSON.parse(localStorage.getItem('pos_user') || 'null'),
  setAuth: (token, user) => {
    if (token && user) {
      // Normalize shopId/shop_id
      const normalizedUser = {
        ...user,
        shopId: user.shopId || user.shop_id,
        shop_id: user.shop_id || user.shopId
      };
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_user', JSON.stringify(normalizedUser));
      set({ isAuthenticated: true, token, user: normalizedUser });
    } else {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      set({ isAuthenticated: false, token: null, user: null });
    }
  },
  logout: () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    set({ isAuthenticated: false, token: null, user: null, cart: [] });
  }
}));

// Initialize auth state if token exists
const initialToken = localStorage.getItem('pos_token');
if (initialToken) {
  useStore.setState({ isAuthenticated: true });
}
