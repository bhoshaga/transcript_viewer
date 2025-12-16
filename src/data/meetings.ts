const pastelColors = [
  "bg-blue-500/60",
  "bg-indigo-500/60",
  "bg-purple-500/60",
  "bg-pink-500/60",
  "bg-rose-500/60",
  "bg-orange-500/60",
  "bg-amber-600/60",
  "bg-emerald-500/60",
  "bg-teal-500/60",
  "bg-cyan-500/60",
  "bg-sky-500/60",
  "bg-violet-500/60",
  "bg-fuchsia-500/60",
];

export const getSpeakerColor = (speaker: string): string => {
  if (!speaker) return pastelColors[0];
  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return pastelColors[hash % pastelColors.length];
};
