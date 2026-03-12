import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useStore } from '../store';

export function useSupabaseData<T>(table: string, query?: any) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const user = useStore(state => state.user);

  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = () => setRefreshCount(prev => prev + 1);

  useEffect(() => {
    if (!user?.shop_id) return;

    async function fetchData(isBackground = false) {
      if (!isBackground) setLoading(true);
      try {
        let baseQuery = supabase
          .from(table)
          .select('*')
          .eq('shop_id', user?.shop_id);

        if (query) {
          // Apply additional filters if needed
        }

        const { data: result, error: fetchError } = await baseQuery;

        if (fetchError) throw fetchError;
        setData(result || []);
      } catch (err) {
        setError(err);
      } finally {
        if (!isBackground) setLoading(false);
      }
    }

    fetchData();
    const pollInterval = setInterval(() => fetchData(true), 30000);

    // Set up real-time subscription
    const channel = supabase
      .channel(`${table}-changes-${refreshCount}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `shop_id=eq.${user.shop_id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(item => (item as any).id === (payload.new as any).id ? payload.new as T : item));
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => (item as any).id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [table, user?.shop_id, refreshCount]);

  return { data, loading, error, refresh };
}

export function useSupabaseSingle<T>(table: string, id: string | number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useStore(state => state.user);

  useEffect(() => {
    if (!user?.shop_id || !id) return;

    async function fetchData() {
      setLoading(true);
      const { data: result } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('shop_id', user?.shop_id)
        .single();
      
      setData(result);
      setLoading(false);
    }

    fetchData();
  }, [table, id, user?.shop_id]);

  return { data, loading };
}
