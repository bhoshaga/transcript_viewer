export interface Message {
  id: string;
  speaker: string;
  timestamp?: string;  // Keep for backward compatibility
  call_time?: string;  // MM:SS format like "05:31"
  capture_time?: string; // ISO format like "2025-01-28T17:05:57.508104Z"
  content: string;
  isStarred?: boolean;
  isActionItem?: boolean; // Whether this message is in the action items
  isComplete?: boolean;
  intent?: "follow-up" | "goal" | "decision" | null;
}

export interface Meeting {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  participants: string[];
  transcript?: Message[];
  is_active?: Boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Space {
  id: string;
  name: string;
  members: Member[];
}

export interface ActionItem {
  id: string;
  content: string;
  isInferred: boolean;
  isEditing: boolean;
}
