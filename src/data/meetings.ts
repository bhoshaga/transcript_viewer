const pastelColors = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-600",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

export const getSpeakerColor = (speaker: string): string => {
  if (!speaker) return pastelColors[0];
  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};
