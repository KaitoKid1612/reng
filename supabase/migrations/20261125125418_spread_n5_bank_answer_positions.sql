-- In the N5 review bank behind the daily sets (n5-sheet-review-bank), 27 of 44 choice questions
-- had the right answer first, so always picking the first option scored well. A new version of
-- the bank swaps each single-answer question's right option with the one at a position taken from
-- its id (md5, so lib and tests compute the same place); options keep their wording and every
-- other option keeps its place. Questions with a picture (options may be labelled in it) and
-- questions whose options are all numbers (kept in order, as JLPT does) stay as they are.
-- The class moves to the new version for later daily sets; assignments already made keep their
-- own snapshots, so no submission, answer or review card changes. Refused when the bank has
-- unpublished edits, since publishing would also publish them. Running it again changes nothing.
do $spread$
declare
  bank public.lessons%rowtype;
  published public.lesson_versions%rowtype;
  spread_content jsonb;
  new_version uuid;
  pinned record;
begin
  select * into bank from public.lessons where id = 'n5-sheet-review-bank' for update;
  if not found or bank.published_version_id is null then
    return;
  end if;
  select * into strict published from public.lesson_versions where id = bank.published_version_id;
  if bank.draft_content is distinct from published.content then
    raise exception 'reng: n5-sheet-review-bank has unpublished edits; publish or discard them first';
  end if;
  -- Schema 2 lessons need the teacher to review each changed question before publishing.
  if published.content ->> 'schemaVersion' is distinct from '1' then
    raise exception 'reng: n5-sheet-review-bank is not schema 1; spread its answers in the editor';
  end if;

  select jsonb_set(published.content, '{questions}', jsonb_agg(
    case when movable then jsonb_set(jsonb_set(q, '{options}', (
        select jsonb_agg(case when i - 1 = right_at then q -> 'options' -> target
          when i - 1 = target then q -> 'options' -> right_at else o end order by i)
        from jsonb_array_elements(q -> 'options') with ordinality x(o, i))),
      '{answer}', jsonb_build_array(target))
    else q end order by ord))
    into spread_content
  from (
    select q, ord, movable,
      case when movable then (q -> 'answer' ->> 0)::integer end as right_at,
      case when movable then mod(('x' || substr(md5(q ->> 'id'), 1, 7))::bit(28)::integer,
        jsonb_array_length(q -> 'options')) end as target
    from (
      select q, ord,
        ((q ->> 'type' = 'choice' and coalesce((q ->> 'multiple')::boolean, false) = false)
            or (q ->> 'type' = 'listen' and q ->> 'responseType' = 'choice'))
          and jsonb_typeof(q -> 'options') = 'array' and jsonb_array_length(q -> 'options') >= 2
          and jsonb_typeof(q -> 'answer') = 'array' and jsonb_array_length(q -> 'answer') = 1
          and jsonb_typeof(q -> 'answer' -> 0) = 'number'
          and (q -> 'answer' ->> 0)::integer < jsonb_array_length(q -> 'options')
          and not (q ? 'image')
          and exists (select 1 from jsonb_array_elements_text(q -> 'options') o
            where o !~ '^\s*[0-9０-９]') as movable
      from jsonb_array_elements(published.content -> 'questions') with ordinality x(q, ord)
    ) eligible
  ) planned;

  if spread_content is not distinct from published.content then
    return;
  end if;

  new_version := public.publish_lesson(bank.id, bank.owner_id, bank.draft_revision, bank.title,
    bank.title_ja, bank.summary, bank.order_no, bank.course_id, spread_content,
    published.is_sample);
  for pinned in
    select cl.class_id, cl.order_no, cl.available_at, c.teacher_id
    from public.class_lessons cl join public.classes c on c.id = cl.class_id
    where cl.lesson_id = bank.id and cl.lesson_version_id = published.id
  loop
    perform public.upsert_class_lesson(pinned.teacher_id, pinned.class_id, bank.id, new_version,
      pinned.order_no, pinned.available_at);
  end loop;
  insert into public.audit_events(actor_id, action, resource_id)
    values (bank.owner_id, 'lesson.answer_positions_spread', new_version::text);
end;
$spread$;
