# Wiz Chat Omni Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance, mobile-first ChatGPT-style Android client in Expo React Native integrating OmniRoute (AI routing & streaming) and Supabase (Auth, RLS storage, history) with temporary chat ghost mode.

**Architecture:** Presentation layer in Expo React Native with dark theme ergonomics and virtualized FlatList streaming; State & Orchestration layer managing optimistic UI, 50ms token stream buffering, and temporary chat memory sandboxing; Data layer backed by Supabase with SecureStore encryption; AI routing through OpenAI-compatible OmniRoute endpoints.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript, `@supabase/supabase-js`, `expo-secure-store`, `expo-status-bar`, `react-native-url-polyfill`.

**Spec:** `C:\Users\ORANGEBD\Downloads\system_architecture_ui_ux_design_specification.md` and `C:\Users\ORANGEBD\Downloads\agentic_architecture_development_guidelines.md`.

## Global Constraints

- **Theme Palette**: Canvas `#0E1015`, Surface `#181B24`, SurfaceHighlight `#222736`, Input `#13151D`, Primary `#10A37F`, AccentPink `#EC4899`, AccentPurple `#8B5CF6`, Warning `#F59E0B`, Danger `#EF4444`, TextWhite `#F3F4F6`, TextSecondary `#9CA3AF`, TextMuted `#6B7280`.
- **Temporary Chat Sandbox Invariant**: When `isTemporaryChat === true`, zero Supabase sync occurs; messages exist solely in volatile memory and wipe on reset.
- **No Native Alert/Confirm**: All user confirmations (delete chat, sign out) must use custom styled React Native modal dialogs.
- **Client Security**: API keys and auth tokens stored in `expo-secure-store`. Service role key never enters client.
- **Optimistic UI**: Append user message with `msg_temp_*` before network request; buffer streaming chunks to prevent UI frame drops.
- **Validation**: Every task must pass `npx tsc --noEmit`.

---

### Task 1: Theme Tokens and Core TypeScript Definitions

**Files:**
- Create: `src/theme/colors.ts`
- Create: `src/types/index.ts`

**Interfaces:**
- Produces: `THEME` color object with exact hex tokens from design spec.
- Produces: `UserProfile`, `Conversation`, `Message`, `Attachment`, `ChatModel`, `OmniRouteConfig`, `StreamingChunk` interfaces.

- [ ] **Step 1: Write Theme tokens in `src/theme/colors.ts`**

```typescript
export const THEME = {
  bgMain: '#0E1015',
  bgSurface: '#181B24',
  bgSurfaceHighlight: '#222736',
  bgInput: '#13151D',
  primary: '#10A37F',
  accentPink: '#EC4899',
  accentPurple: '#8B5CF6',
  warning: '#F59E0B',
  danger: '#EF4444',
  textWhite: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2A3042',
} as const;

export type ThemeColors = typeof THEME;
```

- [ ] **Step 2: Write Core Type Definitions in `src/types/index.ts`**

```typescript
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_model: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  message_id?: string;
  file_name: string;
  file_type: 'image' | 'document';
  storage_path: string;
  file_size_bytes?: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  is_image_result: boolean;
  image_url?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  isOptimistic?: boolean;
  isError?: boolean;
}

export interface ChatModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  isImageModel?: boolean;
}

export interface OmniRouteConfig {
  baseUrl: string;
  apiKey: string;
  fallbackEnabled: boolean;
  cacheEnabled: boolean;
}

export interface ImageGenerationParams {
  prompt: string;
  model?: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
}
```

- [ ] **Step 3: Run Typecheck to verify definitions**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 4: Commit**

```bash
git add src/theme/colors.ts src/types/index.ts
git commit -m "feat(core): add theme tokens and domain TypeScript types"
```

---

### Task 2: Secure Storage Wrapper and Supabase Client Configuration

**Files:**
- Create: `src/services/secureStorage.ts`
- Create: `src/services/supabase.ts`

**Interfaces:**
- Consumes: `expo-secure-store`, `@supabase/supabase-js`, `OmniRouteConfig`
- Produces: `saveSecureItem`, `getSecureItem`, `deleteSecureItem`, `saveOmniRouteConfig`, `getOmniRouteConfig`, `supabase` client instance.

- [ ] **Step 1: Implement `src/services/secureStorage.ts`**

```typescript
import * as SecureStore from 'expo-secure-store';
import { OmniRouteConfig } from '../types';

const OMNIROUTE_API_KEY_KEY = 'wiz_omniroute_api_key';
const OMNIROUTE_BASE_URL_KEY = 'wiz_omniroute_base_url';

export async function saveSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error saving secure item ${key}:`, error);
    throw error;
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error reading secure item ${key}:`, error);
    return null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error deleting secure item ${key}:`, error);
  }
}

