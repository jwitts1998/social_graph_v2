import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock supabase client
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({
  upsert: mockUpsert,
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
  getSession: vi.fn().mockResolvedValue({ user: { id: 'test-user' } }),
}));

// Mock edge functions
vi.mock('@/lib/edgeFunctions', () => ({
  transcribeAudio: vi.fn().mockResolvedValue({}),
  extractEntities: vi.fn().mockResolvedValue({}),
  generateMatches: vi.fn().mockResolvedValue({ matches: [] }),
  processParticipants: vi.fn().mockResolvedValue({}),
}));

// Mock audio recorder hook
vi.mock('@/hooks/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    state: {
      isRecording: false,
      isPaused: false,
      duration: 0,
    },
    controls: {
      startRecording: vi.fn(),
      stopRecording: vi.fn().mockResolvedValue(null),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
    },
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/test', vi.fn()],
}));

// Mock conversation hooks
const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-conv-id' });
vi.mock('@/hooks/useConversations', () => ({
  useCreateConversation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useUpdateConversation: () => ({
    mutateAsync: vi.fn(),
  }),
}));

// Mock child components that are hard to render in jsdom
vi.mock('@/components/AudioWaveform', () => ({
  default: () => <div data-testid="mock-audio-waveform" />,
}));

vi.mock('@/components/TranscriptView', () => ({
  default: () => <div data-testid="mock-transcript-view" />,
}));

vi.mock('@/components/SuggestionCard', () => ({
  default: () => <div data-testid="mock-suggestion-card" />,
}));

import RecordingDrawer from './RecordingDrawer';

describe('RecordingDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with defaultTitle pre-filled when provided', () => {
    render(
      <RecordingDrawer
        open={true}
        onOpenChange={vi.fn()}
        defaultTitle="Conversation with Jane Doe"
      />,
    );

    const titleInput = screen.getByTestId('input-meeting-title') as HTMLInputElement;
    expect(titleInput.value).toBe('Conversation with Jane Doe');
  });

  it('renders with empty title when no defaultTitle provided', () => {
    render(
      <RecordingDrawer
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    const titleInput = screen.getByTestId('input-meeting-title') as HTMLInputElement;
    expect(titleInput.value).toBe('');
  });

  it('Start button is disabled without consent checkbox', () => {
    render(
      <RecordingDrawer
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    const startButton = screen.getByTestId('button-start');
    expect(startButton).toBeDisabled();
  });

  it('Start button is enabled after consent checkbox is checked', async () => {
    const user = userEvent.setup();

    render(
      <RecordingDrawer
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    const checkbox = screen.getByTestId('checkbox-consent');
    await user.click(checkbox);

    const startButton = screen.getByTestId('button-start');
    expect(startButton).not.toBeDisabled();
  });

  it('calls supabase upsert for participant when defaultContactId is provided', async () => {
    const user = userEvent.setup();

    render(
      <RecordingDrawer
        open={true}
        onOpenChange={vi.fn()}
        defaultContactId="contact-abc-123"
      />,
    );

    // Check consent
    const checkbox = screen.getByTestId('checkbox-consent');
    await user.click(checkbox);

    // Click start
    const startButton = screen.getByTestId('button-start');
    await user.click(startButton);

    // Verify conversation was created
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledOnce();
    });

    // Verify participant upsert was called with the correct contact ID
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('conversation_participants');
      expect(mockUpsert).toHaveBeenCalledWith(
        { conversation_id: 'new-conv-id', contact_id: 'contact-abc-123' },
        { onConflict: 'conversation_id,contact_id' },
      );
    });
  });
});
