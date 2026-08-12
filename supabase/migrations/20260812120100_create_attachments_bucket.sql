-- Private storage bucket for document attachments.
--
-- Private, not public: downloads are served through short-lived signed URLs
-- minted server-side only after src/lib/permissions.ts confirms the caller can
-- view the parent document. A public bucket would make attachment URLs
-- guessable-and-shareable outside the sharing model.

insert into storage.buckets (id, name, public, file_size_limit)
values ('document-attachments', 'document-attachments', false, 10485760)
on conflict (id) do nothing;