export async function saveOmniRouteConfig(config: Partial<OmniRouteConfig>): Promise<void> {
  if (config.apiKey !== undefined) {
    await saveSecureItem(OMNIROUTE_API_KEY_KEY, config.apiKey);
  }
  if (config.baseUrl !== undefined) {
    await saveSecureItem(OMNIROUTE_BASE_URL_KEY, config.baseUrl);
  }
}

export async function getOmniRouteConfig(): Promise<OmniRouteConfig> {
  const apiKey = (await getSecureItem(OMNIROUTE_API_KEY_KEY)) || '';
  const baseUrl = (await getSecureItem(OMNIROUTE_BASE_URL_KEY)) || 'https://api.omniroute.io/v1';
  return {
    apiKey,
    baseUrl,
    fallbackEnabled: true,
    cacheEnabled: true,
  };
}
```

- [ ] **Step 2: Implement Supabase Client in `src/services/supabase.ts`**

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

// Default fallback credentials for local/testing sandbox
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 3: Run Typecheck to verify implementation**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 4: Commit**

```bash
git add src/services/secureStorage.ts src/services/supabase.ts
git commit -m "feat(services): implement SecureStore adapter and Supabase client"
```

---

### Task 3: OmniRoute AI Gateway Service and SSE Token Buffer

**Files:**
- Create: `src/services/omniRoute.ts`

**Interfaces:**
- Consumes: `OmniRouteConfig`, `Message`, `ImageGenerationParams`, `getOmniRouteConfig`
- Produces: `AVAILABLE_MODELS`, `streamChatCompletion(options)`, `generateImage(params)`

- [ ] **Step 1: Implement `src/services/omniRoute.ts` with streaming parser and 50ms buffer**

```typescript
import { ChatModelOption, ImageGenerationParams, Message, OmniRouteConfig } from '../types';
import { getOmniRouteConfig } from './secureStorage';

export const AVAILABLE_MODELS: ChatModelOption[] = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Fast, lightweight model for everyday conversational queries.',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Flagship multimodal model with advanced reasoning.',
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Top-tier code generation and nuanced reasoning.',
  },
  {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    description: 'Ultra-low latency, next-gen multimodal speed.',
  },
  {
    id: 'together/black-forest-labs/FLUX.1-schnell',
    name: 'FLUX.1 Schnell',
    provider: 'Black Forest Labs',
    description: 'High quality 1-4 step rapid image generation.',
    isImageModel: true,
  },
];

interface StreamChatOptions {
  model: string;
  messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>;
  temperature?: number;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  customConfig?: Partial<OmniRouteConfig>;
}

export async function streamChatCompletion({
  model,
  messages,
  temperature = 0.7,
  onToken,
  onComplete,
  onError,
  signal,
  customConfig,
}: StreamChatOptions): Promise<void> {
  try {
    const config = await getOmniRouteConfig();
    const baseUrl = customConfig?.baseUrl || config.baseUrl;
    const apiKey = customConfig?.apiKey || config.apiKey;

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-OmniRoute-Fallback': config.fallbackEnabled ? 'true' : 'false',
      'X-OmniRoute-Cache': config.cacheEnabled ? 'true' : 'false',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OmniRoute error (${response.status}): ${errorBody || response.statusText}`);
    }

    // Token buffering to prevent frame drops on Android (50ms interval)
    let tokenBuffer = '';
    let accumulatedText = '';
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const flushTokens = () => {
      if (tokenBuffer.length > 0) {
        onToken(tokenBuffer);
        tokenBuffer = '';
      }
    };

    flushTimer = setInterval(flushTokens, 50);

    // Consume stream using response reader or text stream
    if (response.body && typeof (response.body as any).getReader === 'function') {
      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder('utf-8');
      let leftover = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (leftover + chunk).split('\n');
        leftover = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const deltaContent = data.choices?.[0]?.delta?.content || '';
              if (deltaContent) {
                tokenBuffer += deltaContent;
                accumulatedText += deltaContent;
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } else {
      // Fallback for environments where body reader is not standard
      const rawText = await response.text();
      const lines = rawText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const deltaContent = data.choices?.[0]?.delta?.content || '';
            if (deltaContent) {
              accumulatedText += deltaContent;
              onToken(deltaContent);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    if (flushTimer) clearInterval(flushTimer);
    flushTokens();
    onComplete(accumulatedText);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function generateImage(params: ImageGenerationParams): Promise<string> {
  const config = await getOmniRouteConfig();
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/images/generations`;

  const sizeMap: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
  };

  const chosenSize = params.size || (params.aspect_ratio ? sizeMap[params.aspect_ratio] : '1024x1024');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: params.prompt,
      model: params.model || 'together/black-forest-labs/FLUX.1-schnell',
      n: 1,
      size: chosenSize,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Image Generation Error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image URL returned from gateway');
  }

  return imageUrl;
}
```

- [ ] **Step 2: Run Typecheck to verify service**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add src/services/omniRoute.ts
git commit -m "feat(services): implement OmniRoute streaming gateway and image generator"
```

