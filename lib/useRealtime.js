'use client';
// Hook Supabase Realtime untuk dashboard staf.
// Setiap ada perubahan di tabel orders/order_items, fungsi `load` dipanggil lagi (tanpa refresh halaman).
import { useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function useRealtimeRefresh(load, { onEvent } = {}) {
  const loadRef = useRef(load); loadRef.current = load;
  const eventRef = useRef(onEvent); eventRef.current = onEvent;

  useEffect(() => {
    const sb = supabaseBrowser();
    let timer, channel, stopped = false;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => loadRef.current && loadRef.current(), 300); };

    (async () => {
      const { data } = await sb.auth.getSession();
      if (data.session) sb.realtime.setAuth(data.session.access_token);
      if (stopped) return;
      channel = sb.channel('rt-' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (p) => {
          if (eventRef.current) eventRef.current(p);
          refresh();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, refresh)
        .subscribe();
    })();

    // Cadangan: muat ulang tiap 30 detik kalau koneksi realtime sempat putus
    const poll = setInterval(() => loadRef.current && loadRef.current(), 30000);
    return () => { stopped = true; clearTimeout(timer); clearInterval(poll); if (channel) sb.removeChannel(channel); };
  }, []);
}
