-- Enable UPDATE and DELETE for expenses

-- Policy for updating expenses:
-- Owners can update ANY expense.
-- Users can update THEIR OWN expenses.
create policy "Enable update for owners and users based on id"
on "public"."expenses"
as permissive
for update
to authenticated
using (
  (auth.uid() = user_id) OR 
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner' ))
)
with check (
  (auth.uid() = user_id) OR 
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner' ))
);

-- Policy for deleting expenses (in case we need it later, good practice to have symmetry)
create policy "Enable delete for owners and users based on id"
on "public"."expenses"
as permissive
for delete
to authenticated
using (
  (auth.uid() = user_id) OR 
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner' ))
);
