-- Enhanced Group Chat Database Schema
-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.message_read_receipts CASCADE;
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;

-- Chats table (supports both group and direct chats)
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type varchar(20) NOT NULL DEFAULT 'group', -- 'group' or 'direct'
  name varchar(255) NULL, -- Group name (null for direct chats)
  description text NULL,
  group_id uuid NULL, -- Reference to groups table for group chats
  avatar_url text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_archived boolean DEFAULT false,
  last_message_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_type_check CHECK (type IN ('group', 'direct'))
);

-- Chat participants (who can access the chat)
CREATE TABLE public.chat_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar(20) DEFAULT 'member', -- 'admin', 'member'
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone DEFAULT now(),
  is_muted boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  CONSTRAINT chat_participants_pkey PRIMARY KEY (id),
  CONSTRAINT chat_participants_unique UNIQUE (chat_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  content text NULL, -- Message text content
  message_type varchar(20) DEFAULT 'text', -- 'text', 'file', 'image', 'system', 'call'
  reply_to_id uuid NULL REFERENCES public.messages(id), -- For threaded replies
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  metadata jsonb DEFAULT '{}', -- For storing additional data (call info, etc.)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

-- Message attachments (files, images, etc.)
CREATE TABLE public.message_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  filename varchar(255) NOT NULL,
  original_filename varchar(255) NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  mime_type varchar(100) NOT NULL,
  thumbnail_url text NULL, -- For images/videos
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_attachments_pkey PRIMARY KEY (id)
);

-- Message read receipts
CREATE TABLE public.message_read_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_read_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT message_read_receipts_unique UNIQUE (message_id, user_id)
);

-- Message reactions (emojis)
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji varchar(10) NOT NULL, -- Unicode emoji
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT message_reactions_unique UNIQUE (message_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX idx_chats_group_id ON public.chats(group_id);
CREATE INDEX idx_chats_type ON public.chats(type);
CREATE INDEX idx_chats_last_message_at ON public.chats(last_message_at DESC);

CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);

CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_reply_to_id ON public.messages(reply_to_id);

CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Chat access policies
CREATE POLICY "Users can view chats they participate in" ON public.chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Chat admins can update chats" ON public.chats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid() AND cp.role = 'admin'
    )
  );

-- Participant policies
CREATE POLICY "Users can view participants in their chats" ON public.chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat admins can manage participants" ON public.chat_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid() AND cp.role = 'admin'
    )
  );

-- Message policies
CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chats" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_participants cp 
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- Attachment policies
CREATE POLICY "Users can view attachments in their chats" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_participants cp ON cp.chat_id = m.chat_id
      WHERE m.id = message_attachments.message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add attachments to their messages" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id AND m.sender_id = auth.uid()
    )
  );

-- Read receipt policies
CREATE POLICY "Users can manage their own read receipts" ON public.message_read_receipts
  FOR ALL USING (user_id = auth.uid());

-- Reaction policies
CREATE POLICY "Users can manage their own reactions" ON public.message_reactions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view reactions in their chats" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chat_participants cp ON cp.chat_id = m.chat_id
      WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
    )
  );
