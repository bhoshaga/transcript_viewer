// =============================================================================
// Meetings API - GraphQL
// =============================================================================

import { graphqlClient } from '../lib/graphql/client';
import { LIST_MEETINGS, GET_MEETING, GET_MEETING_WITH_TRANSCRIPT } from '../lib/graphql/queries';
import { ARCHIVE_MEETING, UPDATE_MEETING, SHARE_MEETING, UPDATE_MEETING_SHARING } from '../lib/graphql/mutations';
import {
  Meeting,
  ListMeetingsResponse,
  MeetingType,
  SortBy,
  SearchFilterInput,
  Transcript,
  MutationResponse,
} from '../types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ListMeetingsData {
  meetings: ListMeetingsResponse;
}

interface GetMeetingData {
  meeting: Meeting;
}

interface MeetingWithTranscriptData {
  meeting: Meeting & { transcript: Transcript };
}

interface ArchiveMeetingData {
  archiveMeeting: MutationResponse;
}

interface UpdateMeetingData {
  updateMeeting: MutationResponse;
}

// -----------------------------------------------------------------------------
// API Functions
// -----------------------------------------------------------------------------

export async function listMeetings(
  type: MeetingType = 'MyMeetings',
  options: {
    offset?: number;
    filter?: SearchFilterInput;
    sortBy?: SortBy;
    includeAiOutputs?: boolean;
  } = {}
): Promise<ListMeetingsResponse> {
  const {
    offset = 0,
    filter = {},
    sortBy = 'CREATED_NEWEST_FIRST',
    includeAiOutputs = true,
  } = options;

  const data = await graphqlClient.query<ListMeetingsData>(
    LIST_MEETINGS,
    {
      type,
      spaceId: null,
      offset,
      filter,
      sortBy,
      includeAiOutputs,
    },
    'ListMeetings'
  );

  return data.meetings;
}

export async function getMeeting(meetingId: string): Promise<Meeting> {
  const data = await graphqlClient.query<GetMeetingData>(
    GET_MEETING,
    { meetingId },
    'GetMeeting'
  );

  return data.meeting;
}

export async function getMeetingWithTranscript(
  meetingId: string
): Promise<Meeting & { transcript: Transcript }> {
  const data = await graphqlClient.query<MeetingWithTranscriptData>(
    GET_MEETING_WITH_TRANSCRIPT,
    { meetingId },
    'meetingWithTranscript'
  );

  return data.meeting;
}

export async function archiveMeeting(meetingId: string): Promise<boolean> {
  const data = await graphqlClient.mutate<ArchiveMeetingData>(
    ARCHIVE_MEETING,
    { input: { id: meetingId } },
    'ArchiveMeeting'
  );

  return data.archiveMeeting.success;
}

export async function updateMeeting(
  meetingId: string,
  updates: { title?: string; rawTranscript?: unknown }
): Promise<boolean> {
  const data = await graphqlClient.mutate<UpdateMeetingData>(
    UPDATE_MEETING,
    { input: { id: meetingId, ...updates } },
    'UpdateMeeting'
  );

  return data.updateMeeting.success;
}

// -----------------------------------------------------------------------------
// Sharing API Functions
// -----------------------------------------------------------------------------

interface ShareMeetingData {
  shareMeeting: { success: boolean; shareId: string };
}

interface UpdateMeetingSharingData {
  updateMeetingSharing: { key: string; reach: string; expiry: number };
}

export async function shareMeetingWithEmail(
  meetingId: string,
  email: string,
  accessLevel: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW'
): Promise<{ success: boolean; shareId: string }> {
  const data = await graphqlClient.mutate<ShareMeetingData>(
    SHARE_MEETING,
    { input: { meetingId, sharedWithEmail: email, accessLevel } },
    'ShareMeeting'
  );

  return data.shareMeeting;
}

export async function generateShareLink(
  meetingId: string,
  reach: 'PRIVATE' | 'ANYONE_WITH_LINK' | 'PUBLIC' = 'ANYONE_WITH_LINK'
): Promise<{ key: string; reach: string; expiry: number }> {
  const data = await graphqlClient.mutate<UpdateMeetingSharingData>(
    UPDATE_MEETING_SHARING,
    { input: { meetingId, reach, expiry: null } },
    'UpdateMeetingSharing'
  );

  return data.updateMeetingSharing;
}

// -----------------------------------------------------------------------------
// Public API (no auth required)
// -----------------------------------------------------------------------------

export async function getSharedMeeting(shareKey: string): Promise<Meeting & { transcript: Transcript }> {
  const apiUrl = process.env.REACT_APP_GRAPHQL_URL?.replace('/api/2/graphql', '') || '';
  const response = await fetch(`${apiUrl}/s/${shareKey}`);

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Meeting not found or link expired' : 'Failed to load meeting');
  }

  return response.json();
}
