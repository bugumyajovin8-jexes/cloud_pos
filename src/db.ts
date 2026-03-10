import Dexie, { type Table } from 'dexie';

export interface Shop {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  synced: number; // 0 for false, 1 for true
}

export interface User {
  id: string;
  shop_id?: string;
  shopId?: string; // Alias for compatibility
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'superadmin' | 'manager' | 'cashier';
  status: 'active' | 'inactive';
  isActive?: boolean; // Alias for compatibility
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  category?: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  barcode?: string;
  image_url?: string;
  isDeleted?: boolean; // Added back for compatibility
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface Sale {
  id: string;
  shop_id: string;
  user_id: string;
  total_amount: number;
  total_profit: number;
  payment_method: 'cash' | 'mobile_money' | 'credit';
  status: 'completed' | 'cancelled' | 'refunded' | 'pending';
  customer_name?: string;
  customer_phone?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  shop_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  buy_price: number;
  sell_price: number;
  created_at: string;
  synced: number;
}

export interface Expense {
  id: string;
  shop_id: string;
  user_id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
  synced: number;
}

export interface Settings {
  id: number;
  shopName: string;
  currency: string;
  taxPercentage: number;
  darkMode: boolean;
  lastSync: number;
  shopId?: string;
}

export interface Feature {
  id: string;
  featureKey: string;
  isEnabled: boolean;
  updated_at: string;
  synced: number;
}

export interface License {
  id: number; // Always 1
  deviceId: string;
  startDate: number;
  expiryDate: number;
  isActive: boolean;
  lastVerifiedAt: number;
}

export class PosDatabase extends Dexie {
  shops!: Table<Shop>;
  users!: Table<User>;
  products!: Table<Product>;
  sales!: Table<Sale>;
  saleItems!: Table<SaleItem>;
  expenses!: Table<Expense>;
  settings!: Table<Settings>;
  features!: Table<Feature>;
  license!: Table<License>;

  constructor() {
    super('PosDatabaseV7'); // Bumped version for new schema
    this.version(7).stores({
      shops: 'id, name, created_by, synced',
      users: 'id, shop_id, email, role, synced',
      products: 'id, shop_id, name, barcode, synced',
      sales: 'id, shop_id, user_id, status, created_at, synced',
      saleItems: 'id, sale_id, shop_id, product_id, synced',
      expenses: 'id, shop_id, user_id, category, synced',
      settings: 'id',
      features: 'id, featureKey, synced',
      license: 'id'
    });
  }
}

export const db = new PosDatabase();
