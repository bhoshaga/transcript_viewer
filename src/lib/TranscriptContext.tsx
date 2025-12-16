import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

// Local Message type for this context
interface Message {
  id: string;
  speaker: string;
  content: string;
  timestamp?: string;
  call_time?: string;
  capture_time?: string;
  isStarred?: boolean;
}

// Enable this to see detailed logs during development
const DEBUG = false;

type TranscriptContextType = {
  transcriptData: Message[] | null;
  setTranscriptData: (data: Message[] | null) => void;
  selectedMeetingId: string | null;
  setSelectedMeetingId: (id: string | null) => void;
  meetingName: string | null;
  setMeetingName: (name: string | null) => void;
  isDetailView: boolean;
  navigateToMeetingDetail: (meetingId: string) => void;
  navigateToMeetingList: () => void;
};

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [transcriptData, setTranscriptData] = useState<Message[] | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetingName, setMeetingName] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  
  // Add a reference to track the previous detail view state to limit logging
  const prevDetailViewRef = useRef<boolean | null>(null);
  
  // Use a more robust method to get the ID from URL
  const getIdFromUrl = useCallback(() => {
    // First check params from useParams
    if (params?.id) {
      return params.id;
    }
    
    // Fallback to parsing pathname manually
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 't') {
      return pathParts[2];
    }
    
    return null;
  }, [params, location.pathname]);
  
  // Update selected meeting ID when URL params change
  useEffect(() => {
    const idFromUrl = getIdFromUrl();
    if (DEBUG) console.log('[TranscriptContext] URL params check, meetingId from URL:', idFromUrl);
    
    if (idFromUrl && idFromUrl !== selectedMeetingId) {
      if (DEBUG) console.log('[TranscriptContext] Setting selectedMeetingId from URL params:', idFromUrl);
      setSelectedMeetingId(idFromUrl);
    } else if (!idFromUrl && selectedMeetingId) {
      if (DEBUG) console.log('[TranscriptContext] Clearing selectedMeetingId as no ID in URL params');
      setSelectedMeetingId(null);
      setMeetingName(null);
      
      // Clear transcript data whenever there's no meeting ID in the URL
      if (DEBUG) console.log('[TranscriptContext] Clearing transcript data when navigating away from detail view');
      setTranscriptData(null);
    }
  }, [params, location.pathname, selectedMeetingId, getIdFromUrl]);
  
  // Custom setter that logs the data being set only when appropriate
  const setTranscriptDataWithLogging = useCallback((data: Message[] | null) => {
    // Only log when data significantly changes (null to not-null or vice versa, or length changes)
    const isSignificantChange = 
      (data === null && transcriptData !== null) || 
      (data !== null && transcriptData === null) ||
      (data !== null && transcriptData !== null && data.length !== transcriptData.length);
      
    if (DEBUG && isSignificantChange) {
      console.log(`[TranscriptContext] Setting transcript data: ${data ? `${data.length} messages` : 'null'}`);
    }
    setTranscriptData(data);
  }, [transcriptData]);
  
  // Derived state - we're in detail view if we have both a meeting ID and transcript data
  const isDetailView = !!selectedMeetingId && !!transcriptData && transcriptData.length > 0;
  
  // Log when detail view status changes, but only when it actually changes
  useEffect(() => {
    const hasChanged = prevDetailViewRef.current !== isDetailView;
    
    if (hasChanged) {
      prevDetailViewRef.current = isDetailView;
      
      // Only log when detail view status changes AND in debug mode
      if (hasChanged && DEBUG) {
        console.log(`[TranscriptContext] Detail view status: ${isDetailView}, MeetingID: ${selectedMeetingId}, HasData: ${!!transcriptData}, DataLength: ${transcriptData?.length || 0}, MeetingName: ${meetingName}`);
      }
    }
  }, [isDetailView, selectedMeetingId, transcriptData, meetingName]);
  
  // Navigation helpers
  const navigateToMeetingDetail = useCallback((meetingId: string) => {
    if (DEBUG) console.log(`[TranscriptContext] Navigating to meeting detail: /t/${meetingId}`);
    navigate(`/t/${meetingId}`);
  }, [navigate]);
  
  const navigateToMeetingList = useCallback(() => {
    if (DEBUG) console.log('[TranscriptContext] Navigating to meeting list: /');
    navigate('/');
  }, [navigate]);

  return (
    <TranscriptContext.Provider
      value={{
        transcriptData,
        setTranscriptData: setTranscriptDataWithLogging,
        selectedMeetingId,
        setSelectedMeetingId,
        meetingName,
        setMeetingName,
        isDetailView,
        navigateToMeetingDetail,
        navigateToMeetingList,
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