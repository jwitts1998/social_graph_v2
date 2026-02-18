import { supabase as supabaseClient } from './supabase';

/**
 * Edge Function Wrappers
 * Centralized functions for calling Supabase Edge Functions
 */

// ---------------------------------------------------------------------------
// Recording & pipeline
// ---------------------------------------------------------------------------

export async function transcribeAudio(audioBlob: Blob, conversationId: string) {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('conversation_id', conversationId);

  const { data, error } = await supabaseClient.functions.invoke('transcribe-audio', {
    body: formData,
  });

  if (error) {
    console.error('[Edge Functions] transcribe-audio error:', error);
    throw new Error(data?.error || error.message || 'Transcription failed');
  }
  return data;
}

export async function extractParticipants(conversationId: string) {
  const { data, error } = await supabaseClient.functions.invoke('extract-participants', {
    body: { conversationId },
  });
  if (error) throw error;
  return data;
}

export async function processParticipants(conversationId: string) {
  const { data, error } = await supabaseClient.functions.invoke('process-participants', {
    body: { conversationId },
  });
  if (error) throw error;
  return data;
}

export async function extractEntities(conversationId: string) {
  console.log('[Edge Functions] Extracting entities...');
  const { data, error } = await supabaseClient.functions.invoke('extract-entities', {
    body: { conversationId },
  });
  if (error) {
    console.error('[Edge Functions] extract-entities error:', error);
    throw error;
  }
  return data;
}

export async function generateMatches(conversationId: string) {
  console.log('[Edge Functions] Generating matches...');
  const { data, error } = await supabaseClient.functions.invoke('generate-matches', {
    body: { conversationId },
  });
  if (error) {
    console.error('[Edge Functions] generate-matches error:', error);
    throw error;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

export async function enrichContactSocial(contactId: string) {
  console.log('[Edge Functions] Calling enrich-social for:', contactId);
  const { data, error } = await supabaseClient.functions.invoke('enrich-social', {
    body: { contactId },
  });
  if (error) {
    console.error('[Edge Functions] enrich-social error:', error);
    throw new Error(error.message);
  }
  return data;
}

export async function researchContact(contactId: string) {
  console.log('[Edge Functions] Calling research-contact for:', contactId);
  const { data, error } = await supabaseClient.functions.invoke('research-contact', {
    body: { contactId },
  });
  if (error) {
    console.error('[Edge Functions] research-contact error:', error);
    throw new Error(data?.error || error.message || 'Research failed');
  }
  return data as {
    success: boolean;
    updated: boolean;
    fields: string[];
    bioFound: boolean;
    thesisFound: boolean;
  };
}

export async function enrichContact(contactId: string, provider?: 'hunter' | 'pdl' | 'auto') {
  const { data, error } = await supabaseClient.functions.invoke('enrich-contact', {
    body: { contactId, provider: provider || 'auto' },
  });
  if (error) throw error;
  return data;
}

export async function enrichContactEmail(contactId: string, provider: 'hunter' | 'pdl' = 'hunter') {
  console.log('[Edge Functions] Calling enrich-contact for:', contactId, 'with provider:', provider);
  const { data, error } = await supabaseClient.functions.invoke('enrich-contact', {
    body: { contactId, provider },
  });
  if (error) {
    console.error('[Edge Functions] enrich-contact error:', error);
    throw new Error(error.message);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Thesis extraction
// ---------------------------------------------------------------------------

export async function extractThesis(contactId: string) {
  console.log('[Edge Functions] Extracting thesis keywords for:', contactId);
  const { data, error } = await supabaseClient.functions.invoke('extract-thesis', {
    body: { contactId },
  });
  if (error) {
    console.error('[Edge Functions] extract-thesis error:', error);
    throw error;
  }
  return data;
}

export async function checkBatchExtractionStatus() {
  const { data, error } = await supabaseClient.functions.invoke('batch-extract-thesis', {
    body: { action: 'check' },
  });
  if (error) throw error;
  return data as { eligible: number; extracted: number; pending: number; batchSize: number };
}

export async function runBatchExtraction(batchSize: number = 25) {
  const { data, error } = await supabaseClient.functions.invoke('batch-extract-thesis', {
    body: { action: 'process', batchSize },
  });
  if (error) throw error;
  return data as {
    processed: number;
    succeeded: number;
    failed: number;
    remaining: number;
    errors?: string[];
    message?: string;
  };
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export async function embedContact(contactId: string) {
  console.log('[Edge Functions] Generating embeddings for contact:', contactId);
  const { data, error } = await supabaseClient.functions.invoke('embed-contact', {
    body: { contactId },
  });
  if (error) {
    console.error('[Edge Functions] embed-contact error:', error);
    throw error;
  }
  return data;
}

export async function embedContactBatch() {
  console.log('[Edge Functions] Batch embedding contacts without embeddings...');
  const { data, error } = await supabaseClient.functions.invoke('embed-contact', {
    body: { mode: 'batch' },
  });
  if (error) {
    console.error('[Edge Functions] embed-contact batch error:', error);
    throw error;
  }
  return data as { message: string; processed: number; total: number; errors?: string[]; hasMore: boolean };
}

export async function embedConversation(conversationId: string) {
  console.log('[Edge Functions] Generating embedding for conversation:', conversationId);
  const { data, error } = await supabaseClient.functions.invoke('embed-conversation', {
    body: { conversationId },
  });
  if (error) {
    console.error('[Edge Functions] embed-conversation error:', error);
    throw error;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Intro emails
// ---------------------------------------------------------------------------

export async function generateIntroEmail(matchSuggestionId: string, conversationId: string) {
  const { data, error } = await supabaseClient.functions.invoke('generate-intro-email', {
    body: { matchSuggestionId, conversationId },
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Hunter.io
// ---------------------------------------------------------------------------

export async function checkHunterStatus() {
  const { data, error } = await supabaseClient.functions.invoke('hunter-batch', {
    body: { action: 'check' },
  });
  if (error) throw error;
  return data;
}

export async function runHunterBatch(limit: number = 1) {
  const { data, error } = await supabaseClient.functions.invoke('hunter-batch', {
    body: { action: 'process', limit },
  });
  if (error) throw error;
  return data;
}
