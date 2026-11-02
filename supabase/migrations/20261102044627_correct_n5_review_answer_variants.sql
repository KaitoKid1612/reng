-- Owner-approved correction of fourteen equivalent answers in the 2026-11-01 N5 set.
-- Resolve generated IDs from the learner, class and assignment; empty installations are a no-op.
-- The migration runner executes this statement atomically. No permanent guard/RLS changes.
do $repair$
declare
  target public.submissions%rowtype;
  bank public.lessons%rowtype;
  class_lesson public.class_lessons%rowtype;
  approved jsonb := '[{"position":2,"id":"r123-20261028-03","accepted":"trên・dưới・sát cạnh","old":["trên; dưới; bên cạnh","trên、 dưới、 bên cạnh","trên  dưới  bên cạnh","trên dưới bên cạnh"],"variants":["trên・dưới・sát cạnh"]},{"position":3,"id":"r123-20261028-14","accepted":"Trên cái ghế có cái cặp sách","old":["Trên ghế có một cái túi."],"variants":["Trên cái ghế có cái cặp sách"]},{"position":24,"id":"r123-20261028-47","accepted":"わたしはおんがくがすきですからまいにちおんがくをききます.","old":["おんがくがすきですから、まいにちおんがくをききます。"],"variants":["わたしはおんがくがすきですからまいにちおんがくをききます.","わたしはおんがくがすきですから、まいにちおんがくをききます。"]},{"position":28,"id":"r123-20261028-43","accepted":"ほんやはどこですか","old":["ほんやはどこにありますか。"],"variants":["ほんやはどこですか"]},{"position":33,"id":"r123-20261028-48","accepted":"ともだちとバスでがっこうへいきます。","old":["と・で","と、で","と で","とで"],"variants":["ともだちとバスでがっこうへいきます。"]},{"position":39,"id":"r123-20261027-43","accepted":"わたしはにほんごがわかりますがちゅうごくごがわかりません","old":["にほんごがわかりますが、ちゅうごくごがわかりません。","日本語はわかりますが、中国語はわかりません。"],"variants":["わたしはにほんごがわかりますがちゅうごくごがわかりません","わたしはにほんごがわかりますが、ちゅうごくごがわかりません。"]},{"position":42,"id":"r123-20261027-48","accepted":"しちじにレストランでおちゃをのみます。","old":["7じにレストランでおちゃをのみます。","七時にレストランでお茶を飲みます。"],"variants":["しちじにレストランでおちゃをのみます。"]},{"position":43,"id":"r123-20261027-49","accepted":"きのうあねからほんをもらいました。","old":["きのうあねにほんをもらいました。","きのうあねがわたしにほんをくれました。"],"variants":["きのうあねからほんをもらいました。"]},{"position":47,"id":"r123-20261028-29","accepted":" としょかんにせんせいがいます。","old":["に・が","に、が","に が","にが"],"variants":["としょかんにせんせいがいます。"]},{"position":48,"id":"r123-20261028-28","accepted":"へやにテレビがあります。","old":["に・が","に、が","に が","にが"],"variants":["へやにテレビがあります。"]},{"position":50,"id":"r123-20261027-58","accepted":"きはうちとがっこうのあいだにあります。きのうえにとりがいます。","old":["うちとがっこうのあいだにきがあります。きのうえにとりがいます。","家と学校の間に木があります。木の上に鳥がいます。"],"variants":["きはうちとがっこうのあいだにあります。きのうえにとりがいます。"]},{"position":56,"id":"r123-20261027-57","accepted":"ねこはどこですか. れいぞうこのとなりにいます","old":["ねこはどこにいますか。れいぞうこのとなりにいます。","猫はどこにいますか。冷蔵庫の隣にいます。"],"variants":["ねこはどこですか. れいぞうこのとなりにいます","ねこはどこですか。れいぞうこのとなりにいます。"]},{"position":57,"id":"r123-20261027-56","accepted":"へやはしずかですからこのへやがすきです.へやのなかにベッドがあります。","old":["このへやはしずかですから、すきです。へやにベッドがあります。","この部屋が好きです。静かですから。部屋にベッドがあります。"],"variants":["へやはしずかですからこのへやがすきです.へやのなかにベッドがあります。","へやはしずかですから、このへやがすきです。へやのなかにベッドがあります。"]},{"position":58,"id":"r123-20261029-60","accepted":"ぎんこうはどこですか。ゆうびんきょくのとなりにあります。","old":["ぎんこうはどこにありますか。ゆうびんきょくのとなりにあります。"],"variants":["ぎんこうはどこですか。ゆうびんきょくのとなりにあります。"]}]'::jsonb;
  corrected_content jsonb;
  new_version uuid;
  teacher_id uuid;
  changed integer;
