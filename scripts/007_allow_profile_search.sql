-- Allow users to search and view profiles for friend requests
-- This is necessary for the friend search functionality to work
-- Other policies still protect profile updates and sensitive operations

CREATE POLICY "Allow profile search for friend requests"
  ON profiles FOR SELECT
  USING (true);
