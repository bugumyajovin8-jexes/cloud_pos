import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store';
import { supabase } from '../supabase';

export type LicenseStatus = 'VALID' | 'EXPIRED' | 'BLOCKED' | 'DATE_MANIPULATED' | 'SYNC_REQUIRED';

export class LicenseService {
  static async getLocalLicense() {
    let license = await db.license.get(1);
    if (!license) {
      const now = Date.now();
      license = {
        id: 1,
        deviceId: uuidv4(),
        startDate: now,
        expiryDate: now + (14 * 24 * 60 * 60 * 1000), // 14 days trial
        isActive: true,
        lastVerifiedAt: now
      };
      await db.license.add(license);
    }
    return license;
  }

  static async checkStatus(): Promise<{ status: LicenseStatus, daysRemaining: number }> {
    const license = await this.getLocalLicense();
    const now = Date.now();
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil((license.expiryDate - now) / (24 * 60 * 60 * 1000));

    if (!license.isActive) return { status: 'BLOCKED', daysRemaining };
    
    // Allow 1 minute buffer for date manipulation check
    if (now < license.lastVerifiedAt - 60000) return { status: 'DATE_MANIPULATED', daysRemaining }; 
    
    if (now > license.expiryDate) return { status: 'EXPIRED', daysRemaining };
    if (now - license.lastVerifiedAt > fiveDays) return { status: 'SYNC_REQUIRED', daysRemaining };

    // Update lastVerifiedAt locally to prevent date rollback bypassing
    await db.license.update(1, { lastVerifiedAt: now });

    return { status: 'VALID', daysRemaining };
  }

  static async syncLicense() {
    const user = useStore.getState().user;
    if (!user || !user.id || !navigator.onLine) return;

    const shopId = user.shop_id || user.shopId || user.id;

    try {
      const { data: remote, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('shop_id', shopId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching license from Supabase:', error);
        return;
      }
      
      if (remote) {
        await db.license.update(1, {
          expiryDate: new Date(remote.expiry_date).getTime(),
          isActive: remote.status === 'active',
          lastVerifiedAt: Date.now()
        });
      }
    } catch (e) {
      console.error('License sync failed', e);
    }
  }
}
