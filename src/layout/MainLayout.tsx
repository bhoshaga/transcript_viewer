import React from "react";
import RightSidebar from "./RightSidebar";
import { Outlet } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { UserMenu } from "../components/UserMenu";
import { ChevronRight } from "lucide-react";
import { useBreadcrumb } from "../lib/BreadcrumbContext";


const MainLayout = () => {
  const { navigateToMeetingList } = useBreadcrumb();

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
            <UserMenu />
          </div>
        </div>
      </nav>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="main-content flex-1 pl-5 pr-1.5 pb-4 pt-4 overflow-auto">
          <Outlet />
        </div>

        {/* Right sidebar - always visible */}
        <div className="right-sidebar w-full md:w-[30%] max-w-sm flex-shrink-0 overflow-hidden pt-4 pr-5 pb-4">
          <Card className="h-full flex flex-col overflow-hidden">
            <RightSidebar />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
