-- Run this once in the Supabase SQL Editor.
create table if not exists public.quiz_scores (
  id bigint generated always as identity primary key,
  student text not null check (char_length(student) between 1 and 50),
  team text not null default '' check (char_length(team) <= 50),
  lab_date text not null default '' check (char_length(lab_date) <= 20),
  correct smallint not null check (correct between 0 and 10),
  percentage smallint not null check (percentage between 0 and 100),
  created_at timestamptz not null default now()
);

-- Safe migration for projects that used the earlier letter-grade version.
alter table public.quiz_scores drop column if exists grade;

alter table public.quiz_scores enable row level security;

drop policy if exists "Anyone can read quiz scores" on public.quiz_scores;
create policy "Anyone can read quiz scores"
  on public.quiz_scores
  for select
  to anon
  using (true);

drop policy if exists "Anyone can submit a valid quiz score" on public.quiz_scores;
create policy "Anyone can submit a valid quiz score"
  on public.quiz_scores
  for insert
  to anon
  with check (
    correct between 0 and 10
    and percentage = correct * 10
  );

grant select, insert on public.quiz_scores to anon;
revoke update, delete on public.quiz_scores from anon;
grant usage, select on sequence public.quiz_scores_id_seq to anon;