---

### Task 4: Custom Modal Component for Confirmation Dialogs

**Files:**
- Create: `src/components/common/CustomModal.tsx`

**Interfaces:**
- Consumes: `THEME`
- Produces: `CustomModal` component props: `{ visible, title, message, confirmText, cancelText, isDestructive, onConfirm, onCancel }`

- [ ] **Step 1: Implement `src/components/common/CustomModal.tsx`**

```tsx
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    isDestructive ? styles.destructiveButton : styles.confirmButton,
                  ]}
                  onPress={onConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: THEME.bgSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textWhite,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  cancelButtonText: {
    color: THEME.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: THEME.primary,
  },
  destructiveButton: {
    backgroundColor: THEME.danger,
  },
  confirmButtonText: {
    color: THEME.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
});
```

- [ ] **Step 2: Run Typecheck to verify CustomModal**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add src/components/common/CustomModal.tsx
git commit -m "feat(ui): implement non-blocking custom modal dialog"
```

---

### Task 5: Auth Context & Supabase Session Management

**Files:**
- Create: `src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `supabase`, `UserProfile`
- Produces: `AuthContext`, `AuthProvider`, `useAuth` hook (`user`, `profile`, `session`, `loading`, `signInWithGuest`, `signOut`)

- [ ] **Step 1: Implement `src/context/AuthContext.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  updatePreferredModel: (model: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsGuest(true);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        fetchProfile(session.user.id);
      } else {
        setIsGuest(true);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        const newProfile: UserProfile = {
          id: userId,
          display_name: 'Wiz User',
          avatar_url: null,
          preferred_model: 'openai/gpt-4o-mini',
          created_at: new Date().toISOString(),
        };
        setProfile(newProfile);
      }
    } catch (e) {
      console.warn('Profile fetch exception:', e);
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setIsGuest(true);
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const updatePreferredModel = async (model: string) => {
    if (profile) {
      setProfile({ ...profile, preferred_model: model });
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          preferred_model: model,
        });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isGuest,
        signInAsGuest,
        signOut,
        updatePreferredModel,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

- [ ] **Step 2: Run Typecheck to verify AuthContext**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat(auth): implement Supabase AuthContext and session listener"
```

---

### Task 6: Chat State & Temporary Chat (Ghost Mode) Sandbox Invariant

**Files:**
- Create: `src/context/ChatContext.tsx`

**Interfaces:**
- Consumes: `Conversation`, `Message`, `AVAILABLE_MODELS`, `streamChatCompletion`, `generateImage`, `supabase`, `useAuth`
- Produces: `ChatContext`, `ChatProvider`, `useChat` hook with state:
  `conversations`, `currentConversationId`, `messages`, `selectedModel`, `isStreaming`, `isTemporaryChat`, `sendMessage(content)`, `sendImagePrompt(prompt, aspect)`, `createNewChat()`, `switchConversation(id)`, `deleteConversation(id)`, `toggleTemporaryChat()`, `abortStream()`.
- Enforces: **Temporary Chat Sandbox Invariant** (no Supabase sync when `isTemporaryChat === true`).

