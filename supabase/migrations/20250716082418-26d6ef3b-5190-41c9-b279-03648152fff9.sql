-- Create storage bucket for OG cards
insert into storage.buckets (id, name, public) values ('og-cards', 'og-cards', true);

-- Create policy for public access to OG cards
create policy "OG cards are publicly accessible"
on storage.objects for select
using (bucket_id = 'og-cards');