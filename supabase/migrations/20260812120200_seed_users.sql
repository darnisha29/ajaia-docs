-- Seed accounts for the demo.
--
-- Fixed UUIDs so seeded data is stable across re-runs and so the sharing demo
-- can be scripted. Idempotent: re-running this migration is a no-op.
--
-- These are the only accounts that can sign in — the login flow matches on email
-- and does not create users. See ARCHITECTURE.md → "Auth".

insert into public.users (id, email, name)
values
  ('11111111-1111-4111-8111-111111111111', 'ada@ajaia.test',   'Ada Lovelace'),
  ('22222222-2222-4222-8222-222222222222', 'grace@ajaia.test', 'Grace Hopper'),
  ('33333333-3333-4333-8333-333333333333', 'alan@ajaia.test',  'Alan Turing')
on conflict (id) do nothing;
