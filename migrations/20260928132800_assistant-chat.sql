-- AI assistant chat: conversations and messages persisted per user.
-- Messages store the AI SDK UIMessage parts as JSONB.

CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    integer NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_conversations_user_idx
  ON public.assistant_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id              text PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL,
  parts           jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_messages_conversation_idx
  ON public.assistant_messages (conversation_id, created_at);

-- Server-only tables: no anon/authenticated access.
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
