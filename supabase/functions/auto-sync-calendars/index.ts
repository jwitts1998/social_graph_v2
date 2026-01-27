import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting automatic calendar sync...');

    // Get all users with Google Calendar connected
    const { data: users, error: usersError } = await supabaseClient
      .from('user_preferences')
      .select('profile_id, google_calendar_connected, google_access_token')
      .eq('google_calendar_connected', true)
      .not('google_access_token', 'is', null);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      throw new Error('Failed to fetch users');
    }

    if (!users || users.length === 0) {
      console.log('No users with Google Calendar connected');
      return new Response(
        JSON.stringify({ message: 'No users to sync', syncedUsers: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${users.length} user(s) with Google Calendar connected`);

    let successfulSyncs = 0;
    let failedSyncs = 0;
    const syncResults: Array<{ profileId: string; success: boolean; error?: string }> = [];

    // Process each user
    for (const user of users) {
      try {
        // Get user's auth token to call sync function
        // For background jobs, we need to create a JWT token for the user
        const { data: authData, error: authError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: '', // We'll use the profile_id directly
          options: {
            redirectTo: Deno.env.get('SUPABASE_URL') ?? '',
          },
        });

        // Since we're using service role, we can directly get user session
        const { data: { users: authUsers }, error: usersFetchError } = await supabaseClient.auth.admin.listUsers();
        
        if (usersFetchError) {
          console.error(`Failed to fetch auth user for profile ${user.profile_id}:`, usersFetchError);
          failedSyncs++;
          syncResults.push({
            profileId: user.profile_id,
            success: false,
            error: 'Failed to fetch auth user',
          });
          continue;
        }

        const authUser = authUsers?.find(u => u.id === user.profile_id);
        if (!authUser) {
          console.error(`No auth user found for profile ${user.profile_id}`);
          failedSyncs++;
          syncResults.push({
            profileId: user.profile_id,
            success: false,
            error: 'Auth user not found',
          });
          continue;
        }

        // Create a session token for the user
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.createUser({
          email: authUser.email!,
          email_confirm: true,
          user_metadata: authUser.user_metadata,
        });

        // Call sync-google-calendar edge function as the user
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        
        // For automated sync, we'll use service role to create a temporary auth context
        const response = await fetch(`${supabaseUrl}/functions/v1/sync-google-calendar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'x-user-id': user.profile_id, // Pass user ID for service role context
          },
          body: JSON.stringify({ userId: user.profile_id }),
        });

        if (response.ok) {
          const result = await response.json();
          successfulSyncs++;
          syncResults.push({
            profileId: user.profile_id,
            success: true,
          });
          console.log(`Successfully synced calendar for user ${user.profile_id}: ${result.syncedCount} events`);
        } else {
          const error = await response.text();
          failedSyncs++;
          syncResults.push({
            profileId: user.profile_id,
            success: false,
            error: error || 'Sync request failed',
          });
          console.error(`Failed to sync calendar for user ${user.profile_id}:`, error);
        }

      } catch (error) {
        failedSyncs++;
        syncResults.push({
          profileId: user.profile_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Error syncing calendar for user ${user.profile_id}:`, error);
      }

      // Add a small delay between syncs to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Auto-sync complete. Success: ${successfulSyncs}, Failed: ${failedSyncs}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalUsers: users.length,
        successfulSyncs,
        failedSyncs,
        results: syncResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
