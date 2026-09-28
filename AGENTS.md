# AGENTS.md — Autonomous Agent Directives & Workflows

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo SDK Rules — Do Not Trust Training Data

Expo ships breaking changes every SDK release. Before writing code touching Expo or React Native APIs:
1. Note Expo major version: Expo SDK 57 (`package.json`).
2. Fetch matching docs: `https://docs.expo.dev/versions/v57.0.0/`
3. Check `https://docs.expo.dev/llms.txt` for common corrections.

### Commands
- Always use `npx expo install <package>` to resolve SDK-compatible versions.
- Run `npx tsc --noEmit` and `npx expo lint` before declaring tasks done.
- Dev build / run: `npx expo run:android` or `npx expo start -c`.

---

## 1. Project Mission & Mental Model

Deliver a high-performance, mobile-first ChatGPT-style client for Android leveraging:
- **OmniRoute**: Intelligent model routing, load balancing, and fall-back gateway (OpenAI-compatible `/v1` endpoints).
- **Supabase**: Persistent session state, user authentication, row-level security (RLS), and binary asset storage.
- **Expo React Native**: Cross-platform execution with 60fps Android native performance.

Prioritize **data isolation, graceful degradation during gateway latency, responsive touch UI, and zero state leakage from temporary sessions**.

---

## 2. Agent Roles & Hierarchy

```
                  ┌───────────────────────────────┐
                  │      Orchestrator Agent       │
                  │  (Intent & Context Classifier)│
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ OmniRoute Agent │      │ Supabase Agent  │      │ Mobile UI Agent │
│ Routing & Tools │      │ Data & Security │      │ Expo & Gestures │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 2.1. Orchestrator Agent
- Evaluates user prompts: text completion (`/v1/chat/completions`), image generation (`/v1/images/generations`), multimodal vision processing, or external tools.
- Manages token budget and context pruning (keeping recent $N$ turns + system instructions).

### 2.2. OmniRoute Integration Agent
- Strictly interfaces with the OmniRoute gateway (`https://api.omniroute.io/v1` or custom base URL).
- Enforces model routing strategies (fast tasks to lightweight models like `gpt-4o-mini` / `gemini-2.0-flash`, complex reasoning to `gpt-4o` or `claude-3-5-sonnet`).
- Monitors response latency, failover headers, and SSE streaming protocols.

### 2.3. Supabase & Security Agent
- Validates schema migrations and Row Level Security (RLS) policies.
- Ensures **Temporary Chat** sandbox is never persisted to Supabase tables.
- Handles user session refresh via `@supabase/supabase-js` and Expo SecureStore adapter.
- Directs signed URL generation for attachment uploads.

### 2.4. Mobile UI/UX Agent
- Enforces React Native performance best practices (`React.memo`, FlatList virtualization, non-blocking UI thread animations via native driver / reanimated).
- Maintains Android layout ergonomics (keyboard avoiding views, system status bar insets, hardware back button handlers).

---

## 3. Tool Calling & OmniRoute Protocol Rules

### 3.1. Base URL & Header Structure
OpenAI-compatible specification:
```http
POST /v1/chat/completions HTTP/1.1
Host: api.omniroute.io
Authorization: Bearer <OMNIROUTE_API_KEY>
Content-Type: application/json
X-OmniRoute-Fallback: true
X-OmniRoute-Cache: true
```

### 3.2. Function / Tool Definition Format
Standard JSON schema:
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "generate_image",
        "description": "Call this tool whenever user explicitly requests generating or drawing an image.",
        "parameters": {
          "type": "object",
          "properties": {
            "prompt": {
              "type": "string",
              "description": "Expanded, highly descriptive visual prompt"
            },
            "aspect_ratio": {
              "type": "string",
              "enum": ["1:1", "16:9", "9:16"],
              "default": "1:1"
            }
          },
          "required": ["prompt"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

---

## 4. Invariant Rules & Guardrails for AI Agents

1. **The Temporary Chat Sandbox Invariant**:
   - Under no circumstances should messages generated while `isTemporaryChat === true` be sent to `supabase.from('messages').insert(...)`.
   - Temporary messages reside solely in active memory and are destroyed when conversation is reset or when toggling off ghost mode.

2. **No Secret Leaks in Client Code**:
   - `SUPABASE_SERVICE_ROLE_KEY` must never enter the client application.
   - User-provided OmniRoute API keys must be stored in `expo-secure-store`, not plain `AsyncStorage`.

3. **No Native Alert / Confirm Calls**:
   - Always use custom React Native modal dialogs for critical actions (such as "Delete Chat" or "Sign Out") to ensure cross-platform styling and non-blocking interaction.

4. **Optimistic Updates First**:
   - Immediately append user message to UI state with temporary ID (`msg_temp_*`) before initiating network requests.
   - On failure, mark message with error badge and provide "Retry" touch handler.

5. **Token Stream Buffering**:
   - Buffer streaming chunks using `requestAnimationFrame` or 50ms intervals to prevent frame drops on Android hardware.
