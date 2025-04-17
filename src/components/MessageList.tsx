import React, { useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Star, ListTodo, Trash2 } from "lucide-react";
import { Message } from "../types";
import { speakerColors } from "../data/meetings";
import { cn, formatTimestamp } from "../lib/utils";
import { Input } from "./ui/input";

// Add shimmer effect styles
import "./shimmer.css";

interface MessageListProps {
  messages: Message[];
  hoveredDelete: string | null;
  onStar: (id: string) => void;
  onAddToActionItems: (content: string, messageId: string) => void;
  onDelete: (id: string) => void;
  onHoverDelete: (id: string | null) => void;
  searchQuery?: string;
  searchResults?: number[];
  currentSearchIndex?: number;
  isLive?: boolean; // Indicates if this is a live/active meeting
}

/**
 * Extract the first letter of the first name from a speaker name
 * Handles formats like "Last, First" or "First Last"
 */
const getNameInitial = (speaker: string) => {
  // Check if name is in "Last, First" format
  if (speaker.includes(',')) {
    const parts = speaker.split(',');
    if (parts.length > 1) {
      const firstName = parts[1].trim();
      return firstName[0]; // First letter of first name
    }
  }
  
  // Standard case - first letter of full name
  return speaker[0];
};

// Helper to highlight search text within a message
const highlightSearchText = (text: string, searchQuery: string) => {
  if (!searchQuery || searchQuery.trim() === "") {
    return text;
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

/**
 * Skeleton loader component for transcript messages with shimmer effect
 */
const MessageSkeleton = () => {
  return (
    <div className="group flex items-start space-x-3 py-2 px-3 rounded-md transition-colors animate-pulse">
      {/* Avatar skeleton */}
      <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
        <div className="shimmer-effect"></div>
      </div>
      <div className="flex-1 min-w-0 relative overflow-hidden">
        {/* Header skeleton */}
        <div className="flex items-center space-x-2">
          {/* Speaker name skeleton */}
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
            <div className="shimmer-effect"></div>
          </div>
          {/* Timestamp skeleton */}
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
            <div className="shimmer-effect"></div>
          </div>
        </div>
        {/* Content skeleton - single line */}
        <div className="mt-2 relative overflow-hidden">
          <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
            <div className="shimmer-effect"></div>
          </div>
        </div>
      </div>
      {/* Actions skeleton */}
      <div className="flex items-center space-x-1 shrink-0">
        <div className="h-6 w-6 bg-transparent"></div>
        <div className="h-6 w-6 bg-transparent"></div>
      </div>
    </div>
  );
};

export function MessageList({
  messages,
  hoveredDelete,
  onStar,
  onAddToActionItems,
  onDelete,
  onHoverDelete,
  searchQuery = "",
  searchResults = [],
  currentSearchIndex = -1,
  isLive = false,
}: MessageListProps) {
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to the bottom of the transcript
  const scrollToBottom = useCallback(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }
  }, []);

  // Auto-scroll to the current search result
  useEffect(() => {
    if (
      searchResults.length > 0 && 
      currentSearchIndex >= 0 && 
      currentSearchIndex < searchResults.length && 
      messageRefs.current[searchResults[currentSearchIndex]]
    ) {
      const targetElement = messageRefs.current[searchResults[currentSearchIndex]];
      
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [currentSearchIndex, searchResults]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Only scroll when there are messages and we're not in the middle of a search
    if (messages.length > 0 && searchResults.length === 0) {
      // Use setTimeout to ensure the DOM has updated before scrolling
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, scrollToBottom, searchResults.length]);

  return (
    <ScrollArea ref={scrollAreaRef} className="h-full">
      <div className="space-y-2">
        {messages.map((message, index) => {
          const isSearchResult = searchResults.includes(index);
          const isCurrentSearchResult = searchResults[currentSearchIndex] === index;

          return (
            <div
              key={message.id}
              ref={(el) => {
                messageRefs.current[index] = el;
              }}
              className={cn(
                "group flex items-start space-x-3 py-2 px-3 rounded-md transition-colors",
                message.isStarred && "bg-yellow-100 dark:bg-yellow-900/30",
                hoveredDelete === message.id && "bg-red-500/10",
                isCurrentSearchResult && "bg-blue-300/20 border border-blue-400",
                isSearchResult && !isCurrentSearchResult && "bg-blue-200/10"
              )}
            >
              <Avatar className={`${speakerColors[message.speaker]} h-6 w-6 text-xs`}>
                <AvatarFallback>{getNameInitial(message.speaker)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium">{message.speaker}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.timestamp, message.call_time, message.capture_time)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm">
                  {searchQuery ? 
                    highlightSearchText(message.content, searchQuery) : 
                    message.content
                  }
                </p>
              </div>
              <div className={cn(
                "flex items-center space-x-1 shrink-0",
                message.isStarred || message.isActionItem ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
              )}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6",
                    message.isStarred 
                      ? "text-yellow-500 bg-yellow-100/50 dark:bg-yellow-900/50 opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={() => onStar(message.id)}
                  title={message.isStarred ? "Unstar this message" : "Star this message"}
                >
                  <Star 
                    className="h-3 w-3" 
                    fill={message.isStarred ? "currentColor" : "none"}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6",
                    message.isActionItem 
                      ? "text-blue-500 bg-blue-100/50 dark:bg-blue-900/50 opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={() => onAddToActionItems(message.content, message.id)}
                  title={message.isActionItem ? "Remove from action items" : "Add to action items"}
                >
                  <ListTodo className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
        {isLive && (
          <MessageSkeleton />
        )}
        {/* This div serves as our scroll target - always at the very bottom */}
        <div ref={scrollEndRef} className="h-px" />
      </div>
    </ScrollArea>
  );
}
