// API endpoints for message actions (starring, action items, etc.)

/**
 * API call to star/unstar a message
 * @param messageId ID of the message to star/unstar
 * @param isStarred Whether the message should be starred or unstarred
 * @param userId The current user's ID
 * @returns Promise that resolves to success/failure
 */
export const toggleMessageStar = async (
  messageId: string, 
  isStarred: boolean,
  userId: string = "current-user" // Default for now
): Promise<{ success: boolean; message?: string }> => {
  // Placeholder implementation - will be replaced with actual API call
  console.log(`API: ${isStarred ? "Starring" : "Unstarring"} message ${messageId} for user ${userId}`);
  
  // Simulate API call with a timeout
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ 
        success: true, 
        message: `Message ${isStarred ? "starred" : "unstarred"} successfully` 
      });
    }, 300);
  });
};

/**
 * API call to create a new action item from a message
 * @param content Content of the action item
 * @param sourceMessageId ID of the source message (if derived from a message)
 * @param userId The current user's ID
 * @returns Promise that resolves to the created action item data
 */
export const createActionItem = async (
  content: string,
  sourceMessageId?: string,
  userId: string = "current-user" // Default for now
): Promise<{ 
  success: boolean; 
  actionItem?: { id: string; content: string; isInferred: boolean; isEditing: boolean; createdAt: string };
  message?: string;
}> => {
  // Placeholder implementation - will be replaced with actual API call
  console.log(`API: Creating action item from message ${sourceMessageId || "manual"} for user ${userId}`);
  console.log(`Action item content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
  
  // Simulate API call with a timeout
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ 
        success: true,
        actionItem: {
          id: crypto.randomUUID(),
          content,
          isInferred: false,
          isEditing: false,
          createdAt: new Date().toISOString()
        },
        message: "Action item created successfully"
      });
    }, 300);
  });
}; 