- [ ] **Step 1: Implement `src/context/ChatContext.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Conversation, Message } from '../types';
import { AVAILABLE_MODELS, generateImage, streamChatCompletion } from '../services/omniRoute';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  selectedModel: string;
  isStreaming: boolean;
  isTemporaryChat: boolean;
  searchQuery: string;
  setSelectedModel: (model: string) => void;
  setSearchQuery: (query: string) => void;
  sendMessage: (content: string) => Promise<void>;
  sendImagePrompt: (prompt: string, aspectRatio?: '1:1' | '16:9' | '9:16') => Promise<void>;
  createNewChat: () => void;
  switchConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  togglePinConversation: (id: string) => Promise<void>;
  toggleTemporaryChat: () => void;
  abortStream: () => void;
  loadConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-4o-mini');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isTemporaryChat, setIsTemporaryChat] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (user && !isTemporaryChat) {
      loadConversations();
    } else {
      setConversations([]);
    }
  }, [user, isTemporaryChat]);

  const loadConversations = async () => {
    if (!user || isTemporaryChat) return;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('Error loading conversations:', error);
        return;
      }
      setConversations((data as Conversation[]) || []);
    } catch (e) {
      console.warn('Conversations fetch error:', e);
    }
  };

  const createNewChat = () => {
    abortStream();
    setCurrentConversationId(null);
    setMessages([]);
  };

  const toggleTemporaryChat = () => {
    abortStream();
    setIsTemporaryChat((prev) => {
      const next = !prev;
      setMessages([]);
      setCurrentConversationId(null);
      return next;
    });
  };

  const switchConversation = async (id: string) => {
    if (isTemporaryChat) return;
    abortStream();
    setCurrentConversationId(id);

    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setSelectedModel(conv.model);
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error loading messages:', error);
        return;
      }
      setMessages((data as Message[]) || []);
    } catch (e) {
      console.warn('Messages fetch error:', e);
    }
  };

  const deleteConversation = async (id: string) => {
    if (isTemporaryChat) return;
    try {
      await supabase.from('conversations').delete().eq('id', id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        createNewChat();
      }
    } catch (e) {
      console.error('Delete conversation failed:', e);
    }
  };

  const togglePinConversation = async (id: string) => {
    if (isTemporaryChat) return;
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;

    const newPinned = !conv.is_pinned;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_pinned: newPinned } : c))
    );

    await supabase
      .from('conversations')
      .update({ is_pinned: newPinned })
      .eq('id', id);
  };

  const abortStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const tempUserMsgId = `msg_temp_${Date.now()}`;
    const userMessage: Message = {
      id: tempUserMsgId,
      conversation_id: currentConversationId || 'temp',
      role: 'user',
      content,
      is_image_result: false,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Active conversation setup if not temporary and not exists
    let activeConvId = currentConversationId;
    if (!isTemporaryChat && user && !activeConvId) {
      try {
        const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title,
            model: selectedModel,
          })
          .select()
          .single();

        if (!error && data) {
          activeConvId = data.id;
          setCurrentConversationId(data.id);
          setConversations((prev) => [data as Conversation, ...prev]);
        }
      } catch (e) {
        console.warn('Failed to create conversation record:', e);
      }
    }

    // Persist user message to Supabase ONLY if NOT temporary chat
    if (!isTemporaryChat && user && activeConvId) {
      supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          role: 'user',
          content,
          is_image_result: false,
        })
        .then(({ error }) => {
          if (error) console.warn('Message insert error:', error);
        });
    }

    // Prepare Assistant response placeholder
    const assistantMsgId = `msg_asst_${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      conversation_id: activeConvId || 'temp',
      role: 'assistant',
      content: '',
      is_image_result: false,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, assistantPlaceholder]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const chatHistory = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await streamChatCompletion({
      model: selectedModel,
      messages: chatHistory,
      signal: controller.signal,
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: msg.content + token } : msg
          )
        );
      },
      onComplete: async (fullText) => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: fullText, isOptimistic: false }
              : msg
          )
        );

        // Persist assistant message ONLY if NOT temporary chat
        if (!isTemporaryChat && user && activeConvId) {
          await supabase.from('messages').insert({
            conversation_id: activeConvId,
            role: 'assistant',
            content: fullText,
            is_image_result: false,
          });

          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', activeConvId);
        }
      },
      onError: (err) => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: `Error: ${err.message}`,
                  isError: true,
                  isOptimistic: false,
                }
              : msg
          )
        );
      },
    });
  };

  const sendImagePrompt = async (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' = '1:1') => {
    if (!prompt.trim() || isStreaming) return;

    const userMsgId = `msg_user_img_${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      conversation_id: currentConversationId || 'temp',
      role: 'user',
      content: `Generate image: ${prompt}`,
      is_image_result: false,
      created_at: new Date().toISOString(),
    };

    const asstMsgId = `msg_asst_img_${Date.now()}`;
    const assistantMessage: Message = {
      id: asstMsgId,
      conversation_id: currentConversationId || 'temp',
      role: 'assistant',
      content: 'Generating image...',
      is_image_result: true,
      image_url: null,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    try {
      const imageUrl = await generateImage({
        prompt,
        aspect_ratio: aspectRatio,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                content: prompt,
                image_url: imageUrl,
                isOptimistic: false,
              }
            : m
        )
      );

      // Persist if not temporary chat
      if (!isTemporaryChat && user && currentConversationId) {
        await supabase.from('messages').insert({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: prompt,
          is_image_result: true,
          image_url: imageUrl,
        });
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                content: `Image generation failed: ${e.message}`,
                isError: true,
                isOptimistic: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversationId,
        messages,
        selectedModel,
        isStreaming,
        isTemporaryChat,
        searchQuery,
        setSelectedModel,
        setSearchQuery,
        sendMessage,
        sendImagePrompt,
        createNewChat,
        switchConversation,
        deleteConversation,
        togglePinConversation,
        toggleTemporaryChat,
        abortStream,
        loadConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
```

- [ ] **Step 2: Run Typecheck to verify ChatContext**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add src/context/ChatContext.tsx
git commit -m "feat(chat): implement ChatContext with temporary chat sandbox invariant"
```

---

### Task 7: UI Header, Ghost Mode Banner, and Model Selector Chip

**Files:**
- Create: `src/components/common/Header.tsx`
- Create: `src/components/common/GhostModeBanner.tsx`
- Create: `src/components/common/ModelPickerModal.tsx`

**Interfaces:**
- Consumes: `THEME`, `useChat`, `AVAILABLE_MODELS`
- Produces: `Header`, `GhostModeBanner`, `ModelPickerModal` components

- [ ] **Step 1: Implement `src/components/common/GhostModeBanner.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { THEME } from '../../theme/colors';

export const GhostModeBanner: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.badge}>TEMPORARY CHAT</Text>
      <Text style={styles.description}>
        Messages are not saved in history and will be cleared when you leave.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: THEME.warning,
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  description: {
    color: THEME.warning,
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
});
```

- [ ] **Step 2: Implement `src/components/common/ModelPickerModal.tsx`**

```tsx
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { AVAILABLE_MODELS } from '../../services/omniRoute';

