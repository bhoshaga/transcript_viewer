import { Meeting, Space } from "../types";

export const meetings: Meeting[] = [
  {
    id: "1",
    name: "Q4 Strategy Meeting",
    date: "Oct 15, 2023",
    start_time: "10:00 AM",
    end_time: "11:30 AM",
    participants: ["Alice", "Bob", "Charlie", "Diana", "Eve"],
    transcript: [
      {
        id: "1",
        speaker: "Alice",
        timestamp: "10:00",
        content:
          "Welcome everyone to our Q4 strategy meeting. Let's review our Q3 performance first.",
      },
      {
        id: "2",
        speaker: "Bob",
        timestamp: "10:01",
        content:
          "I have the Q3 numbers ready. We've seen a 15% growth in user engagement.",
      },
      {
        id: "3",
        speaker: "Alice",
        timestamp: "10:02",
        content:
          "Perfect! So, let's kick off by reviewing Q3. Bob, I believe you have the numbers ready?",
      },
      {
        id: "4",
        speaker: "Bob",
        timestamp: "10:03",
        content:
          "Absolutely. Our Q3 metrics are in, and we're looking at a 15% growth in user engagement overall. A solid quarter for sure!",
      },
      {
        id: "5",
        speaker: "Charlie",
        timestamp: "10:05",
        content:
          "Not bad! That's like... what, an extra 200,000 users sticking around? I'll take it!",
      },
      {
        id: "6",
        speaker: "Alice",
        timestamp: "10:06",
        content:
          "Exactly, Charlie! And Bob, could you break down the engagement by region?",
      },
      {
        id: "7",
        speaker: "Bob",
        timestamp: "10:07",
        content:
          "APAC saw the strongest growth at 22%, followed by EMEA at 18%. Meanwhile, North America held steady with a 12% increase.",
      },
      // Continue with remaining messages and assign IDs to each
    ],
  },
  {
    id: "2",
    name: "Q3 Strategy Meeting",
    date: "Jul 12, 2023",
    start_time: "10:00 AM",
    end_time: "11:00 AM",
    participants: ["Alice", "Bob", "Charlie"],
    transcript: [
      {
        id: "1",
        speaker: "Alice",
        timestamp: "10:00",
        content:
          "Welcome to our Q3 strategy meeting! Let's dive into our H1 results and see what we need to double down on.",
      },
      {
        id: "2",
        speaker: "Bob",
        timestamp: "10:02",
        content:
          "I've prepared the H1 metrics. So far, we're looking at a 30% increase in user retention.",
      },
      {
        id: "3",
        speaker: "Charlie",
        timestamp: "10:05",
        content:
          "That's what I like to hear! Seems like the new features we launched in Q2 are paying off.",
      },
      // Continue with remaining messages and assign IDs to each
    ],
  },
  {
    id: "3",
    name: "Q2 Strategy Meeting",
    date: "Apr 15, 2023",
    start_time: "10:00 AM",
    end_time: "11:00 AM",
    participants: ["Alice", "Bob", "Diana"],
    transcript: [
      {
        id: "1",
        speaker: "Alice",
        timestamp: "10:00",
        content:
          "Alright team, welcome to our Q2 planning session! Let's start with any insights from Q1.",
      },
      {
        id: "2",
        speaker: "Bob",
        timestamp: "10:02",
        content:
          "I have some exciting new features planned for the product this quarter.",
      },
      {
        id: "3",
        speaker: "Diana",
        timestamp: "10:05",
        content:
          "And user research is pushing us towards prioritizing messaging features. There's a lot of demand for more seamless communication tools.",
      },
      // Continue with remaining messages and assign IDs to each
    ],
  },
];

export const currentSpace: Space = {
  id: "1",
  name: "Project 1",
  members: [
    {
      id: "1",
      name: "Alice",
      email: "alice@company.com",
      role: "Product Manager",
    },
    { id: "2", name: "Bob", email: "bob@company.com", role: "Designer" },
    {
      id: "3",
      name: "Charlie",
      email: "charlie@company.com",
      role: "Engineer",
    },
    {
      id: "4",
      name: "Diana",
      email: "diana@company.com",
      role: "Product Analyst",
    },
    { id: "5", name: "Eve", email: "eve@company.com", role: "Marketing" },
  ],
};

export const speakerColors: Record<string, string> = {
  Alice: "bg-blue-400/40",
  Bob: "bg-green-400/40",
  Charlie: "bg-yellow-400/40",
  Diana: "bg-purple-400/40",
  Eve: "bg-pink-400/40",
};

export const speakerStats = {
  Alice: 35,
  Bob: 28,
  Charlie: 20,
  Diana: 12,
  Eve: 5,
};
