// =============================================================================
// GraphQL Types - Aligned with FRONTEND_API.md
// =============================================================================

// -----------------------------------------------------------------------------
// User Types
// -----------------------------------------------------------------------------

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
}

// -----------------------------------------------------------------------------
// Meeting Types
// -----------------------------------------------------------------------------

export type MeetingPlatform = 'GOOGLE_MEET' | 'ZOOM' | 'TEAMS' | 'WEBEX' | 'OTHER';
export type AccessLevel = 'VIEW' | 'EDIT' | 'ADMIN';
export type AccessType = 'OWNER' | 'SHARED';

export interface ParticipantAnalytics {
  textLength: number;
}

export interface Participant {
  name: string;
  analytics: ParticipantAnalytics;
}

export interface MeetingPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  createdAt?: number;
}

export interface Meeting {
  id: string;
  title: string;
  platform: MeetingPlatform;
  createdAt?: number;
  updatedAt?: number;
  created?: number;
  modified?: number;
  participants: Participant[];
  labels?: Label[];
  permissions?: MeetingPermissions;
  access?: AccessLevel;
  accessType?: AccessType;
  duration?: number;
  speechDuration?: number;
  hasEnded?: boolean;
  hasAiOutputs?: boolean;
  transcript?: Transcript;
}

// -----------------------------------------------------------------------------
// Transcript Types
// -----------------------------------------------------------------------------

export interface TranscriptBlock {
  messageId: string;
  speakerName: string;
  transcript: string;
  timestamp: number;
  tags: string[];
  isPinned: boolean;
  isDeleted: boolean;
}

export interface Transcript {
  id: string;
  blocks: TranscriptBlock[];
}

// -----------------------------------------------------------------------------
// Task Types
// -----------------------------------------------------------------------------

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskSource = 'MANUAL' | 'AI';

export interface DueTime {
  date: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  updatedAt: number;
  completed: boolean;
  dueTime?: DueTime;
  createdBy?: User;
  assignedTo?: User;
  meetingId: string;
  tags: string[];
  source: TaskSource;
}

export interface TasksResponse {
  tasks: Task[];
  hasMore: boolean;
  totalCount: number;
}

// -----------------------------------------------------------------------------
// Sharing Types
// -----------------------------------------------------------------------------

export interface MeetingShare {
  id: string;
  sharedWithEmail: string;
  sharedWithUserId?: string;
  displayName?: string;
  photoUrl?: string;
  accessLevel: AccessLevel;
  sharedAt: number;
}

// -----------------------------------------------------------------------------
// AI Agent Types
// -----------------------------------------------------------------------------

export type AgentRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AgentConversationHistoryItemUser {
  __typename: 'AgentConversationHistoryItemUser';
  id: string;
  role: 'user';
  status: 'completed';
  timestamp: number;
  content: string;
}

export interface AgentConversationHistoryItemAssistant {
  __typename: 'AgentConversationHistoryItemAssistant';
  id: string;
  role: 'assistant';
  status: 'completed' | 'streaming';
  timestamp: number;
  content: string;
  quickReplies?: string[];
}

export type ConversationHistoryItem =
  | AgentConversationHistoryItemUser
  | AgentConversationHistoryItemAssistant;

export interface AgentRun {
  id: string;
  status: AgentRunStatus;
  updatedAt: number;
  hasUsedAICredit: boolean;
  conversationHistory: ConversationHistoryItem[];
}

export interface AgentContext {
  id: string;
  type: 'meeting';
}

export interface StartAgentRunInput {
  prompt: string;
  context: AgentContext[];
  triggeredBy: 'WebApp';
  entryMethod: 'custom_user_prompt';
}

export interface ContinueAgentRunInput {
  agentRunId: string;
  userInput: string;
  context: AgentContext[];
}

// -----------------------------------------------------------------------------
// Search Types
// -----------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  meetingId: string;
  meetingTitle: string;
  speakerName: string;
  text: string;
  highlight: string;
  timestamp: number;
  rank: number;
}

export interface SearchTranscriptsResponse {
  results: SearchResult[];
  totalCount: number;
}

// -----------------------------------------------------------------------------
// AI Outputs Types
// -----------------------------------------------------------------------------

export type AIOutputType = 'SUMMARY' | 'ACTION_ITEMS' | 'CUSTOM';
export type AIOutputStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface AIOutput {
  id: string;
  type: AIOutputType;
  aiOutputStatus: AIOutputStatus;
  createdAt: number;
  updatedAt: number;
  prompt?: string;
  title?: string;
  content?: string;
  meetingId: string;
  askedBy?: User;
}

// -----------------------------------------------------------------------------
// Quick Prompts Types
// -----------------------------------------------------------------------------

export interface QuickPromptItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  type: 'PROMPT';
  outputType: 'MARKDOWN';
  prompt?: string;
  requiresUserInput?: boolean;
}

export interface QuickPromptGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  items: QuickPromptItem[];
}

export interface QuickPrompts {
  system: QuickPromptGroup;
  used: QuickPromptItem[];
  explore: QuickPromptItem[];
}

// -----------------------------------------------------------------------------
// List Meetings Types
// -----------------------------------------------------------------------------

export type MeetingType = 'MyMeetings' | 'SharedWithMe';
export type SortBy = 'CREATED_NEWEST_FIRST' | 'CREATED_OLDEST_FIRST' | 'MODIFIED_NEWEST_FIRST';

export interface SearchFilterInput {
  query?: string;
  speakers?: string[];
  platforms?: MeetingPlatform[];
  labels?: string[];
  dateFrom?: number;
  dateTo?: number;
}

export interface ListMeetingsInput {
  type: MeetingType;
  spaceId?: string;
  offset?: number;
  filter: SearchFilterInput;
  sortBy?: SortBy;
  includeAiOutputs?: boolean;
}

export interface ListMeetingsResponse {
  type: MeetingType;
  spaceId?: string;
  offset: number;
  hasMore: boolean;
  meetings: Meeting[];
}

// -----------------------------------------------------------------------------
// Search Facets Types
// -----------------------------------------------------------------------------

export interface FacetItem {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface MeetingSearchFacets {
  speakers: FacetItem[];
  owners: FacetItem[];
  platforms: FacetItem[];
  spaces: FacetItem[];
  labels: FacetItem[];
  tags: FacetItem[];
  languages: FacetItem[];
}

// -----------------------------------------------------------------------------
// GraphQL Response Wrappers
// -----------------------------------------------------------------------------

export interface GraphQLResponse<T> {
  data: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  extensions?: {
    code: string;
  };
}

export interface MutationResponse {
  success: boolean;
  errors?: { message: string; statusCode?: number }[];
}
