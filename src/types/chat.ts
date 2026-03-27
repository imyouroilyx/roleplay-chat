export interface Message {
  text: string;
  sender: string;
  color: string;
  type: 'public' | 'whisper';
  recipient?: string | null;
  roomId: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface MemberData {
  id: string;
  name: string;
  isAdmin: boolean;
}