interface ModelPickerModalProps {
  visible: boolean;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onClose: () => void;
}

export const ModelPickerModal: React.FC<ModelPickerModalProps> = ({
  visible,
  selectedModel,
  onSelectModel,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Model</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modelList}>
                {AVAILABLE_MODELS.map((model) => {
                  const isSelected = model.id === selectedModel;
                  return (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelCard,
                        isSelected && styles.selectedModelCard,
                      ]}
                      onPress={() => {
                        onSelectModel(model.id);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modelHeader}>
                        <Text style={styles.modelName}>{model.name}</Text>
                        <Text style={styles.providerBadge}>{model.provider}</Text>
                      </View>
                      <Text style={styles.modelDescription}>{model.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: THEME.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textWhite,
  },
  closeText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modelList: {
    marginBottom: 16,
  },
  modelCard: {
    backgroundColor: THEME.bgInput,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedModelCard: {
    borderColor: THEME.primary,
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textWhite,
  },
  providerBadge: {
    fontSize: 11,
    color: THEME.primary,
    fontWeight: '600',
    backgroundColor: 'rgba(16, 163, 127, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modelDescription: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
});
```

- [ ] **Step 3: Implement `src/components/common/Header.tsx`**

```tsx
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../../theme/colors';
import { useChat } from '../../context/ChatContext';
import { AVAILABLE_MODELS } from '../../services/omniRoute';
import { ModelPickerModal } from './ModelPickerModal';

interface HeaderProps {
  onToggleDrawer: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleDrawer, onOpenSettings }) => {
  const { selectedModel, setSelectedModel, isTemporaryChat, toggleTemporaryChat } = useChat();
  const [modelPickerVisible, setModelPickerVisible] = useState(false);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onToggleDrawer}
        activeOpacity={0.7}
      >
        <Text style={styles.iconText}>☰</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modelSelector}
        onPress={() => setModelPickerVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.modelName} numberOfLines={1}>
          {currentModel.name}
        </Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <View style={styles.rightActions}>
        <TouchableOpacity
          style={[styles.ghostButton, isTemporaryChat && styles.ghostButtonActive]}
          onPress={toggleTemporaryChat}
          activeOpacity={0.7}
        >
          <Text style={[styles.ghostIcon, isTemporaryChat && styles.ghostIconActive]}>
            👻
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenSettings}
          activeOpacity={0.7}
        >
          <Text style={styles.iconText}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ModelPickerModal
        visible={modelPickerVisible}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onClose={() => setModelPickerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: THEME.bgMain,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: THEME.textWhite,
    fontSize: 20,
    fontWeight: '600',
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgSurface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    maxWidth: 180,
  },
  modelName: {
    color: THEME.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  dropdownArrow: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ghostButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.bgSurface,
  },
  ghostButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: THEME.warning,
  },
  ghostIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  ghostIconActive: {
    opacity: 1,
  },
});
```

- [ ] **Step 4: Run Typecheck to verify Header components**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/Header.tsx src/components/common/GhostModeBanner.tsx src/components/common/ModelPickerModal.tsx
git commit -m "feat(ui): implement Header, GhostModeBanner, and ModelPickerModal"
```

---

### Task 8: Chat Bubble, Message Thread Virtualization, and Autoscroll

**Files:**
- Create: `src/components/chat/MessageBubble.tsx`
- Create: `src/components/chat/MessageList.tsx`

**Interfaces:**
- Consumes: `THEME`, `Message`, `useChat`
- Produces: `MessageBubble`, `MessageList` components (with virtualized FlatList & autoscroll on token streaming).

- [ ] **Step 1: Implement `src/components/chat/MessageBubble.tsx`**

```tsx
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../../theme/colors';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  onImagePress?: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onImagePress }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>⚡</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          message.isError && styles.errorBubble,
        ]}
      >
        {message.is_image_result && message.image_url ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress && onImagePress(message.image_url!)}
          >
            <Image
              source={{ uri: message.image_url }}
              style={styles.imageResult}
              resizeMode="cover"
            />
            <Text style={styles.imagePromptText}>{message.content}</Text>
          </TouchableOpacity>
        ) : (
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
              message.isError && styles.errorText,
            ]}
            selectable
          >
            {message.content}
          </Text>
        )}

        {message.isOptimistic && !message.content && !message.is_image_result && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingDot}>●</Text>
            <Text style={styles.typingDot}>●</Text>
            <Text style={styles.typingDot}>●</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.bgSurfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  botAvatarText: {
    fontSize: 14,
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: THEME.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: THEME.bgSurface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  errorBubble: {
    borderColor: THEME.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: THEME.textWhite,
  },
  assistantText: {
    color: THEME.textWhite,
  },
  errorText: {
    color: THEME.danger,
  },
  imageResult: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginBottom: 6,
  },
  imagePromptText: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    color: THEME.textSecondary,
    fontSize: 10,
  },
});
```

