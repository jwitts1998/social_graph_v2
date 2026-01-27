declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// @ts-ignore - Deno-style URL imports are valid at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - Deno-style URL imports are valid at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let audioFile: File | null = null;
  let conversationId: string | null = null;
  
  try {
    const formData = await req.formData();
    audioFile = formData.get('audio') as File;
    conversationId = formData.get('conversation_id') as string;

    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    // Initialize service role client for all operations (we'll validate JWT manually)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      throw new Error('Unauthorized: No user found');
    }

    console.log('✅ User authenticated:', user.id);

    // Verify conversation ownership
    const { data: conversation } = await supabaseService
      .from('conversations')
      .select('owned_by_profile')
      .eq('id', conversationId)
      .single();

    if (!conversation || conversation.owned_by_profile !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this conversation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert audio to proper format for Whisper
    const audioBuffer = await audioFile.arrayBuffer();
    
    // Log detailed audio information for debugging
    console.log('=== Audio File Details ===');
    console.log('Audio file name:', audioFile.name || 'unnamed');
    console.log('Audio file type:', audioFile.type || 'no type');
    console.log('Audio file size:', audioBuffer.byteLength, 'bytes');
    console.log('Audio size (KB):', (audioBuffer.byteLength / 1024).toFixed(2));
    
    // Preserve original MIME type or default to webm
    const mimeType = audioFile.type || 'audio/webm';
    console.log('Using MIME type:', mimeType);
    
    // Create a Blob from the audio data (Deno-compatible)
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    
    // Determine appropriate filename with extension based on MIME type
    let filename = audioFile.name || 'audio.webm';
    if (!filename.includes('.')) {
      // If no extension, add one based on MIME type
      if (mimeType.includes('webm')) filename = 'audio.webm';
      else if (mimeType.includes('wav')) filename = 'audio.wav';
      else if (mimeType.includes('mp3')) filename = 'audio.mp3';
      else if (mimeType.includes('m4a')) filename = 'audio.m4a';
      else if (mimeType.includes('ogg')) filename = 'audio.ogg';
      else filename = 'audio.webm'; // default fallback
    }
    console.log('Using filename:', filename);
    
    // Create FormData for OpenAI API
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioBlob, filename);
    openaiFormData.append('model', 'whisper-1');
    openaiFormData.append('language', 'en');
    openaiFormData.append('response_format', 'verbose_json'); // Get timestamps for segments

    // Call OpenAI Whisper API
    console.log('Sending request to OpenAI Whisper API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: openaiFormData,
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('=== Whisper API Error Details ===');
      console.error('Status:', openaiResponse.status);
      console.error('Status Text:', openaiResponse.statusText);
      console.error('Error Response:', error);
      console.error('Audio Type Sent:', mimeType);
      console.error('Audio Size Sent:', audioBuffer.byteLength, 'bytes');
      console.error('Filename Sent:', filename);
      throw new Error(`Whisper API error: ${error}`);
    }
    
    console.log('✅ Transcription successful');

    const transcription = await openaiResponse.json();

    // Save transcription segments to database
    if (conversationId && transcription.segments && transcription.segments.length > 0) {
      try {
        // Get the maximum timestamp from existing segments to calculate cumulative offset
        // This ensures we don't create duplicate timestamps across chunks
        const { data: maxSegment, error: fetchError } = await supabaseService
          .from('conversation_segments')
          .select('timestamp_ms')
          .eq('conversation_id', conversationId)
          .order('timestamp_ms', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (fetchError) {
          console.error('Error fetching max segment:', fetchError);
          throw new Error(`Failed to fetch max segment: ${fetchError.message}`);
        }
        
        // Calculate cumulative offset based on the chunk's duration
        // For the first chunk, offset is 0
        // For subsequent chunks, we use the current max timestamp + this chunk's duration
        // This ensures monotonically increasing timestamps without duplicates
        let timeOffsetMs = 0;
        
        if (maxSegment?.timestamp_ms != null) {
          // Add the current chunk's duration (in ms) to the previous max timestamp
          // Use the transcription's total duration to advance the timeline
          const chunkDurationMs = Math.floor((transcription.duration || 0) * 1000);
          timeOffsetMs = maxSegment.timestamp_ms + chunkDurationMs;
          console.log(`Previous max: ${maxSegment.timestamp_ms}ms, chunk duration: ${chunkDurationMs}ms, new offset: ${timeOffsetMs}ms`);
        } else {
          console.log('First chunk, offset: 0ms');
        }
        
        const segments = transcription.segments.map((segment: any) => ({
          conversation_id: conversationId,
          speaker: segment.speaker || 'Unknown',
          text: segment.text.trim(),
          timestamp_ms: Math.floor(segment.start * 1000) + timeOffsetMs,
        }));

        console.log(`Inserting ${segments.length} segments with offset ${timeOffsetMs}ms`);

        const { error: insertError } = await supabaseService
          .from('conversation_segments')
          .insert(segments);
        
        if (insertError) {
          console.error('Database insert error:', insertError);
          throw new Error(`DB insert failed: ${insertError.message || JSON.stringify(insertError)}`);
        }
        
        console.log('Successfully inserted segments');
      } catch (dbError) {
        console.error('Database operation error:', dbError);
        throw new Error(`Database error: ${dbError.message || String(dbError)}`);
      }
    }

    return new Response(
      JSON.stringify({
        text: transcription.text,
        segments: transcription.segments,
        duration: transcription.duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Transcription Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.constructor.name);
    
    // Log additional context if available (from outer scope)
    if (audioFile) {
      console.error('Failed audio context:', {
        name: audioFile.name || 'unnamed',
        type: audioFile.type || 'unknown',
        size: audioFile.size || 'unknown'
      });
    }
    if (conversationId) {
      console.error('Conversation ID:', conversationId);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check server logs for more information'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
