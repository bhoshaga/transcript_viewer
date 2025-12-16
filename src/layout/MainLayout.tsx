import React, { useState, useEffect, useCallback, useRef } from "react";
import RightSidebar from "./RightSidebar";
import { Outlet } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { UserMenu } from "../components/UserMenu";
import { ChevronRight } from "lucide-react";
import { useBreadcrumb } from "../lib/BreadcrumbContext";
import { useTranscript } from "../lib/TranscriptContext";


const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_DEFAULT_WIDTH = 360;
const STORAGE_KEY = 'sidebar-width';

const MainLayout = () => {
  const { navigateToMeetingList } = useBreadcrumb();
  const { meetingName } = useTranscript();

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : SIDEBAR_DEFAULT_WIDTH;
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse event handlers for resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;
    const clampedWidth = Math.min(Math.max(newWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
    setSidebarWidth(clampedWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
    }
  }, [isDragging, sidebarWidth]);

  // Attach/detach global mouse listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleBackToMeetingList = () => {
    navigateToMeetingList();
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur flex-shrink-0">
        <div className="flex justify-between items-center py-4 pr-4 pl-6">
          <div className="flex items-center text-sm align-middle">
            <div className="flex items-center">
              <Button
                className="font-semibold text-muted-foreground py-1 px-2 h-6 hover:bg-secondary flex items-center text-sm"
                variant="ghost"
                onClick={handleBackToMeetingList}
              >
                MeetScribe
              </Button>
              {meetingName && (
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            {meetingName && (
              <div className="flex items-center">
                <span className="text-foreground py-1 px-2 h-6 flex items-center text-sm font-medium">
                  {meetingName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <UserMenu />
          </div>
        </div>
      </nav>
      
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Main content */}
        <div className="main-content flex-1 pl-5 pr-0.5 pb-4 pt-4 overflow-auto">
          <Outlet />
        </div>

        {/* Resizable divider */}
        <div
          className="w-4 cursor-col-resize flex-shrink-0 flex items-center justify-center group"
          onMouseDown={handleMouseDown}
        >
          <div className={`w-px h-full bg-border group-hover:bg-purple-500 transition-colors ${isDragging ? 'bg-purple-500' : ''}`} />
        </div>

        {/* Right sidebar - resizable width */}
        <div
          className="right-sidebar flex-shrink-0 overflow-hidden pt-4 pr-5 pb-4 pl-0.5"
          style={{ width: sidebarWidth }}
        >
          <Card className="h-full flex flex-col overflow-hidden">
            <RightSidebar />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
