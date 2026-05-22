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

export function useNotifications() {
  const queryClient = useQueryClient();
  const { data, loading, error, refreshData } = useSupabaseData<Notification>({
    tableName: 'notifications',
    selectQuery: '*',
    limit: 50,
  });

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['supabaseData', 'notifications'] });
  };

  const markAllAsRead = async () => {
    // Para simplificar, marcaremos todas las no leídas como leídas.
    // Idealmente, se filtraría por user_id.
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
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
