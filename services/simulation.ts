import { GameState, MOCK_USERS, FarcasterUser } from '../types';

const INITIAL_IMAGE = "https://picsum.photos/id/28/800/800"; // Forest

export const getInitialState = (): GameState => ({
  turnCount: 1,
  maxTurns: 10,
  currentImage: INITIAL_IMAGE,
  currentPrompt: "A mysterious forest landscape",
  lastEditor: null,
  nextEditor: MOCK_USERS[3], // 'you' start
  deadline: Date.now() + 30 * 60 * 1000, // 30 mins from now
  history: []
});

// Simulate Venice AI Edit
export const simulateEdit = async (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, this calls Venice API
      // For demo, we just return a different random image
      const randomId = Math.floor(Math.random() * 100) + 10;
      resolve(`https://picsum.photos/id/${randomId}/800/800`);
    }, 2000);
  });
};

export const formatTimeLeft = (deadline: number | null): string => {
  if (!deadline) return "Open to All";
  const now = Date.now();
  const diff = deadline - now;
  if (diff <= 0) return "Expired (Open Round)";
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};