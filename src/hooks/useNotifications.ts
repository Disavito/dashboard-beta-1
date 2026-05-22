import { useSupabaseData } from './useSupabaseData';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system' | 'finance';
  is_read: boolean;
  link?: string;
  created_at: string;
}

import { useUser } from '@/context/UserContext';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  
  const { data, loading, error, refreshData } = useSupabaseData<Notification>({
    tableName: 'notifications',
    selectQuery: '*',
    filter: user ? { column: 'user_id', value: user.id } : undefined,
    limit: 50,
  });

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['supabaseData', 'notifications'] });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false).eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['supabaseData', 'notifications'] });
  };

  const unreadCount = data.filter((n) => !n.is_read).length;

  return {
    notifications: data,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshData
  };
}
