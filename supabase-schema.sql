create table if not exists public.users (
  id text primary key,
  email text not null,
  name text not null default '',
  phone text not null default '',
  role text not null check (role in ('explorer', 'cook')),
  provider text not null default 'email',
  "profileComplete" boolean not null default false,
  "phoneCountryCode" text,
  "phoneNationalNumber" text,
  "photoUrl" text,
  "expoPushTokens" text[] default '{}',
  "savedCookIds" text[] default '{}',
  "recommendationConsent" boolean,
  "behaviorInsightsConsent" boolean,
  "shareReadReceipts" boolean default true,
  "tasteProfile" text[] default '{}',
  "spicePreference" text,
  "mealTemperaturePreference" text,
  "gymGoal" text,
  "portionPreference" text,
  "dislikedIngredients" text,
  "wantedIngredients" text,
  "stripeConnectedAccountId" text,
  "stripeOnboardingComplete" boolean,
  "activeSessionId" text,
  "activeSessionIssuedAt" text,
  "activeSessions" jsonb default '[]'::jsonb,
  "countryCode" text,
  "countryName" text,
  "addressLine1" text,
  "addressLine2" text,
  city text,
  region text,
  "emergencyContactName" text,
  "emergencyContactPhone" text,
  "householdNotes" text,
  "dietaryPreferences" text,
  "nutritionCredentials" text,
  "nutritionServices" text,
  "nutritionDisclaimer" text,
  bio text,
  "specialtiesText" text,
  "yearsExperience" text,
  "serviceRadiusMiles" text,
  "serviceAreaLabel" text,
  "availableMealCategories" text[] default '{}',
  "safetyPractices" text,
  "cookVerification" jsonb,
  "ratingAverage" numeric default 0,
  "ratingCount" numeric default 0,
  "featured" boolean default false,
  "completedBookingCount" numeric default 0,
  "responseScore" numeric default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

alter table public.users add column if not exists "ratingAverage" numeric default 0;
alter table public.users add column if not exists "ratingCount" numeric default 0;
alter table public.users add column if not exists "nutritionCredentials" text;
alter table public.users add column if not exists "nutritionServices" text;
alter table public.users add column if not exists "nutritionDisclaimer" text;
alter table public.users add column if not exists "featured" boolean default false;
alter table public.users add column if not exists "completedBookingCount" numeric default 0;
alter table public.users add column if not exists "responseScore" numeric default 0;

create table if not exists public."cookVerificationQueue" (
  id text primary key,
  "userId" text not null,
  email text,
  name text,
  phone text,
  provider text,
  status text,
  "countryCode" text,
  "countryName" text,
  "documentType" text,
  "documentNumber" text,
  "submittedAt" text,
  "referenceId" text,
  "verifiedAt" text,
  "failureReason" text,
  "matchScore" numeric,
  "updatedAt" text
);

create table if not exists public.notifications (
  id text primary key,
  "recipientId" text not null,
  "actorId" text not null default '',
  "actorName" text not null default '',
  type text not null,
  title text not null,
  body text not null default '',
  "bookingId" text not null default '',
  "threadId" text not null default '',
  read boolean not null default false,
  "readAt" text,
  "createdAt" text not null
);

create table if not exists public."bookingRequests" (
  id text primary key,
  "explorerId" text not null,
  "explorerName" text not null,
  "cookId" text not null,
  "cookName" text not null,
  "dishSummary" text not null default '',
  "serviceDateLabel" text not null default '',
  "guestCount" text not null default '',
  "areaLabel" text not null default '',
  "serviceMode" text not null default 'explorer_home',
  "serviceKind" text not null default 'cook_only',
  "needsMarketTrip" boolean not null default false,
  "wantedInMeal" text not null default '',
  "avoidInMeal" text not null default '',
  "kitchenGuidance" text not null default '',
  "fitnessGoal" text not null default '',
  "portionGuidance" text not null default '',
  "homeAccessNotes" text not null default '',
  "ingredientBudgetAmount" numeric not null default 0,
  notes text not null default '',
  status text not null default 'draft',
  "subtotalAmount" numeric not null default 0,
  "explorerFeeAmount" numeric not null default 0,
  "cookFeeAmount" numeric not null default 0,
  "platformFeeAmount" numeric not null default 0,
  "totalAmount" numeric not null default 0,
  "payoutAmount" numeric not null default 0,
  "commissionRate" numeric not null default 0.2,
  "currencyCode" text not null default 'USD',
  "explorerCountryCode" text not null default 'US',
  "latestOfferAmount" numeric not null default 0,
  "latestOfferBy" text not null default 'explorer',
  "latestOfferNote" text not null default '',
  "negotiationOpen" boolean not null default false,
  "cancellationReason" text not null default '',
  "fundsReleaseStatus" text not null default 'unpaid',
  "trustReleaseConfirmed" boolean not null default false,
  "instantMatch" boolean not null default false,
  "deliveryMode" text not null default 'cook_delivery',
  "threadId" text not null default '',
  "requestGroupKey" text not null default '',
  "createdAt" text,
  "updatedAt" text
);

create table if not exists public."chatThreads" (
  id text primary key,
  "bookingId" text not null,
  "explorerId" text not null,
  "explorerName" text not null,
  "cookId" text not null,
  "cookName" text not null,
  "participantIds" text[] not null default '{}',
  "bookingStatus" text not null default 'draft',
  "lastMessageText" text not null default '',
  "lastMessageAt" text,
  "lastMessageSenderId" text,
  "createdAt" text,
  "updatedAt" text,
  "messageCount" numeric not null default 0,
  "unreadCountBy" jsonb not null default '{}'::jsonb,
  "lastReadAtBy" jsonb not null default '{}'::jsonb,
  "isBlocked" boolean not null default false,
  "archivedBy" jsonb not null default '{}'::jsonb,
  "hiddenBy" jsonb not null default '{}'::jsonb
);

create table if not exists public."chatMessages" (
  id text primary key,
  "threadId" text not null,
  "bookingId" text not null,
  "senderId" text not null,
  "senderName" text not null,
  "senderRole" text not null,
  body text not null,
  "createdAt" text
);

create table if not exists public.payments (
  id text primary key,
  "bookingId" text not null,
  "explorerId" text not null,
  "cookId" text not null,
  amount numeric not null default 0,
  "subtotalAmount" numeric not null default 0,
  "ingredientBudgetAmount" numeric not null default 0,
  "explorerFeeAmount" numeric not null default 0,
  "cookFeeAmount" numeric not null default 0,
  "platformFeeAmount" numeric not null default 0,
  "payoutAmount" numeric not null default 0,
  "currencyCode" text not null default 'USD',
  status text not null,
  provider text not null,
  "createdAt" text,
  "updatedAt" text
);

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

grant execute on function public.recalculate_cook_rating(text) to authenticated;

create table if not exists public."assistantResponseCache" (
  id text primary key,
  response jsonb not null,
  "createdAt" text not null
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chatThreads'
  ) then
    alter publication supabase_realtime add table public."chatThreads";
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chatMessages'
  ) then
    alter publication supabase_realtime add table public."chatMessages";
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookingRequests'
  ) then
    alter publication supabase_realtime add table public."bookingRequests";
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end $$;

