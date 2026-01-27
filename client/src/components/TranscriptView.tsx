import { useEffect, useRef } from "react";

interface TranscriptEntry {
  t: string;
  speaker: string | null;
  text: string;
}

interface TranscriptViewProps {
  transcript: TranscriptEntry[];
  userName?: string;
}

export default function TranscriptView({ transcript, userName }: TranscriptViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Start speaking to see the transcript...
      </div>
    );
  }

  // Group by speaker turns
  const groupedBySpeaker = transcript.reduce((acc, entry, idx) => {
    if (idx === 0 || entry.speaker !== transcript[idx - 1].speaker) {
      acc.push([entry]);
    } else {
      acc[acc.length - 1].push(entry);
    }
    return acc;
  }, [] as TranscriptEntry[][]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto p-6 space-y-5"
      data-testid="container-transcript"
    >
      {groupedBySpeaker.map((turn, turnIdx) => {
        const speaker = turn[0]?.speaker;
        const speakerDisplayName = speaker === 'Unknown' && userName ? userName : (speaker || 'Unknown');
        const isUser = speakerDisplayName === userName;
        const firstTimestamp = turn[0]?.t;
        
        return (
          <div key={turnIdx} className="group" data-testid={`transcript-turn-${turnIdx}`}>
            {/* Speaker header with timestamp */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                isUser 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {speakerDisplayName.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-sm">
                {speakerDisplayName}
              </span>
              <span className="font-mono text-xs text-muted-foreground ml-auto">
                {new Date(firstTimestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            
            {/* Speaker's statements */}
            <div className="ml-11 space-y-2">
              {turn.map((entry, entryIdx) => (
                <p key={entryIdx} className="text-base text-foreground leading-relaxed" data-testid={`transcript-entry-${turnIdx}-${entryIdx}`}>
                  {entry.text}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
