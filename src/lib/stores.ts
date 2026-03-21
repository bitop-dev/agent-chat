import { writable, derived } from "svelte/store";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  profile: string | null;
  createdAt: string;
  updatedAt: string;
}

// Active conversation
export const activeConversationId = writable<string | null>(null);
export const conversations = writable<Conversation[]>([]);
export const messages = writable<Message[]>([]);
export const isLoading = writable(false);

// Settings (persisted to localStorage)
function createPersistedStore<T>(key: string, initial: T) {
  const stored =
    typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  const { subscribe, set } = writable<T>(
    stored ? JSON.parse(stored) : initial
  );
  return {
    subscribe,
    set: (value: T) => {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
      }
      set(value);
    },
  };
}

export const selectedProfile = createPersistedStore<string>("chat-profile", "");
export const gatewayConnected = writable(false);
