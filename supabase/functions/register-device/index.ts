import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isValidToken } from '../_shared/push-notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface RegisterDeviceRequest {
  fcmToken?: string;
  apnsToken?: string;
  platform: 'web' | 'ios' | 'android';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body: RegisterDeviceRequest = await req.json();
    const { fcmToken, apnsToken, platform } = body;

    // Validate at least one token is provided
    if (!fcmToken && !apnsToken) {
      return new Response(
        JSON.stringify({ error: 'Either fcmToken or apnsToken must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token format
    if (fcmToken && !isValidToken(fcmToken)) {
      return new Response(
        JSON.stringify({ error: 'Invalid FCM token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (apnsToken && !isValidToken(apnsToken)) {
      return new Response(
        JSON.stringify({ error: 'Invalid APNS token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user preferences with device tokens
    const updateData: Record<string, string | null> = {};
    
    if (platform === 'ios' && apnsToken) {
      updateData.apns_token = apnsToken;
    } else if ((platform === 'android' || platform === 'web') && fcmToken) {
      updateData.fcm_token = fcmToken;
    }

    const { error: updateError } = await supabaseClient
      .from('user_preferences')
      .update(updateData)
      .eq('profile_id', user.id);

    if (updateError) {
      console.error('Failed to update device token:', updateError);
      throw new Error('Failed to register device');
    }

    console.log(`Device registered for user ${user.id} (platform: ${platform})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Device registered successfully',
        platform,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Register device error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
