-- A question answered wrong again in a later assignment of the same lesson (a daily set drawn from
-- the same bank, an exam from that bank) reopens the learner's existing mistake card instead of
-- adding a second one: the streak starts over and the card is due again. Before, every daily set
-- added its own card, so one question could wait in the review queue several times, each copy
-- needing its own three correct reviews. A new card is still made when the earlier card belongs to
-- another lesson, or when the new mistake waits for an after_due test's results (its own card
-- keeps it hidden until then). Cards already in the table are left as they are.
create index srs_cards_user_item_idx on public.srs_cards(user_id, item_type, item_id);

create function public.merge_repeated_mistake() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_lesson_id text;
  v_existing record;
begin
  if new.item_type <> 'mistake' or new.due > now() then
    return new;
  end if;
  -- A retake of the same assignment keeps its own card (the insert's conflict update resets it).
  if exists (
    select 1 from public.srs_cards c
    where c.user_id = new.user_id and c.item_type = 'mistake' and c.source_id = new.source_id
      and c.item_id = new.item_id
  ) then
    return new;
  end if;
  select a.lesson_id into v_lesson_id from public.assignments a where a.id::text = new.source_id;
  if v_lesson_id is null then
    return new;
  end if;
  select c.source_id into v_existing
    from public.srs_cards c
    join public.assignments a on a.id::text = c.source_id
    where c.user_id = new.user_id and c.item_type = 'mistake' and c.item_id = new.item_id
      and a.lesson_id = v_lesson_id
    order by c.resolved_at is null desc, c.updated_at desc
    limit 1;
  if not found then
    return new;
  end if;
  update public.srs_cards set correct_streak = 0, resolved_at = null, due = new.due,
      revision = revision + 1, updated_at = now()
    where user_id = new.user_id and item_type = 'mistake' and source_id = v_existing.source_id
      and item_id = new.item_id;
  return null;
end;
$$;

create trigger srs_cards_merge_repeated_mistake before insert on public.srs_cards
  for each row execute function public.merge_repeated_mistake();

revoke all on function public.merge_repeated_mistake() from public, anon, authenticated;
