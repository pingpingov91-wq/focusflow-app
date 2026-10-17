create table public.task_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint task_lists_id_user_id_key unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid not null references public.task_lists (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  scheduled_time text not null default '12:00',
  priority text not null default 'Средний'
    check (priority in ('Высокий', 'Средний', 'Низкий')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  constraint tasks_id_user_id_key unique (id, user_id),
  constraint tasks_list_id_user_id_fkey
    foreign key (list_id, user_id)
    references public.task_lists (id, user_id)
    on delete cascade
);

create index task_lists_user_position_idx on public.task_lists (user_id, position);
create index tasks_user_list_created_idx on public.tasks (user_id, list_id, created_at);

alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;

grant select, insert, update, delete on public.task_lists to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

create policy "Users can view their own task lists"
  on public.task_lists for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own task lists"
  on public.task_lists for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can rename their own task lists"
  on public.task_lists for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own task lists"
  on public.task_lists for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can view their own tasks"
  on public.tasks for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own tasks"
  on public.tasks for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.task_lists
      where task_lists.id = list_id and task_lists.user_id = (select auth.uid())
    )
  );

create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.task_lists
      where task_lists.id = list_id and task_lists.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using (user_id = (select auth.uid()));
