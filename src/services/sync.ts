import { db } from '../db';
import { useStore } from '../store';
import { supabase } from '../supabase';
import { LicenseService } from './license';

export class SyncService {
  private static isSyncing = false;

  static async sync(force = false) {
    if (this.isSyncing) {
      console.log('Sync skipped: Already syncing');
      return;
    }
    
    if (!navigator.onLine && !force) {
      console.log('Sync skipped: Offline');
      return;
    }

    this.isSyncing = true;

    const state = useStore.getState();
    const user = state.user;
    const shopId = user?.shop_id || user?.shopId;
    
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      this.isSyncing = false;
      console.error('Sync failed: Missing Supabase environment variables');
      return;
    }

    if (!user || !shopId) {
      this.isSyncing = false;
      if (!user) console.warn('Sync skipped: No user found in store');
      if (!shopId) console.warn('Sync skipped: No shopId found for user', user);
      return;
    }

    try {
      console.log('Starting sync process...');

      // 0. Sync License
      await LicenseService.syncLicense();

      // Repair: Fix any local records with missing shop_id if we have one now
      if (shopId) {
        const tablesToFix = [db.products, db.sales, db.saleItems, db.expenses];
        for (const table of tablesToFix) {
          await (table as any).where('shop_id').equals('').modify({ shop_id: shopId, synced: 0 });
        }
      }

      // 1. Push local changes
      await this.pushTable('shops', db.shops);
      
      await this.pushTable('products', db.products);
      await this.pushTable('sales', db.sales);
      await this.pushTable('sale_items', db.saleItems);
      await this.pushTable('expenses', db.expenses);

      // 2. Pull remote changes (optional, but good for multi-device)
      await this.pullTable('products', db.products, shopId);
      await this.pullTable('sales', db.sales, shopId);
      await this.pullTable('sale_items', db.saleItems, shopId);
      await this.pullTable('expenses', db.expenses, shopId);

      console.log('Sync completed successfully');
      
      // Update last sync time
      await db.settings.update(1, { lastSync: Date.now() });
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private static async pushTable(tableName: string, table: any) {
    try {
      const unsynced = await table.where('synced').equals(0).toArray();
      
      if (unsynced.length === 0) {
        console.log(`No unsynced records for ${tableName}`);
        return;
      }

      console.log(`Pushing ${unsynced.length} records to ${tableName}...`);

      // Prepare data by removing internal fields
      const dataToPush = unsynced.map((record: any) => {
        const { synced, isDeleted, ...data } = record;
        return data;
      });

      // Debug: Show data being pushed
      console.table(dataToPush);

      // Bulk upsert is more efficient and easier to debug
      const { error, status, statusText } = await supabase
        .from(tableName)
        .upsert(dataToPush, { onConflict: 'id' });

      if (error) {
        console.error(`Supabase error pushing to ${tableName}:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status,
          statusText
        });
        
        // If it's a permission error, it's likely RLS
        if (error.code === '42501') {
          console.error(`PERMISSION DENIED: Check RLS policies for table "${tableName}" in Supabase dashboard.`);
        }
        return;
      }

      // Mark as synced
      const ids = unsynced.map((r: any) => r.id);
      await table.where('id').anyOf(ids).modify({ synced: 1 });
      console.log(`Successfully synced ${unsynced.length} records to ${tableName}`);
    } catch (err) {
      console.error(`Unexpected error pushing to ${tableName}:`, err);
    }
  }

  private static async pullTable(tableName: string, table: any, shopId: string) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('shop_id', shopId);

    if (error) {
      console.error(`Error pulling ${tableName}:`, error);
      return;
    }

    if (data && data.length > 0) {
      for (const record of data) {
        await table.put({ ...record, synced: 1 });
      }
    }
  }

  static getIsSyncing() {
    return this.isSyncing;
  }
}
