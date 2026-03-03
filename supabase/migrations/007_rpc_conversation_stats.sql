-- RPC: 대화 목록의 '최신 메시지'와 '읽지 않은 수'를 DB 레벨에서 집계
-- 기존: 전체 메시지를 limit 없이 로드 후 JS for 루프 집계
-- 개선: DISTINCT ON 으로 최신 메시지 1건/대화, COUNT GROUP BY 로 unread 수

CREATE OR REPLACE FUNCTION get_conversation_stats(p_conv_ids uuid[], p_my_id uuid)
RETURNS TABLE(
  conversation_id uuid,
  last_content     text,
  last_created_at  timestamptz,
  unread_count     bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (conversation_id)
      conversation_id,
      content      AS last_content,
      created_at   AS last_created_at
    FROM messages
    WHERE conversation_id = ANY(p_conv_ids)
    ORDER BY conversation_id, created_at DESC
  ),
  unread AS (
    SELECT
      conversation_id,
      COUNT(*) AS unread_count
    FROM messages
    WHERE
      conversation_id = ANY(p_conv_ids)
      AND sender_id   <> p_my_id
      AND read_at     IS NULL
    GROUP BY conversation_id
  )
  SELECT
    l.conversation_id,
    l.last_content,
    l.last_created_at,
    COALESCE(u.unread_count, 0) AS unread_count
  FROM latest l
  LEFT JOIN unread u USING (conversation_id);
$$;
