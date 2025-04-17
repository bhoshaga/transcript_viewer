import React from "react";
import SideBar from "./SideBar";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { UserMenu } from "../components/UserMenu";
import { ChevronRight, Users } from "lucide-react";
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

const MainLayout = () => {
  const navigate = useNavigate();
  const { navigateToMeetingList } = useBreadcrumb();
  
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
    // Use the context navigation function if available
    navigateToMeetingList();
    // Fall back to direct navigation if needed
    navigate('/transcript', { replace: true });
  };

  const handleInviteMember = () => {
    // Placeholder for invite member functionality
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur flex-shrink-0">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center text-sm align-middle">
            <div className="flex items-center">
              <Button
                className="font-semibold text-muted-foreground py-1 px-2 h-6 hover:bg-secondary flex items-center text-sm"
                variant="ghost"
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
      
      <div className="flex flex-1 overflow-hidden">
        <div className="sidebar-container w-full md:w-1/4 max-w-xs flex-shrink-0 overflow-auto">
          <SideBar />
        </div>
        <div className="main-content flex-1 p-4 overflow-auto">
          <Outlet /> {/* This is where nested routes will be rendered */}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