alter table public.users enable row level security;
alter table public."cookVerificationQueue" enable row level security;
alter table public.notifications enable row level security;
alter table public."bookingRequests" enable row level security;
alter table public."chatThreads" enable row level security;
alter table public."chatMessages" enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;
alter table public."supportTickets" enable row level security;
alter table public."assistantResponseCache" enable row level security;

alter table public.users drop column if exists password;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public."cookVerificationQueue" to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public."bookingRequests" to authenticated;
grant select, insert, update, delete on table public."chatThreads" to authenticated;
grant select, insert, update, delete on table public."chatMessages" to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.ratings to authenticated;
grant select, insert, update, delete on table public."supportTickets" to authenticated;

drop policy if exists "app users can read users" on public.users;
drop policy if exists "app users can insert own user row" on public.users;
drop policy if exists "app users can update own user row" on public.users;
drop policy if exists "service role manages users" on public.users;
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
drop policy if exists "authenticated verification read" on public."cookVerificationQueue";
drop policy if exists "authenticated verification write" on public."cookVerificationQueue";
drop policy if exists "service role manages assistant cache" on public."assistantResponseCache";

create policy "app users can read users" on public.users for select to authenticated using (true);
create policy "app users can insert own user row" on public.users for insert to authenticated with check (auth.uid()::text = id);
create policy "app users can update own user row" on public.users for update to authenticated using (auth.uid()::text = id) with check (auth.uid()::text = id);
create policy "service role manages users" on public.users for all to service_role using (true) with check (true);

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
create policy "authenticated verification read" on public."cookVerificationQueue" for select to authenticated using (true);
create policy "authenticated verification write" on public."cookVerificationQueue" for all to authenticated using (true) with check (true);
create policy "service role manages assistant cache" on public."assistantResponseCache" for all to service_role using (true) with check (true);
