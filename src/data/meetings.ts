// Speaker color assignments for UI display
export const speakerColors: Record<string, string> = {
  Alice: "bg-blue-400/40",
  Bob: "bg-green-400/40",
  Charlie: "bg-yellow-400/40",
  Diana: "bg-purple-400/40",
  Eve: "bg-pink-400/40",
};

// Default color for speakers not in the list
export const getDefaultSpeakerColor = (speaker: string): string => {
  const colors = [
    "bg-blue-400/40",
    "bg-green-400/40",
    "bg-yellow-400/40",
    "bg-purple-400/40",
    "bg-pink-400/40",
    "bg-indigo-400/40",
    "bg-teal-400/40",
    "bg-orange-400/40",
  ];

  // Hash the speaker name to get a consistent color
  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};
