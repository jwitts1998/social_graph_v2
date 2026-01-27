import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/push-notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting notification scheduler...');

    // Get all users with meeting notifications enabled
    const { data: users, error: usersError } = await supabaseClient
      .from('user_preferences')
      .select('profile_id, meeting_notification_enabled, meeting_notification_minutes, notify_all_meetings, fcm_token, apns_token')
      .eq('meeting_notification_enabled', true);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      throw new Error('Failed to fetch users');
    }

    if (!users || users.length === 0) {
      console.log('No users with notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No users to process', notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${users.length} users with notifications enabled`);

    let totalNotificationsSent = 0;
    const now = new Date();

    // Process each user
    for (const userPrefs of users) {
      try {
        const notificationMinutes = userPrefs.meeting_notification_minutes || 15;
        const notificationWindowStart = new Date(now.getTime() + notificationMinutes * 60 * 1000);
        const notificationWindowEnd = new Date(notificationWindowStart.getTime() + 5 * 60 * 1000); // 5 minute window

        // Query upcoming meetings for this user within the notification window
        let query = supabaseClient
          .from('calendar_events')
          .select('*')
          .eq('owned_by_profile', userPrefs.profile_id)
          .gte('start_time', notificationWindowStart.toISOString())
          .lt('start_time', notificationWindowEnd.toISOString());

        // Filter by external meetings if user preference is set
        if (!userPrefs.notify_all_meetings) {
          query = query.eq('is_external_meeting', true);
        }

        const { data: events, error: eventsError } = await query;

        if (eventsError) {
          console.error(`Failed to fetch events for user ${userPrefs.profile_id}:`, eventsError);
          continue;
        }

        if (!events || events.length === 0) {
          continue;
        }

        console.log(`Found ${events.length} upcoming meeting(s) for user ${userPrefs.profile_id}`);

        // Process each event
        for (const event of events) {
          // Check if we've already sent a notification for this event
          const { data: existingLog, error: logError } = await supabaseClient
            .from('notification_log')
            .select('id')
            .eq('profile_id', userPrefs.profile_id)
            .eq('event_id', event.id)
            .gte('sent_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString()) // Within last hour
            .limit(1);

          if (logError) {
            console.error(`Failed to check notification log:`, logError);
            continue;
          }

          if (existingLog && existingLog.length > 0) {
            console.log(`Notification already sent for event ${event.id}`);
            continue;
          }

          // Format meeting time
          const meetingTime = new Date(event.start_time);
          const timeString = meetingTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          // Get attendee count (external attendees if applicable)
          const attendees = (event.attendees as any[]) || [];
          const attendeeCount = attendees.length;
          const attendeeText = attendeeCount > 0 
            ? `with ${attendeeCount} ${attendeeCount === 1 ? 'person' : 'people'}` 
            : '';

          // Build notification message
          const title = `Meeting in ${notificationMinutes} minutes`;
          const body = `${event.title} ${attendeeText} at ${timeString}`;
          const clickAction = `/meetings/${event.id}`;

          // Attempt to send web notification
          if (userPrefs.fcm_token) {
            const webResult = await sendPushNotification({
              fcmToken: userPrefs.fcm_token,
              title,
              body,
              data: {
                eventId: event.id,
                eventTitle: event.title,
                startTime: event.start_time,
              },
              clickAction,
            });

            if (webResult.success) {
              // Log successful notification
              await supabaseClient
                .from('notification_log')
                .insert({
                  profile_id: userPrefs.profile_id,
                  event_id: event.id,
                  notification_type: 'web',
                });

              totalNotificationsSent++;
              console.log(`Web notification sent for event ${event.id}`);
            } else {
              console.error(`Failed to send web notification:`, webResult.error);
            }
          }

          // Attempt to send mobile notification
          if (userPrefs.apns_token) {
            const mobileResult = await sendPushNotification({
              apnsToken: userPrefs.apns_token,
              title,
              body,
              data: {
                eventId: event.id,
                eventTitle: event.title,
                startTime: event.start_time,
              },
              clickAction,
            });

            if (mobileResult.success) {
              // Log successful notification
              await supabaseClient
                .from('notification_log')
                .insert({
                  profile_id: userPrefs.profile_id,
                  event_id: event.id,
                  notification_type: 'mobile',
                });

              totalNotificationsSent++;
              console.log(`Mobile notification sent for event ${event.id}`);
            } else {
              console.error(`Failed to send mobile notification:`, mobileResult.error);
            }
          }

          // If no tokens available, log a warning
          if (!userPrefs.fcm_token && !userPrefs.apns_token) {
            console.warn(`User ${userPrefs.profile_id} has no device tokens registered`);
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userPrefs.profile_id}:`, error);
        // Continue with next user
      }
    }

    console.log(`Notification scheduler complete. Sent ${totalNotificationsSent} notifications.`);

    return new Response(
      JSON.stringify({
        success: true,
        usersProcessed: users.length,
        notificationsSent: totalNotificationsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
