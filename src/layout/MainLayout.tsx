import React, { useState, useEffect, useCallback, useRef } from "react";
import RightSidebar from "./RightSidebar";
import { Outlet } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { UserMenu } from "../components/UserMenu";
import { ChevronRight, X } from "lucide-react";
import { useBreadcrumb } from "../lib/BreadcrumbContext";
import { useTranscript } from "../lib/TranscriptContext";


const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_DEFAULT_WIDTH = 360;
const STORAGE_KEY = 'sidebar-width';

const MainLayout = () => {
  const { navigateToMeetingList } = useBreadcrumb();
  const { meetingName } = useTranscript();

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for chat drawer open event
  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener('openChatDrawer', handleOpenChat);
    return () => window.removeEventListener('openChatDrawer', handleOpenChat);
  }, []);

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

  // Double-click to reset to default width
  const handleDoubleClick = useCallback(() => {
    setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
    localStorage.setItem(STORAGE_KEY, SIDEBAR_DEFAULT_WIDTH.toString());
  }, []);

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
                Stru Meet
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
      
      <div className="flex flex-1 min-h-0 overflow-hidden" ref={containerRef}>
        {/* Main content */}
        <div className="main-content flex-1 pl-3 pr-3 md:pl-5 md:pr-0.5 pb-4 pt-4 overflow-auto relative">
          <Outlet />
        </div>

        {/* Resizable divider - hidden on mobile */}
        {!isMobile && (
          <div
            className="w-4 cursor-col-resize flex-shrink-0 flex items-center justify-center group"
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
          >
            <div className={`w-px h-full bg-border group-hover:bg-purple-500 transition-colors ${isDragging ? 'bg-purple-500' : ''}`} />
          </div>
        )}

        {/* Right sidebar - hidden on mobile, shown as drawer */}
        {!isMobile && (
          <div
            className="right-sidebar flex-shrink-0 overflow-hidden pt-4 pr-5 pb-4 pl-0.5"
            style={{ width: sidebarWidth }}
          >
            <Card className="h-full flex flex-col overflow-hidden">
              <RightSidebar />
            </Card>
          </div>
        )}
      </div>

      {/* Mobile: Full-screen chat drawer */}
      {isMobile && isChatOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-medium">Chat</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsChatOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            <RightSidebar />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
