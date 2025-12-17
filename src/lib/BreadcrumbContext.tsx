import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';

interface BreadcrumbContextType {
  navigateToMeetingList: () => void;
  registerNavigateHandler: (handler: () => void) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  navigateToMeetingList: () => {},
  registerNavigateHandler: () => {},
});

export const useBreadcrumb = () => useContext(BreadcrumbContext);

export const BreadcrumbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [navigateHandler, setNavigateHandler] = useState<(() => void) | null>(null);

  // Store the handler function
  const registerNavigateHandler = useCallback((handler: () => void) => {
    setNavigateHandler(() => handler);
  }, []);

  // Call the stored handler function
  const navigateToMeetingList = useCallback(() => {
    if (navigateHandler) {
      navigateHandler();
    }
  }, [navigateHandler]);

  return (
    <BreadcrumbContext.Provider value={{ navigateToMeetingList, registerNavigateHandler }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}; 