-- Drop existing complex delete policies to avoid conflicts
DROP POLICY IF EXISTS "Enable delete for owners and users based on id" ON "public"."expenses";

-- Create a simplified, robust DELETE policy for Authenticated Users (handling owner logic inside USING)
-- WE use a simple policy: Users can delete their own rows, OR Owners can delete ANY row.
CREATE POLICY "Enable delete for owners and users"
ON "public"."expenses"
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner' ))
);

-- Ensure UPDATE is also robust (re-applying just in case)
DROP POLICY IF EXISTS "Enable update for owners and users based on id" ON "public"."expenses";

CREATE POLICY "Enable update for owners and users"
ON "public"."expenses"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner' ))
)
WITH CHECK (
  (auth.uid() = user_id) 
  OR 
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner' ))
);
