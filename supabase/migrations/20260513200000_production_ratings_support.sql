alter table public.users add column if not exists "nutritionCredentials" text;
alter table public.users add column if not exists "nutritionServices" text;
alter table public.users add column if not exists "nutritionDisclaimer" text;
alter table public.users add column if not exists "ratingAverage" numeric default 0;
alter table public.users add column if not exists "ratingCount" numeric default 0;

create table if not exists public.ratings (
  id text primary key,
  "targetType" text not null check ("targetType" in ('cook', 'recipe', 'meal')),
  "targetId" text not null,
  "reviewerId" text not null,
  "reviewerName" text not null default '',
  rating numeric not null check (rating >= 1 and rating <= 5),
  body text not null default '',
  "bookingId" text not null default '',
  "createdAt" text,
  "updatedAt" text,
  unique ("targetType", "targetId", "reviewerId")
);

create table if not exists public."supportTickets" (
  id text primary key,
  "userId" text not null,
  "userEmail" text not null default '',
  "userName" text not null default '',
  category text not null default 'general',
  subject text not null default '',
  body text not null default '',
  status text not null default 'open',
  priority text not null default 'normal',
  "createdAt" text,
  "updatedAt" text
);

create or replace function public.recalculate_cook_rating(p_cook_id text)
returns table("ratingAverage" numeric, "ratingCount" numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_average numeric;
  next_count numeric;
begin
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)::numeric
    into next_average, next_count
    from public.ratings
    where "targetType" = 'cook' and "targetId" = p_cook_id;

  update public.users
    set "ratingAverage" = next_average,
        "ratingCount" = next_count,
        "updatedAt" = now()::text
    where id = p_cook_id and role = 'cook';

  return query select next_average, next_count;
end;
$$;

alter table public.ratings enable row level security;
alter table public."supportTickets" enable row level security;

grant select, insert, update, delete on table public.ratings to authenticated;
grant select, insert, update, delete on table public."supportTickets" to authenticated;
grant execute on function public.recalculate_cook_rating(text) to authenticated;

drop policy if exists "authenticated app data read" on public.notifications;
drop policy if exists "authenticated app data write" on public.notifications;
drop policy if exists "authenticated bookings read" on public."bookingRequests";
drop policy if exists "authenticated bookings write" on public."bookingRequests";
drop policy if exists "authenticated chat threads read" on public."chatThreads";
drop policy if exists "authenticated chat threads write" on public."chatThreads";
drop policy if exists "authenticated chat messages read" on public."chatMessages";
drop policy if exists "authenticated chat messages write" on public."chatMessages";
drop policy if exists "authenticated payments read" on public.payments;
drop policy if exists "authenticated payments write" on public.payments;
drop policy if exists "authenticated ratings read" on public.ratings;
drop policy if exists "authenticated ratings write" on public.ratings;
drop policy if exists "authenticated support tickets read" on public."supportTickets";
drop policy if exists "authenticated support tickets write" on public."supportTickets";

create policy "authenticated app data read" on public.notifications for select to authenticated using ("recipientId" = auth.uid()::text);
create policy "authenticated app data write" on public.notifications for all to authenticated using (true) with check (true);
create policy "authenticated bookings read" on public."bookingRequests" for select to authenticated using ("explorerId" = auth.uid()::text or "cookId" = auth.uid()::text);
create policy "authenticated bookings write" on public."bookingRequests" for all to authenticated using ("explorerId" = auth.uid()::text or "cookId" = auth.uid()::text) with check ("explorerId" = auth.uid()::text or "cookId" = auth.uid()::text);
create policy "authenticated chat threads read" on public."chatThreads" for select to authenticated using (auth.uid()::text = any("participantIds"));
create policy "authenticated chat threads write" on public."chatThreads" for all to authenticated using (auth.uid()::text = any("participantIds")) with check (auth.uid()::text = any("participantIds"));
create policy "authenticated chat messages read" on public."chatMessages" for select to authenticated using (
  exists (
    select 1 from public."chatThreads"
    where public."chatThreads".id = public."chatMessages"."threadId"
      and auth.uid()::text = any(public."chatThreads"."participantIds")
  )
);
create policy "authenticated chat messages write" on public."chatMessages" for all to authenticated using ("senderId" = auth.uid()::text) with check ("senderId" = auth.uid()::text);
create policy "authenticated payments read" on public.payments for select to authenticated using ("explorerId" = auth.uid()::text or "cookId" = auth.uid()::text);
create policy "authenticated payments write" on public.payments for all to authenticated using ("explorerId" = auth.uid()::text or "cookId" = auth.uid()::text) with check ("explorerId" = auth.uid()::text or "cookId" = auth.uid()::text);
create policy "authenticated ratings read" on public.ratings for select to authenticated using (true);
create policy "authenticated ratings write" on public.ratings for all to authenticated using ("reviewerId" = auth.uid()::text) with check ("reviewerId" = auth.uid()::text);
create policy "authenticated support tickets read" on public."supportTickets" for select to authenticated using ("userId" = auth.uid()::text);
create policy "authenticated support tickets write" on public."supportTickets" for all to authenticated using ("userId" = auth.uid()::text) with check ("userId" = auth.uid()::text);
