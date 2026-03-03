-- RPC: 사용자 email로 읽지 않은 메시지 수를 단일 JOIN 쿼리로 반환
-- profiles → conversations → messages 3단계 순차 쿼리를 1회 DB 호출로 대체

CREATE OR REPLACE FUNCTION get_unread_count(p_email text)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::bigint
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  JOIN profiles p ON p.email = p_email
  WHERE
    (c.user_a = p.id OR c.user_b = p.id)
    AND m.sender_id <> p.id
    AND m.read_at IS NULL;
$$;