begin
  select s.* into target
  from public.submissions s
  join public.profiles p on p.id = s.user_id
  join public.assignments a on a.id = s.assignment_id
  join public.classes c on c.id = a.class_id
  where p.full_name = 'Nguyễn Văn Vĩnh Nguyên'
    and c.name = 'Tiếng Nhật Minna – Lớp 1'
    and a.title = 'Luyện tập hằng ngày 01/11'
    and (a.published_at at time zone 'Asia/Ho_Chi_Minh')::date = date '2026-11-01'
    and s.attempt_no = 1;
  if not found then
    return;
  end if;
  if (select count(*) from public.submissions s
      join public.profiles p on p.id = s.user_id
      join public.assignments a on a.id = s.assignment_id
      join public.classes c on c.id = a.class_id
      where p.full_name = 'Nguyễn Văn Vĩnh Nguyên'
        and c.name = 'Tiếng Nhật Minna – Lớp 1'
        and a.title = 'Luyện tập hằng ngày 01/11'
        and (a.published_at at time zone 'Asia/Ho_Chi_Minh')::date = date '2026-11-01'
        and s.attempt_no = 1) <> 1 then
    raise exception 'N5 correction requires exactly one target attempt';
  end if;
  if exists (select 1 from public.audit_events
      where action = 'submission.regraded_23_to_37.approved_variants'
        and resource_id = target.id::text) then
    return;
  end if;

  -- Block writers before temporarily opening the three immutable history guards.
  lock table public.answers, public.assignment_items, public.submissions in access exclusive mode;
  select * into strict target from public.submissions where id = target.id for update;
  if target.status <> 'submitted' or target.score <> 23 or target.max_score <> 60 then
    raise exception 'N5 correction refused: attempt changed since review';
  end if;
  select c.teacher_id into strict teacher_id from public.classes c
    join public.assignments a on a.class_id = c.id where a.id = target.assignment_id;
  select * into strict bank from public.lessons
    where id = 'n5-sheet-review-bank' and owner_id = teacher_id for update;
  select cl.* into strict class_lesson from public.class_lessons cl
    join public.assignments a on a.class_id = cl.class_id
    where a.id = target.assignment_id and cl.lesson_id = bank.id for update of cl;
  if bank.draft_revision <> 1
     or bank.published_version_id <> class_lesson.lesson_version_id
     or bank.draft_content is distinct from
       (select content from public.lesson_versions where id = bank.published_version_id)
     or jsonb_array_length(bank.draft_content -> 'questions') <> 200 then
    raise exception 'N5 correction refused: source bank changed since review';
  end if;
  if (select count(*) from public.assignment_items where assignment_id = target.assignment_id) <> 60
     or (select count(*) from public.answers where submission_id = target.id) <> 60
     or jsonb_array_length(approved) <> 14 then
    raise exception 'N5 correction refused: unexpected item count';
  end if;
  if (select count(*) from jsonb_to_recordset(approved)
      as f(position integer, id text, accepted text, old jsonb, variants jsonb)
      join public.assignment_items i on i.assignment_id = target.assignment_id
        and i.question_id = f.id and i.position = f.position
      join public.answers a on a.submission_id = target.id and a.question_id = f.id
      where a.raw = to_jsonb(f.accepted) and not a.is_correct and a.points_earned = 0
        and i.question_snapshot -> 'answer' = f.old
        and i.question_snapshot ->> 'type' = 'fill'
        and (i.question_snapshot ->> 'points')::integer = 1) <> 14 then
    raise exception 'N5 correction refused: reviewed answers or keys changed';
  end if;
  if (select count(*) from jsonb_to_recordset(approved) as f(id text, old jsonb)
      join lateral jsonb_array_elements(bank.draft_content -> 'questions') q
        on q ->> 'id' = f.id
      where q -> 'answer' = f.old) <> 14 then
    raise exception 'N5 correction refused: source keys changed';
  end if;
  if exists (select 1 from public.review_events e
      where e.user_id = target.user_id and e.source_id = target.assignment_id::text
        and e.item_id in (select f.id from jsonb_to_recordset(approved) as f(id text))) then
    raise exception 'N5 correction refused: mistake cards have subsequent reviews';
  end if;
  if (select count(*) from pg_trigger where not tgisinternal and tgenabled = 'O'
      and ((tgrelid = 'public.answers'::regclass and tgname = 'answers_immutable')
        or (tgrelid = 'public.assignment_items'::regclass and tgname = 'assignment_items_guard')
        or (tgrelid = 'public.submissions'::regclass and tgname = 'submission_guard'))) <> 3 then
    raise exception 'N5 correction refused: history guards are not enabled';
  end if;

  alter table public.answers disable trigger answers_immutable;
  alter table public.assignment_items disable trigger assignment_items_guard;
  alter table public.submissions disable trigger submission_guard;

  update public.assignment_items i
  set question_snapshot = jsonb_set(i.question_snapshot, '{answer}',
    (select jsonb_agg(value order by first_position) from
      (select value, min(ordinality) as first_position
       from jsonb_array_elements(i.question_snapshot -> 'answer' || f.variants)
         with ordinality group by value) accepted))
  from jsonb_to_recordset(approved) as f(id text, variants jsonb)
  where i.assignment_id = target.assignment_id and i.question_id = f.id;
  get diagnostics changed = row_count;
  if changed <> 14 then raise exception 'N5 correction item count mismatch'; end if;

  update public.answers a set is_correct = true, points_earned = 1
    where a.submission_id = target.id
      and a.question_id in (select f.id from jsonb_to_recordset(approved) as f(id text));
  get diagnostics changed = row_count;
  if changed <> 14 then raise exception 'N5 correction answer count mismatch'; end if;

  update public.submissions s
  set score = (select sum(a.points_earned) from public.answers a where a.submission_id = s.id),
      passed = (select sum(a.points_earned) * 100 >= ass.pass_score * s.max_score
        from public.answers a cross join public.assignments ass
        where a.submission_id = s.id and ass.id = s.assignment_id group by ass.pass_score)
  where s.id = target.id;
  if (select score from public.submissions where id = target.id) <> 37 then
    raise exception 'N5 correction total is not 37';
  end if;

  alter table public.submissions enable trigger submission_guard;
  alter table public.assignment_items enable trigger assignment_items_guard;
  alter table public.answers enable trigger answers_immutable;

  -- Resolve only false mistakes from this exact attempt; never fabricate review events.
  update public.srs_cards set resolved_at = now(), revision = revision + 1, updated_at = now()
    where user_id = target.user_id and item_type = 'mistake'
      and source_id = target.assignment_id::text and resolved_at is null
      and item_id in (select f.id from jsonb_to_recordset(approved) as f(id text));

  -- New bank version for future daily sets; published versions and other assignments stay intact.
  select jsonb_set(bank.draft_content, '{questions}', jsonb_agg(
    case when f.id is null then q.value else jsonb_set(q.value, '{answer}',
      (select jsonb_agg(value order by first_position) from
        (select value, min(ordinality) as first_position
         from jsonb_array_elements(q.value -> 'answer' || f.variants)
           with ordinality group by value) accepted)) end order by q.ordinality))
    into corrected_content
  from jsonb_array_elements(bank.draft_content -> 'questions') with ordinality q(value, ordinality)
    left join jsonb_to_recordset(approved) as f(id text, variants jsonb) on f.id = q.value ->> 'id';

  new_version := public.publish_lesson(bank.id, bank.owner_id, bank.draft_revision,
    bank.title, bank.title_ja, bank.summary, bank.order_no, bank.course_id, corrected_content,
    (select is_sample from public.lesson_versions where id = bank.published_version_id));
  perform public.upsert_class_lesson(teacher_id, class_lesson.class_id, bank.id, new_version,
    class_lesson.order_no, class_lesson.available_at);

  insert into public.audit_events(actor_id, action, resource_id)
    values (teacher_id, 'submission.regraded_23_to_37.approved_variants', target.id::text),
      (teacher_id, 'lesson.answer_variants_corrected', new_version::text);
  insert into public.audit_events(actor_id, action, resource_id)
    select teacher_id, 'answer.reviewed_correct', target.id::text || ':' || f.id
      from jsonb_to_recordset(approved) as f(id text);
end;
$repair$;
