import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Message } from '../types';

type TranscriptContextType = {
  transcriptData: Message[] | null;
  setTranscriptData: (data: Message[] | null) => void;
  selectedMeetingId: string | null;
  setSelectedMeetingId: (id: string | null) => void;
  isDetailView: boolean;
};

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [transcriptData, setTranscriptData] = useState<Message[] | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  // Derived state - we're in detail view if we have both a meeting ID and transcript data
  const isDetailView = !!selectedMeetingId && !!transcriptData;

  return (
    <TranscriptContext.Provider
      value={{
        transcriptData,
        setTranscriptData,
        selectedMeetingId,
        setSelectedMeetingId,
        isDetailView
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
}

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
} 