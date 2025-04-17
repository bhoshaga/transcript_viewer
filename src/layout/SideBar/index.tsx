import { Button } from "../../components/ui/button";
import { Plus, Users2 } from "lucide-react";
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBreadcrumb } from "../../lib/BreadcrumbContext";

const SideBar = () => {
  const [selectedSpace, setSelectedSpace] = useState("Project 1");
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToMeetingList } = useBreadcrumb();

  const handleProjectClick = () => {
    setSelectedSpace("Project 1");
    console.log("Project 1 clicked. Current path:", location.pathname);
    
    if (location.pathname === '/transcript') {
      console.log("Using breadcrumb navigation to return to meeting list");
      navigateToMeetingList();
    } else {
      console.log("Navigating to /transcript");
      navigate('/transcript', { replace: true });
    }
  };

  return (
    <div className="border-r border-border bg-card p-4 sidebar h-full">
      <h2 className="text-lg font-semibold mb-4">Spaces</h2>
      <div className="space-y-2">
        <Button 
          variant={selectedSpace === "Project 1" ? "secondary" : "ghost"} 
          className="w-full justify-start"
          onClick={handleProjectClick}
        >
          <Users2 className="mr-2" />
          Project 1
        </Button>

        <Button variant="ghost" className="w-full justify-start text-primary">
          <Plus className="mr-2" />
          Create Space
        </Button>
      </div>
    </div>
  );
};

export default SideBar;
