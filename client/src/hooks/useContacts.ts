import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { contactFromDb, contactToDb } from '@/lib/supabaseHelpers';
import type { Contact, InsertContact } from '@shared/schema';

export function useContacts() {
  return useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      let allContacts: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allContacts = [...allContacts, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      return allContacts.map(contactFromDb);
    },
  });
}

export function useContactsCount() {
  return useQuery<number>({
    queryKey: ['/api/contacts/count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return 0;
      }

      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('owned_by_profile', user.id);
      
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useContact(id: string) {
  return useQuery<Contact>({
    queryKey: ['/api/contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return contactFromDb(data);
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  return useMutation({
    mutationFn: async (contact: InsertContact) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dbContact = contactToDb({
        ...contact,
        ownedByProfile: user.id,
      });

      const { data, error } = await supabase
        .from('contacts')
        .insert(dbContact)
        .select()
        .single();
      
      if (error) throw error;
      return contactFromDb(data);
    },
    onSuccess: async (createdContact) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/count'] });
      
      // Automatically extract thesis if contact has bio, title, or notes
      const hasBio = createdContact.bio && createdContact.bio.trim().length > 0;
      const hasTitle = createdContact.title && createdContact.title.trim().length > 0;
      const hasNotes = createdContact.investorNotes && createdContact.investorNotes.trim().length > 0;
      
      if (hasBio || hasTitle || hasNotes) {
        try {
          const { extractThesis } = await import('@/lib/edgeFunctions');
          await extractThesis(createdContact.id);
          queryClient.invalidateQueries({ queryKey: ['/api/contacts', createdContact.id, 'thesis'] });
          console.log('[Auto] Thesis extracted for new contact:', createdContact.name);
        } catch (error) {
          console.log('[Auto] Thesis extraction skipped (edge function not deployed)');
        }
      }
    },
  });
}

// Fields that should be tracked as user-verified when manually edited
const VERIFIABLE_FIELDS = [
  'title', 'bio', 'company', 'location', 'email', 'phone',
  'linkedin_url', 'twitter', 'personal_interests', 'expertise_areas',
  'investor_notes',
];

export function useUpdateContact() {
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const dbUpdates = contactToDb(updates);
      
      // Track which verifiable fields the user is editing
      const editedFields = Object.keys(dbUpdates).filter(f => VERIFIABLE_FIELDS.includes(f));
      
      if (editedFields.length > 0) {
        // Fetch current data for verified_fields tracking and correction logging
        const { data: current } = await supabase
          .from('contacts')
          .select('verified_fields, enrichment_source, ' + VERIFIABLE_FIELDS.join(', '))
          .eq('id', id)
          .single();
        
        const existing = new Set<string>(current?.verified_fields || []);
        editedFields.forEach(f => existing.add(f));
        dbUpdates.verified_fields = Array.from(existing);
        
        // Log corrections for enriched fields (feedback loop)
        if (current?.enrichment_source) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const corrections = editedFields
              .filter(f => current[f] != null && current[f] !== dbUpdates[f])
              .map(f => ({
                contact_id: id,
                profile_id: user.id,
                field_name: f,
                old_value: typeof current[f] === 'string' ? current[f] : JSON.stringify(current[f]),
                new_value: typeof dbUpdates[f] === 'string' ? dbUpdates[f] : JSON.stringify(dbUpdates[f]),
                enrichment_source: current.enrichment_source,
              }));
            
            if (corrections.length > 0) {
              await supabase.from('enrichment_corrections').insert(corrections).catch(() => {
                // Non-critical — don't block the update
              });
            }
          }
        }
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return contactFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', data.id] });
    },
  });
}

export function useDeleteContact() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/count'] });
    },
  });
}

export interface Thesis {
  id: string;
  contactId: string;
  sectors: string[];
  stages: string[];
  checkSizes: string[];
  geos: string[];
  personas: string[];
  intents: string[];
  notes: string | null;
}

export function useContactThesis(contactId: string) {
  return useQuery<Thesis | null>({
    queryKey: ['/api/contacts', contactId, 'thesis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theses')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        contactId: data.contact_id,
        sectors: data.sectors || [],
        stages: data.stages || [],
        checkSizes: data.check_sizes || [],
        geos: data.geos || [],
        personas: data.personas || [],
        intents: data.intents || [],
        notes: data.notes,
      };
    },
    enabled: !!contactId,
  });
}

export function useExtractThesis() {
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { extractThesis } = await import('@/lib/edgeFunctions');
      return extractThesis(contactId);
    },
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'thesis'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Contact profile: matches and conversations for "smart insights"
// ---------------------------------------------------------------------------

export interface ConversationRef {
  id: string;
  title: string | null;
  recordedAt: string;
}

export interface MatchSuggestionRef {
  conversationId: string;
  conversationTitle: string | null;
  recordedAt: string;
  score: number;
  status: string;
}

export function useContactProfileData(contactId: string) {
  const contact = useContact(contactId);
  const thesis = useContactThesis(contactId);

  const suggestedIn = useQuery({
    queryKey: ['/api/contacts', contactId, 'suggested-in'],
    queryFn: async (): Promise<MatchSuggestionRef[]> => {
      const { data, error } = await supabase
        .from('match_suggestions')
        .select(`
          conversation_id,
          score,
          status,
          conversations (
            id,
            title,
            recorded_at
          )
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        conversationId: row.conversation_id,
        conversationTitle: row.conversations?.title ?? null,
        recordedAt: row.conversations?.recorded_at ?? '',
        score: row.score ?? 0,
        status: row.status ?? 'pending',
      }));
    },
    enabled: !!contactId,
  });

  const participantIn = useQuery({
    queryKey: ['/api/contacts', contactId, 'participant-in'],
    queryFn: async (): Promise<ConversationRef[]> => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations (
            id,
            title,
            recorded_at
          )
        `)
        .eq('contact_id', contactId);
      if (error) throw error;
      const seen = new Set<string>();
      return (data || [])
        .filter((row: any) => row.conversations && !seen.has(row.conversation_id) && (seen.add(row.conversation_id), true))
        .map((row: any) => ({
          id: row.conversations.id,
          title: row.conversations.title ?? null,
          recordedAt: row.conversations.recorded_at ?? '',
        }))
        .sort((a: ConversationRef, b: ConversationRef) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
    },
    enabled: !!contactId,
  });

  return {
    contact,
    thesis,
    suggestedIn,
    participantIn,
    isLoading: contact.isLoading,
    isError: contact.isError,
  };
}
