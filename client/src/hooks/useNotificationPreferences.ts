import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  meetingNotificationEnabled: boolean;
  meetingNotificationMinutes: number;
  notifyAllMeetings: boolean;
  fcmToken: string | null;
  apnsToken: string | null;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences | null>({
    queryKey: ['/notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('meeting_notification_enabled, meeting_notification_minutes, notify_all_meetings, fcm_token, apns_token')
        .eq('profile_id', user.id)
        .single();

      if (error) throw error;

      return {
        meetingNotificationEnabled: data.meeting_notification_enabled ?? true,
        meetingNotificationMinutes: data.meeting_notification_minutes ?? 15,
        notifyAllMeetings: data.notify_all_meetings ?? false,
        fcmToken: data.fcm_token ?? null,
        apnsToken: data.apns_token ?? null,
      };
    },
    enabled: !!user,
  });

  // Update notification preferences
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_preferences')
        .update({
          meeting_notification_enabled: updates.meetingNotificationEnabled,
          meeting_notification_minutes: updates.meetingNotificationMinutes,
          notify_all_meetings: updates.notifyAllMeetings,
        })
        .eq('profile_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/notification-preferences', user?.id] });
    },
  });

  // Request notification permission (browser)
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission denied');
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  return {
    preferences,
    isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    requestNotificationPermission,
    hasDeviceToken: !!(preferences?.fcmToken || preferences?.apnsToken),
  };
}
