-- Add is_read column to request_messages table to track read status
ALTER TABLE public.request_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Create an index for faster queries on unread messages
CREATE INDEX IF NOT EXISTS request_messages_is_read_idx ON public.request_messages(is_read);
CREATE INDEX IF NOT EXISTS request_messages_request_id_is_read_idx ON public.request_messages(request_id, is_read);

-- Add a function to get unread message count for a user in a specific request
CREATE OR REPLACE FUNCTION get_unread_message_count(p_request_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM request_messages
    WHERE request_id = p_request_id
      AND sender_id != p_user_id
      AND is_read = false
  );
END;
$$ LANGUAGE plpgsql;

-- Add a function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_request_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE request_messages
  SET is_read = true
  WHERE request_id = p_request_id
    AND sender_id != p_user_id
    AND is_read = false;
END;
$$ LANGUAGE plpgsql;

