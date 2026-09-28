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