- [ ] **Step 2: Implement `src/components/chat/MessageList.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { THEME } from '../../theme/colors';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onImagePress: (url: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  onImagePress,
}) => {
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, isStreaming]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} onImagePress={onImagePress} />
        )}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={11}
        onContentSizeChange={() => {
          if (isStreaming) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bgMain,
  },
  listContent: {
    paddingVertical: 12,
  },
});
```

- [ ] **Step 3: Run Typecheck to verify Message components**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/MessageList.tsx
git commit -m "feat(ui): implement MessageBubble and virtualized MessageList with streaming scroll"
```

---

### Task 9: Input Bar, Attachment Actions, and Image Studio Mode

**Files:**
- Create: `src/components/chat/InputBar.tsx`
- Create: `src/components/image-studio/ImageStudioModal.tsx`

**Interfaces:**
- Consumes: `THEME`, `useChat`
- Produces: `InputBar`, `ImageStudioModal` components

- [ ] **Step 1: Implement `src/components/image-studio/ImageStudioModal.tsx`**

```tsx
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';

interface ImageStudioModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16') => void;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  visible,
  onClose,
  onGenerate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt, aspectRatio);
    setPrompt('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <Text style={styles.title}>🎨 Image Studio</Text>
              <Text style={styles.subtitle}>
                Powered by FLUX.1 / Together AI via OmniRoute
              </Text>

              <Text style={styles.label}>Prompt</Text>
              <TextInput
                style={styles.input}
                placeholder="Describe image in detail..."
                placeholderTextColor={THEME.textMuted}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Aspect Ratio</Text>
              <View style={styles.aspectRatioRow}>
                {(['1:1', '16:9', '9:16'] as const).map((ratio) => {
                  const isSelected = aspectRatio === ratio;
                  return (
                    <TouchableOpacity
                      key={ratio}
                      style={[styles.ratioChip, isSelected && styles.ratioChipSelected]}
                      onPress={() => setAspectRatio(ratio)}
                    >
                      <Text
                        style={[
                          styles.ratioChipText,
                          isSelected && styles.ratioChipTextSelected,
                        ]}
                      >
                        {ratio}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.generateBtn, !prompt.trim() && styles.disabledBtn]}
                  onPress={handleGenerate}
                  disabled={!prompt.trim()}
                >
                  <Text style={styles.generateBtnText}>Generate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: THEME.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textWhite,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.bgInput,
    color: THEME.textWhite,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 90,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  aspectRatioRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  ratioChip: {
    flex: 1,
    backgroundColor: THEME.bgInput,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  ratioChipSelected: {
    borderColor: THEME.accentPink,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  ratioChipText: {
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  ratioChipTextSelected: {
    color: THEME.accentPink,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  cancelBtnText: {
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  generateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: THEME.accentPink,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: THEME.textWhite,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Implement `src/components/chat/InputBar.tsx`**

```tsx
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { useChat } from '../../context/ChatContext';
import { ImageStudioModal } from '../image-studio/ImageStudioModal';

export const InputBar: React.FC = () => {
  const [text, setText] = useState('');
  const [imageStudioVisible, setImageStudioVisible] = useState(false);
  const { sendMessage, sendImagePrompt, isStreaming, abortStream } = useChat();

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    sendMessage(text.trim());
    setText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.studioButton}
          onPress={() => setImageStudioVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.studioIcon}>🎨</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor={THEME.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
        />

        {isStreaming ? (
          <TouchableOpacity
            style={[styles.sendButton, styles.stopButton]}
            onPress={abortStream}
            activeOpacity={0.7}
          >
            <Text style={styles.stopIcon}>■</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        )}
      </View>

      <ImageStudioModal
        visible={imageStudioVisible}
        onClose={() => setImageStudioVisible(false)}
        onGenerate={(prompt, ratio) => {
          sendImagePrompt(prompt, ratio);
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: THEME.bgMain,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 8,
  },
  studioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 2,
  },
  studioIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: THEME.bgInput,
    color: THEME.textWhite,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: THEME.bgSurfaceHighlight,
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: THEME.danger,
  },
  sendIcon: {
    color: THEME.textWhite,
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopIcon: {
    color: THEME.textWhite,
    fontSize: 14,
  },
});
```

- [ ] **Step 3: Run Typecheck to verify InputBar and ImageStudioModal**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/InputBar.tsx src/components/image-studio/ImageStudioModal.tsx
git commit -m "feat(ui): implement InputBar and ImageStudioModal"
```

---

### Task 10: Slide Drawer with History, Search, and Pinned Chats

**Files:**
- Create: `src/components/drawer/SlideDrawer.tsx`

**Interfaces:**
- Consumes: `THEME`, `useChat`, `useAuth`, `CustomModal`
- Produces: `SlideDrawer` component (width 82%, search filter, pinned items, delete confirmation modal).

- [ ] **Step 1: Implement `src/components/drawer/SlideDrawer.tsx`**

```tsx
import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { CustomModal } from '../common/CustomModal';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.82;

interface SlideDrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const SlideDrawer: React.FC<SlideDrawerProps> = ({
  visible,
  onClose,
  onOpenSettings,
}) => {
  const {
    conversations,
    currentConversationId,
    searchQuery,
    setSearchQuery,
    switchConversation,
    createNewChat,
    deleteConversation,
    togglePinConversation,
    isTemporaryChat,
  } = useChat();

  const { user, isGuest, signOut } = useAuth();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [signOutModalVisible, setSignOutModalVisible] = useState<boolean>(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedList = filteredConversations.filter((c) => c.is_pinned);
  const recentList = filteredConversations.filter((c) => !c.is_pinned);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.drawer}>
              {/* Header */}
              <View style={styles.drawerHeader}>
                <TouchableOpacity
                  style={styles.newChatButton}
                  onPress={() => {
                    createNewChat();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.newChatIcon}>+</Text>
                  <Text style={styles.newChatText}>New Chat</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search conversations..."
                  placeholderTextColor={THEME.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Chat Lists */}
              <ScrollView style={styles.scrollList}>
                {isTemporaryChat && (
                  <View style={styles.ghostNoticeCard}>
                    <Text style={styles.ghostNoticeTitle}>👻 Ghost Mode Active</Text>
                    <Text style={styles.ghostNoticeBody}>
                      History storage is disabled while temporary chat is on.
                    </Text>
                  </View>
                )}

                {pinnedList.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PINNED</Text>
                    {pinnedList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentConversationId}
                        onSelect={() => {
                          switchConversation(conv.id);
                          onClose();
                        }}
                        onPin={() => togglePinConversation(conv.id)}
                        onDelete={() => setDeleteTargetId(conv.id)}
                      />
                    ))}
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>RECENT</Text>
                  {recentList.length === 0 ? (
                    <Text style={styles.emptyText}>No conversations found</Text>
                  ) : (
                    recentList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentConversationId}
                        onSelect={() => {
                          switchConversation(conv.id);
                          onClose();
                        }}
                        onPin={() => togglePinConversation(conv.id)}
                        onDelete={() => setDeleteTargetId(conv.id)}
                      />
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Footer / Account */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.footerRow}
                  onPress={() => {
                    onOpenSettings();
                    onClose();
                  }}
                >
                  <Text style={styles.footerIcon}>⚙</Text>
                  <Text style={styles.footerText}>Settings & API Keys</Text>
                </TouchableOpacity>

                {!isGuest && user && (
                  <TouchableOpacity
                    style={styles.footerRow}
                    onPress={() => setSignOutModalVisible(true)}
                  >
                    <Text style={styles.footerIcon}>🚪</Text>
                    <Text style={[styles.footerText, { color: THEME.danger }]}>Sign Out</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Delete Chat Confirmation Modal */}
      <CustomModal
        visible={!!deleteTargetId}
        title="Delete Conversation"
        message="Are you sure you want to delete this chat? This cannot be undone."
        confirmText="Delete"
        isDestructive
        onConfirm={() => {
          if (deleteTargetId) {
            deleteConversation(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Sign Out Confirmation Modal */}
      <CustomModal
        visible={signOutModalVisible}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        isDestructive
        onConfirm={async () => {
          setSignOutModalVisible(false);
          await signOut();
          onClose();
        }}
        onCancel={() => setSignOutModalVisible(false)}
      />
    </Modal>
  );
};

interface ConversationItemProps {
  conversation: any;
  isActive: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onPin,
  onDelete,
}) => {
  return (
    <TouchableOpacity
      style={[styles.itemContainer, isActive && styles.itemActive]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <Text style={[styles.itemText, isActive && styles.itemTextActive]} numberOfLines={1}>
        {conversation.title}
      </Text>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={onPin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.actionIcon}>{conversation.is_pinned ? '★' : '☆'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.actionIcon, { color: THEME.danger }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: THEME.bgSurface,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    paddingTop: 48,
    paddingBottom: 24,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  newChatIcon: {
    color: THEME.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  newChatText: {
    color: THEME.textWhite,
    fontWeight: '700',
    fontSize: 15,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: THEME.bgInput,
    color: THEME.textWhite,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  ghostNoticeCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.warning,
    marginBottom: 12,
  },
  ghostNoticeTitle: {
    color: THEME.warning,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 2,
  },
  ghostNoticeBody: {
    color: THEME.textSecondary,
    fontSize: 11,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    marginBottom: 6,
    paddingLeft: 8,
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 12,
    paddingLeft: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  itemText: {
    color: THEME.textSecondary,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  itemTextActive: {
    color: THEME.textWhite,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    color: THEME.textMuted,
    fontSize: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerIcon: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  footerText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
```

- [ ] **Step 2: Run Typecheck to verify SlideDrawer**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add src/components/drawer/SlideDrawer.tsx
git commit -m "feat(ui): implement SlideDrawer with search, pinned items, and modal dialogs"
```

---

### Task 11: Settings Modal with SecureStore API Key Storage

**Files:**
- Create: `src/components/settings/SettingsModal.tsx`

**Interfaces:**
- Consumes: `THEME`, `getOmniRouteConfig`, `saveOmniRouteConfig`
- Produces: `SettingsModal` component allowing base URL and API key configuration.

- [ ] **Step 1: Implement `src/components/settings/SettingsModal.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { getOmniRouteConfig, saveOmniRouteConfig } from '../../services/secureStorage';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (visible) {
      getOmniRouteConfig().then((cfg) => {
        setBaseUrl(cfg.baseUrl);
        setApiKey(cfg.apiKey);
        setIsSaved(false);
      });
    }
  }, [visible]);

  const handleSave = async () => {
    await saveOmniRouteConfig({
      baseUrl: baseUrl.trim() || 'https://api.omniroute.io/v1',
      apiKey: apiKey.trim(),
    });
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <Text style={styles.title}>Settings & Gateway</Text>

              <Text style={styles.label}>OmniRoute Base URL</Text>
              <TextInput
                style={styles.input}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://api.omniroute.io/v1"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>OmniRoute API Key (Stored securely)</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Bearer token or OmniRoute key"
                placeholderTextColor={THEME.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />

              {isSaved && <Text style={styles.savedMessage}>✓ Configuration saved securely</Text>}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: THEME.bgSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textWhite,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.bgInput,
    color: THEME.textWhite,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 14,
  },
  savedMessage: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  cancelText: {
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: THEME.primary,
  },
  saveText: {
    color: THEME.textWhite,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Run Typecheck to verify SettingsModal**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/SettingsModal.tsx
git commit -m "feat(ui): implement SettingsModal with secure credential management"
```

---

### Task 12: Main App Assembly & Lightbox Image Viewer

**Files:**
- Modify: `App.tsx`
- Create: `src/components/image-studio/ImageLightboxModal.tsx`

**Interfaces:**
- Consumes: `AuthProvider`, `ChatProvider`, `Header`, `GhostModeBanner`, `MessageList`, `InputBar`, `SlideDrawer`, `SettingsModal`, `ImageLightboxModal`
- Produces: Integrated 60fps Android React Native App with full ghost mode, streaming, and drawer management.

- [ ] **Step 1: Implement `src/components/image-studio/ImageLightboxModal.tsx`**

```tsx
import React from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';

interface ImageLightboxModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    color: THEME.textWhite,
    fontSize: 20,
    fontWeight: 'bold',
  },
  image: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.75,
  },
});
```

- [ ] **Step 2: Implement `App.tsx`**

```tsx
import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { THEME } from './src/theme/colors';
import { AuthProvider } from './src/context/AuthContext';
import { ChatProvider, useChat } from './src/context/ChatContext';
import { Header } from './src/components/common/Header';
import { GhostModeBanner } from './src/components/common/GhostModeBanner';
import { MessageList } from './src/components/chat/MessageList';
import { InputBar } from './src/components/chat/InputBar';
import { SlideDrawer } from './src/components/drawer/SlideDrawer';
import { SettingsModal } from './src/components/settings/SettingsModal';
import { ImageLightboxModal } from './src/components/image-studio/ImageLightboxModal';

const MainScreen: React.FC = () => {
  const { messages, isStreaming, isTemporaryChat } = useChat();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgMain} />
      <View style={styles.container}>
        <Header
          onToggleDrawer={() => setDrawerVisible(true)}
          onOpenSettings={() => setSettingsVisible(true)}
        />

        {isTemporaryChat && <GhostModeBanner />}

        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onImagePress={(url) => setLightboxUrl(url)}
        />

        <InputBar />

        <SlideDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onOpenSettings={() => setSettingsVisible(true)}
        />

        <SettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />

        <ImageLightboxModal
          visible={!!lightboxUrl}
          imageUrl={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MainScreen />
      </ChatProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bgMain,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.bgMain,
  },
});
```

- [ ] **Step 3: Run Typecheck to verify full app compilation**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0)

- [ ] **Step 4: Commit**

```bash
git add App.tsx src/components/image-studio/ImageLightboxModal.tsx
git commit -m "feat(app): assemble main application with lightbox and full provider tree"
```
