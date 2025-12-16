// Speaker Stats Calculation
// Calculates speaking time per speaker based on transcript timestamps

import { TranscriptBlock } from '../types';

// Average speaking rate: ~150 words/min, ~5 chars/word = ~750 chars/min = ~12.5 chars/sec
const CHARS_PER_SECOND = 12.5;
const MIN_DURATION = 0.5; // minimum 0.5 seconds
const MAX_SILENCE_FILL = 2.0; // max seconds of silence to attribute to a speaker
const MERGE_GAP_THRESHOLD = 1.0; // only merge same-speaker segments if gap < this

export interface SpeechSegment {
  speaker: string;
  startTime: number;  // seconds from meeting start
  duration: number;   // seconds
  text: string;
}

export interface SpeakerStat {
  speaker: string;
  totalDuration: number;  // total seconds spoken
  percentage: number;     // percentage of total speaking time
  segments: SpeechSegment[];
}

export interface ProcessedTranscript {
  segments: SpeechSegment[];
  speakerStats: Record<string, number>;  // speaker -> total seconds
  meetingDuration: number;  // total meeting duration in seconds
  speakerDetails: SpeakerStat[];
}

/**
 * Estimate speech duration from text length
 * Includes base cost for short utterances (breathing, pauses)
 */
export const estimateDurationFromText = (text: string): number => {
  const baseCost = 0.5; // short words like "Ok" still take ~0.5s
  return Math.max(MIN_DURATION, baseCost + text.length / CHARS_PER_SECOND);
};

/**
 * Process transcript blocks into speech segments with calculated durations
 *
 * Logic:
 * - Each block has a timestamp (ms since epoch)
 * - Duration = next block's timestamp - current block's timestamp
 * - For last block: estimate from text length
 * - If gap > 60s: likely a pause, use text estimate instead
 * - Consecutive segments from same speaker are merged
 */
export const processTranscriptToSegments = (blocks: TranscriptBlock[]): ProcessedTranscript => {
  if (!blocks || blocks.length === 0) {
    return {
      segments: [],
      speakerStats: {},
      meetingDuration: 0,
      speakerDetails: [],
    };
  }

  // Deduplicate blocks with same timestamp + speaker + text
  const seen = new Set<string>();
  const dedupedBlocks = blocks.filter(block => {
    const key = `${block.timestamp}-${block.speakerName}-${block.transcript}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const startTimestamp = dedupedBlocks[0].timestamp;
  const rawSegments: SpeechSegment[] = [];

  // Calculate duration for each block
  // Key fixes:
  // 1. Silence Tax: Don't give speaker credit for long silences after their speech
  // 2. Overlaps: Allow overlaps for accurate stats (speaker kept talking during interruption)
  dedupedBlocks.forEach((block, index) => {
    const startTime = (block.timestamp - startTimestamp) / 1000; // convert to seconds
    const textEstimate = estimateDurationFromText(block.transcript);

    let duration: number;
    if (index < dedupedBlocks.length - 1) {
      const nextTimestamp = dedupedBlocks[index + 1].timestamp;
      const gapToNext = (nextTimestamp - block.timestamp) / 1000;

      if (gapToNext > 0) {
        // SILENCE TAX FIX: Cap duration at text estimate + buffer
        // Don't give speaker 30s credit just because next person spoke 30s later
        duration = Math.min(gapToNext, textEstimate + MAX_SILENCE_FILL);
      } else {
        // Overlap or simultaneous speech - use text estimate (don't clip)
        // This gives fair credit when speaker is interrupted
        duration = textEstimate;
      }
    } else {
      // Last block: estimate from text length
      duration = textEstimate;
    }

    // Ensure minimum duration
    duration = Math.max(MIN_DURATION, duration);

    rawSegments.push({
      speaker: block.speakerName,
      startTime,
      duration,
      text: block.transcript,
    });
  });

  // Merge consecutive segments from the same speaker ONLY if gap is small
  const segments: SpeechSegment[] = [];
  rawSegments.forEach(segment => {
    const last = segments[segments.length - 1];
    if (last && last.speaker === segment.speaker) {
      const lastEnd = last.startTime + last.duration;
      const gap = segment.startTime - lastEnd;

      if (gap < MERGE_GAP_THRESHOLD && gap > -5) {
        // Small gap or slight overlap - merge
        // Accumulate durations properly (don't double-count overlaps)
        const newEndTime = Math.max(lastEnd, segment.startTime + segment.duration);
        last.duration = newEndTime - last.startTime;
        last.text += ' ' + segment.text;
      } else {
        // Significant gap or data error - keep separate
        segments.push({ ...segment });
      }
    } else {
      segments.push({ ...segment });
    }
  });

  // Calculate total duration (last segment end time)
  const lastSegment = segments[segments.length - 1];
  const meetingDuration = lastSegment.startTime + lastSegment.duration;

  // Aggregate by speaker
  const speakerTotals: Record<string, { duration: number; segments: SpeechSegment[] }> = {};

  segments.forEach(segment => {
    if (!speakerTotals[segment.speaker]) {
      speakerTotals[segment.speaker] = { duration: 0, segments: [] };
    }
    speakerTotals[segment.speaker].duration += segment.duration;
    speakerTotals[segment.speaker].segments.push(segment);
  });

  // Calculate percentages
  const totalSpeakingTime = Object.values(speakerTotals).reduce((sum, s) => sum + s.duration, 0);

  const speakerStats: Record<string, number> = {};
  const speakerDetails: SpeakerStat[] = [];

  Object.entries(speakerTotals).forEach(([speaker, data]) => {
    speakerStats[speaker] = data.duration;
    speakerDetails.push({
      speaker,
      totalDuration: data.duration,
      percentage: totalSpeakingTime > 0 ? Math.round((data.duration / totalSpeakingTime) * 100) : 0,
      segments: data.segments,
    });
  });

  // Sort by total duration descending
  speakerDetails.sort((a, b) => b.totalDuration - a.totalDuration);

  return {
    segments,
    speakerStats,
    meetingDuration,
    speakerDetails,
  };
};

/**
 * Format duration in seconds to human readable string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};
