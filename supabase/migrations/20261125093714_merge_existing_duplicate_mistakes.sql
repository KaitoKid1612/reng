-- One open mistake card per learner, lesson and question for the cards made before
-- 20261125084314_merge_repeated_mistakes, when each assignment of a lesson (every daily set drawn
-- from the same bank) added its own card for a question missed again. In each group the card kept
-- is the open one changed last (or, when all are learned, the one learned last). The others leave
-- the review queue: one without reviews is deleted, one with reviews is marked done and kept,
-- because review history is immutable (review_events_immutable) and refers to its card. Cards of a
-- test whose results are not out yet are left alone, so nothing is revealed before the teacher
-- releases it. Approved by the owner on 25/11/2026; production has no backups, so the preview
-- query in docs/testing/deep-review-2026-11-25.md shows what changes before this runs.
begin;

create temporary table mistake_merge on commit drop as
with eligible as (
  select c.user_id, c.source_id, c.item_id, a.lesson_id, c.resolved_at, c.updated_at,
    c.created_at
  from public.srs_cards c
  join public.assignments a on a.id::text = c.source_id
  where c.item_type = 'mistake'
    and (a.feedback_policy = 'after_submit' or a.due_at <= now())
),
ranked as (
  select eligible.*,
    row_number() over (
      partition by user_id, lesson_id, item_id
      order by resolved_at is null desc, updated_at desc, created_at desc, source_id
    ) as position
  from eligible
)
select r.user_id, r.source_id, r.item_id,
  exists (
    select 1 from public.review_events e
    where e.user_id = r.user_id and e.item_type = 'mistake' and e.source_id = r.source_id
      and e.item_id = r.item_id
  ) as has_reviews
from ranked r
where r.position > 1;

delete from public.srs_cards c
  using mistake_merge m
  where not m.has_reviews and c.user_id = m.user_id and c.item_type = 'mistake'
    and c.source_id = m.source_id and c.item_id = m.item_id;

update public.srs_cards c set resolved_at = now(), revision = c.revision + 1, updated_at = now()
  from mistake_merge m
  where m.has_reviews and c.resolved_at is null and c.user_id = m.user_id
    and c.item_type = 'mistake' and c.source_id = m.source_id and c.item_id = m.item_id;

commit;
