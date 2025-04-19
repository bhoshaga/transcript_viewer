import React, { useState } from "react";
import RightSidebar from "./RightSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { UserMenu } from "../components/UserMenu";
import { ChevronRight, Users, Minimize } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Mail } from "lucide-react";
import { currentSpace, speakerColors } from "../data/meetings";
import { useBreadcrumb } from "../lib/BreadcrumbContext";

// Add some CSS to ensure the toggle button is properly positioned
if (typeof document !== 'undefined') {
  const styleId = 'main-layout-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Position for the toggle button */
      .sidebar-toggle-button {
        position: fixed;
        top: 4.55rem; /* Adjusted position to account for header height */
        right: 6px; /* Move more significantly left from the edge */
        width: 1.75rem;
        height: 1.5rem;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        border-top-left-radius: 0.25rem;
        border-bottom-left-radius: 0.25rem;
        border-right: none;
        background-color: var(--background);
        border: 1px solid var(--border);
        border-right: none;
        padding: 0;
        margin-right: 4px;
      }
    `;
    document.head.appendChild(style);
  }
}

const MainLayout = () => {
  const navigate = useNavigate();
  const { navigateToMeetingList } = useBreadcrumb();
  // Add state to control sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Function to get first name
  const getFirstName = (fullName: string): string => {
    // Check if name is in "Last, First" format
    if (fullName.includes(',')) {
      const parts = fullName.split(',');
      if (parts.length > 1) {
        return parts[1].trim(); // Return the first name part
      }
    }
    
    // Standard format - first part of space-separated name
    return fullName.split(' ')[0];
  };

  const handleBackToMeetingList = () => {
    // Use the context method instead of direct navigation
    navigateToMeetingList();
  };

  const handleInviteMember = () => {
    // Placeholder for invite member functionality
  };

  // Toggle sidebar function
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground flex-shrink-0" />
            </div>
            
            <div className="flex items-center">
              <Button
                variant="ghost"
                className="text-foreground hover:text-primary py-1 px-2 h-6 hover:bg-secondary flex items-center text-sm font-medium"
                onClick={handleBackToMeetingList}
                type="button"
                aria-label="Back to meeting list"
              >
                Project 1
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  {currentSpace.members.length} Members
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    Team Members
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Email address"
                      className="bg-background"
                    />
                    <Button onClick={handleInviteMember}>
                      <Mail className="mr-2 h-4 w-4" />
                      Invite
                    </Button>
                  </div>
                  <Separator className="bg-border" />
                  <div className="space-y-2">
                    {currentSpace.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className={speakerColors[member.name]}>
                            <AvatarFallback>{getFirstName(member.name)[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {member.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <UserMenu />
          </div>
        </div>
      </nav>
      
      {/* Fixed position toggle button that appears when sidebar is closed */}
      {!isSidebarOpen && (
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          className="sidebar-toggle-button"
          aria-label="Open Chat"
        >
          <Minimize className="h-3 w-3" />
        </Button>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main content - now takes up more space without left sidebar */}
        <div className={`main-content flex-1 p-4 overflow-auto ${!isSidebarOpen ? 'relative' : ''}`}>
          <Outlet /> {/* This is where nested routes will be rendered */}
        </div>
        
        {/* Right sidebar with toggle functionality - ensure the class name is exactly right-sidebar */}
        {isSidebarOpen && (
          <div className="right-sidebar w-full md:w-1/4 max-w-xs flex-shrink-0 overflow-hidden border-l border-border">
            <RightSidebar onClose={toggleSidebar} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
