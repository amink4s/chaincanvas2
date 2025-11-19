export enum TabView {
  BLUEPRINT = 'BLUEPRINT',
  PROTOTYPE = 'PROTOTYPE',
  STACK = 'STACK'
}

export interface FarcasterUser {
  fid: number;
  username: string;
  pfpUrl: string;
}

export interface GameState {
  turnCount: number;
  maxTurns: number;
  currentImage: string;
  currentPrompt: string;
  lastEditor: FarcasterUser | null;
  nextEditor: FarcasterUser | null;
  deadline: number | null; // Timestamp
  history: GameHistoryItem[];
}

export interface GameHistoryItem {
  turn: number;
  editor: FarcasterUser;
  image: string;
  prompt: string;
}

export const MOCK_USERS: FarcasterUser[] = [
  { fid: 1, username: 'dwr.eth', pfpUrl: 'https://picsum.photos/id/64/100/100' },
  { fid: 2, username: 'v', pfpUrl: 'https://picsum.photos/id/65/100/100' },
  { fid: 3, username: 'balajis', pfpUrl: 'https://picsum.photos/id/66/100/100' },
  { fid: 88, username: 'you', pfpUrl: 'https://picsum.photos/id/237/100/100' },
];