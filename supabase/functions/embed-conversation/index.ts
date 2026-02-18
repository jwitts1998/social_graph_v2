import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate embedding for conversation context
 * Combines rich context fields into a single embedding
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) {
    return null;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit to avoid token limits
      }),
    });
    
    if (!response.ok) {
      console.error('OpenAI embedding error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
}

/**
 * Build conversation context text from rich context fields
 */
function buildContextText(conversation: any): string {
  const parts: string[] = [];
  
  // Add target person info
  if (conversation.target_person) {
    const tp = conversation.target_person;
    if (tp.name_mentioned) parts.push(`Person: ${tp.name_mentioned}`);
    if (tp.role_title) parts.push(`Role: ${tp.role_title}`);
    if (tp.company_mentioned) parts.push(`Company: ${tp.company_mentioned}`);
    if (tp.location_city) parts.push(`Location: ${tp.location_city}`);
    if (tp.communication_context) parts.push(`Context: ${tp.communication_context}`);
  }
  
  // Add goals and needs
  if (conversation.goals_and_needs) {
    const goals = conversation.goals_and_needs;
    
    if (goals.fundraising?.is_relevant) {
      parts.push(`Fundraising: ${goals.fundraising.stage || ''} ${goals.fundraising.amount_range || ''}`);
      if (goals.fundraising.investor_types?.length > 0) {
        parts.push(`Looking for: ${goals.fundraising.investor_types.join(', ')}`);
      }
    }
    
    if (goals.hiring?.is_relevant) {
      if (goals.hiring.roles_needed?.length > 0) {
        parts.push(`Hiring: ${goals.hiring.roles_needed.join(', ')}`);
      }
    }
    
    if (goals.customers_or_partners?.is_relevant) {
      if (goals.customers_or_partners.ideal_customer_types?.length > 0) {
        parts.push(`Customers: ${goals.customers_or_partners.ideal_customer_types.join(', ')}`);
      }
    }
  }
  
  // Add domains and topics
  if (conversation.domains_and_topics) {
    const domains = conversation.domains_and_topics;
    
    if (domains.primary_industry) parts.push(`Industry: ${domains.primary_industry}`);
    if (domains.product_keywords?.length > 0) {
      parts.push(`Product: ${domains.product_keywords.join(', ')}`);
    }
    if (domains.technology_keywords?.length > 0) {
      parts.push(`Technology: ${domains.technology_keywords.join(', ')}`);
    }
    if (domains.stage_keywords?.length > 0) {
      parts.push(`Stage: ${domains.stage_keywords.join(', ')}`);
    }
    if (domains.geography_keywords?.length > 0) {
      parts.push(`Geography: ${domains.geography_keywords.join(', ')}`);
    }
  }
  
  // Add matching intent
  if (conversation.matching_intent) {
    const intent = conversation.matching_intent;
    
    if (intent.what_kind_of_contacts_to_find?.length > 0) {
      parts.push(`Seeking: ${intent.what_kind_of_contacts_to_find.join(', ')}`);
    }
    if (intent.hard_constraints?.length > 0) {
      parts.push(`Must have: ${intent.hard_constraints.join(', ')}`);
    }
  }
  
  return parts.join('. ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log('Service client configured with SUPABASE_SERVICE_ROLE_KEY');
    
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { conversationId } = await req.json();
    console.log('Embedding conversation:', conversationId);
    
    // Get conversation with rich context
    const { data: conversation, error: fetchError } = await supabaseService
      .from('conversations')
      .select('id, target_person, goals_and_needs, domains_and_topics, matching_intent, owned_by_profile')
      .eq('id', conversationId)
      .single();
    
    if (fetchError || !conversation) {
      throw new Error('Conversation not found');
    }
    
    // Verify ownership
    if (conversation.owned_by_profile !== user.id) {
      throw new Error('Unauthorized: You do not own this conversation');
    }
    
    // Build context text from rich fields, with instruction prefix for asymmetric retrieval
    const rawContext = buildContextText(conversation);
    const contextText = rawContext
      ? `Search query for finding relevant professional contacts: ${rawContext}`
      : '';
    console.log('Context text:', contextText.substring(0, 200) + '...');
    
    if (contextText.length === 0) {
      console.log('No context available, skipping embedding');
      return new Response(
        JSON.stringify({ success: true, message: 'No context to embed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate embedding
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    const embedding = await generateEmbedding(contextText, openaiKey);
    
    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }
    
    console.log('Generated embedding with', embedding.length, 'dimensions');
    
    // Store embedding using PostgreSQL function to bypass schema cache
    // Convert array to pgvector format: '[0.1, 0.2, ..., 0.n]'
    const vectorString = `[${embedding.join(',')}]`;
    
    const { error: updateError } = await supabaseService.rpc('update_conversation_embedding', {
      p_conversation_id: conversationId,
      p_embedding: vectorString
    });
    
    if (updateError) {
      console.error('Update error details:', updateError);
      throw new Error(`Failed to store embedding: ${updateError.message}`);
    }
    
    console.log('Embedding stored successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        embedding_dimensions: embedding.length,
        context_length: contextText.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Embed conversation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
