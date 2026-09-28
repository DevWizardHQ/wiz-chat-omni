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
