-- 메시지 기능: conversations, messages 테이블

-- 1. conversations: 1:1 대화방
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  unique (user_a, user_b)
);

-- 2. messages: 대화 메시지
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- 인덱스
create index if not exists idx_conversations_user_a on conversations(user_a);
create index if not exists idx_conversations_user_b on conversations(user_b);
create index if not exists idx_conversations_last_message_at on conversations(last_message_at desc);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_created_at on messages(created_at);

-- last_message_at 자동 갱신 트리거
create or replace function update_conversation_last_message_at()
returns trigger as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger messages_update_conversation
  after insert on messages
  for each row execute function update_conversation_last_message_at();
