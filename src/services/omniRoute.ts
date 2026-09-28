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
