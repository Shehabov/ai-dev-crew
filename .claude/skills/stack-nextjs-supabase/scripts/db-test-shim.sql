-- db-test-shim.sql
--
-- The pgTAP-compatible shim that db-test.mjs, in the same folder, installs after the
-- migrations and the seed and before it runs supabase/tests/*.test.sql offline in PGlite.
--
-- pgTAP is a compiled extension and PGlite does not ship it, so the offline runner cannot
-- load it. This file implements the part of pgTAP's interface that test files most often use,
-- with pgTAP's signatures and pgTAP's TAP output, so one test file runs unchanged offline and
-- on the project. It is not pgTAP. A green run under it is evidence labelled PGlite, and it
-- never stands in for the run on the project through execute_sql, where a migration installs
-- the real extension.
--
-- Never applied to a Supabase project. Never copied into supabase/. It is not a migration.
--
-- Implemented:
--   plan, no_plan, finish
--   ok, is, isnt, pass, fail, diag
--   is_empty, isnt_empty
--   throws_ok (every text and integer errcode form), lives_ok
--   results_eq, set_eq, bag_eq (query against query, or query against array)
--
-- Anything else fails with 42883, undefined function, and db-test names the missing function
-- in its output, so a test that needs more of pgTAP fails loudly offline instead of passing
-- quietly. Extend this file, or prove that test on the project only and say so in the
-- handoff.
--
-- Where it differs from pgTAP, knowingly:
--   results_eq, set_eq and bag_eq compare rows by their text form, so they do not report a
--   column type mismatch that pgTAP would. The run on the project does.
--   is_empty, isnt_empty and the row comparisons take one query per call. A string holding
--   two statements fails here, as it does under pgTAP.
--
-- Everything lives in schema tap, so a test that asks what the migrations left in public or
-- in extensions gets an answer about the migrations and not about the shim. db-test puts tap
-- last on the search_path, and the test files call the functions unqualified, as they do on
-- the project.

create schema tap;

comment on schema tap is
  'db-test pgTAP shim. PGlite only, never on a Supabase project. See scripts/db-test-shim.sql in the stack-nextjs-supabase pack.';

-- The plan lives in a one-row table. The test counter and the failure counter are
-- sequences, and that is load bearing: a test file that wraps mutating tests in
-- `rollback to savepoint` would roll a counter held in a table back with them, the numbering
-- would repeat, and finish() would report fewer tests than ran. nextval is exempt from
-- rollback. Real pgTAP numbers its tests from a sequence for the same reason.

create table tap.state (
  id       integer primary key default 1,
  planned  integer,
  no_plan  boolean not null default false,
  constraint tap_state_single_row check (id = 1)
);

insert into tap.state (id) values (1);

create sequence tap.test_seq as integer;
create sequence tap.fail_seq as integer;

-- Called by db-test before each test file, outside any transaction, so every file numbers
-- its tests from 1 and a plan from one file never leaks into the next.
create function tap.reset_run()
returns void
language plpgsql
as $$
begin
  alter sequence tap.test_seq restart;
  alter sequence tap.fail_seq restart;
  update tap.state set planned = null, no_plan = false where id = 1;
end;
$$;

-- pgTAP's convention for naming what to run: a string with no whitespace, or one that
-- starts with a double quote, is the name of a prepared statement.
create function tap._query(p_sql text)
returns text
language sql
immutable
as $$
  select case
           when p_sql like '"%' or p_sql !~ '[[:space:]]' then 'EXECUTE ' || p_sql
           else p_sql
         end;
$$;

create function tap.diag(p_msg text)
returns text
language sql
immutable
as $$
  select '# ' || replace(replace(coalesce(p_msg, 'NULL'), E'\r\n', E'\n'), E'\n', E'\n# ');
$$;

-- Every assertion ends here. Returns one TAP test point, followed on failure by pgTAP's
-- "Failed test" line and the diagnostic.
create function tap.record(p_pass boolean, p_descr text, p_diag text default null)
returns text
language plpgsql
as $$
declare
  n     integer := pg_catalog.nextval('tap.test_seq')::integer;
  named boolean := coalesce(p_descr, '') <> '';
  line  text;
begin
  line := case when p_pass then 'ok ' else 'not ok ' end || n
       || case when named then ' - ' || p_descr else '' end;
  if not p_pass then
    perform pg_catalog.nextval('tap.fail_seq');
    line := line || E'\n#   Failed test ' || n
         || case when named then ': "' || p_descr || '"' else '' end;
    if p_diag is not null then
      line := line || E'\n' || tap.diag(p_diag);
    end if;
  end if;
  return line;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Plan and finish
-- ---------------------------------------------------------------------------------------

create function tap.plan(p_count integer)
returns text
language plpgsql
as $$
begin
  update tap.state set planned = p_count, no_plan = false where id = 1;
  return '1..' || p_count;
end;
$$;

create function tap.no_plan()
returns setof boolean
language plpgsql
as $$
begin
  update tap.state set planned = null, no_plan = true where id = 1;
  return;
end;
$$;

create function tap.finish(p_exception_on_failure boolean default false)
returns setof text
language plpgsql
as $$
declare
  v_planned integer;
  v_no_plan boolean;
  v_ran     integer;
  v_failed  integer;
begin
  select planned, no_plan into v_planned, v_no_plan from tap.state where id = 1;
  v_ran    := coalesce(pg_catalog.pg_sequence_last_value('tap.test_seq'::regclass), 0)::integer;
  v_failed := coalesce(pg_catalog.pg_sequence_last_value('tap.fail_seq'::regclass), 0)::integer;

  if v_no_plan then
    return next '1..' || v_ran;
  elsif v_planned is null then
    return next '# No plan found in TAP output';
  elsif v_ran <> v_planned then
    return next '# Looks like you planned ' || v_planned || ' test'
             || case when v_planned = 1 then '' else 's' end || ' but ran ' || v_ran;
  end if;

  if v_failed > 0 then
    return next '# Looks like you failed ' || v_failed || ' test'
             || case when v_failed = 1 then '' else 's' end || ' of ' || v_ran;
    if p_exception_on_failure then
      raise exception '% of % tests failed', v_failed, v_ran;
    end if;
  end if;
  return;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- ok, is, isnt, pass, fail
-- ---------------------------------------------------------------------------------------

create function tap.ok(p_have boolean, p_descr text)
returns text
language sql
as $$
  select tap.record(coalesce(p_have, false), p_descr,
    case when p_have is null then '    (test result was NULL)' end);
$$;

create function tap.ok(p_have boolean)
returns text
language sql
as $$ select tap.ok(p_have, null::text); $$;

-- anyelement, as in pgTAP, so both sides must be the same type. is(count(*), 3) fails here
-- exactly as it fails on the project, which is the point: a shim more lenient than pgTAP
-- would pass a test offline that errors for real.
create function tap.is(p_have anyelement, p_want anyelement, p_descr text)
returns text
language plpgsql
as $$
declare
  v_pass boolean := p_have is not distinct from p_want;
begin
  return tap.record(v_pass, p_descr, case when v_pass then null else
    '        have: ' || coalesce(p_have::text, 'NULL') || E'\n' ||
    '        want: ' || coalesce(p_want::text, 'NULL') end);
end;
$$;

create function tap.is(p_have anyelement, p_want anyelement)
returns text
language sql
as $$ select tap.is(p_have, p_want, null::text); $$;

create function tap.isnt(p_have anyelement, p_want anyelement, p_descr text)
returns text
language plpgsql
as $$
declare
  v_pass boolean := p_have is distinct from p_want;
begin
  return tap.record(v_pass, p_descr, case when v_pass then null else
    '        have: ' || coalesce(p_have::text, 'NULL') || E'\n' ||
    '        want: anything else' end);
end;
$$;

create function tap.isnt(p_have anyelement, p_want anyelement)
returns text
language sql
as $$ select tap.isnt(p_have, p_want, null::text); $$;

create function tap.pass(p_descr text)
returns text
language sql
as $$ select tap.record(true, p_descr); $$;

create function tap.pass()
returns text
language sql
as $$ select tap.record(true, null::text); $$;

create function tap.fail(p_descr text)
returns text
language sql
as $$ select tap.record(false, p_descr); $$;

create function tap.fail()
returns text
language sql
as $$ select tap.record(false, null::text); $$;

-- ---------------------------------------------------------------------------------------
-- is_empty, isnt_empty
-- ---------------------------------------------------------------------------------------
--
-- A query that raises is not caught: the error aborts the test file, as it does under
-- pgTAP, and db-test reports the file and the line.

create function tap.is_empty(p_sql text, p_descr text)
returns text
language plpgsql
as $$
declare
  rec    record;
  v_rows text[] := '{}';
begin
  for rec in execute tap._query(p_sql) loop
    v_rows := pg_catalog.array_append(v_rows, rec::text);
  end loop;
  return tap.record(cardinality(v_rows) = 0, p_descr,
    case when cardinality(v_rows) = 0 then null else
      E'    Unexpected records:\n        ' || array_to_string(v_rows, E'\n        ') end);
end;
$$;

create function tap.is_empty(p_sql text)
returns text
language sql
as $$ select tap.is_empty(p_sql, null::text); $$;

create function tap.isnt_empty(p_sql text, p_descr text)
returns text
language plpgsql
as $$
declare
  rec record;
begin
  for rec in execute tap._query(p_sql) loop
    return tap.record(true, p_descr);
  end loop;
  return tap.record(false, p_descr, '    The query returned no rows');
end;
$$;

create function tap.isnt_empty(p_sql text)
returns text
language sql
as $$ select tap.isnt_empty(p_sql, null::text); $$;

-- ---------------------------------------------------------------------------------------
-- throws_ok, lives_ok
-- ---------------------------------------------------------------------------------------
--
-- The statement runs inside the exception block's subtransaction, so a `set local role` in
-- it, and anything it wrote, is rolled back when it raises. If it does not raise, both stay,
-- as under pgTAP, and the test file resets the role itself.

create function tap.throws_ok(p_sql text, p_errcode text, p_errmsg text, p_descr text)
returns text
language plpgsql
as $$
declare
  v_descr text := coalesce(p_descr, 'threw ' ||
    coalesce(p_errcode || ': ' || p_errmsg, p_errcode, p_errmsg, 'an exception'));
begin
  execute tap._query(p_sql);
  return tap.record(false, v_descr,
    E'      caught: no exception\n      wanted: ' || coalesce(p_errcode, p_errmsg, 'an exception'));
exception when others then
  if (p_errcode is null or sqlstate = p_errcode)
     and (p_errmsg is null or sqlerrm = p_errmsg) then
    return tap.record(true, v_descr);
  end if;
  return tap.record(false, v_descr,
    '      caught: ' || sqlstate || ': ' || sqlerrm || E'\n' ||
    '      wanted: ' || coalesce(p_errcode, '') ||
    case when p_errmsg is not null then ': ' || p_errmsg else '' end);
end;
$$;

-- pgTAP's rule for the short forms: a five-character second argument is an SQLSTATE,
-- anything else is the expected message.
create function tap.throws_ok(p_sql text, p_code_or_msg text, p_msg_or_descr text)
returns text
language sql
as $$
  select case
           when octet_length(p_code_or_msg) = 5
             then tap.throws_ok(p_sql, p_code_or_msg, p_msg_or_descr, null::text)
           else tap.throws_ok(p_sql, null::text, p_code_or_msg, p_msg_or_descr)
         end;
$$;

create function tap.throws_ok(p_sql text, p_code_or_msg text)
returns text
language sql
as $$
  select case
           when octet_length(p_code_or_msg) = 5
             then tap.throws_ok(p_sql, p_code_or_msg, null::text, null::text)
           else tap.throws_ok(p_sql, null::text, p_code_or_msg, null::text)
         end;
$$;

create function tap.throws_ok(p_sql text)
returns text
language sql
as $$ select tap.throws_ok(p_sql, null::text, null::text, null::text); $$;

create function tap.throws_ok(p_sql text, p_errcode integer, p_errmsg text, p_descr text)
returns text
language sql
as $$ select tap.throws_ok(p_sql, p_errcode::text, p_errmsg, p_descr); $$;

create function tap.throws_ok(p_sql text, p_errcode integer, p_errmsg text)
returns text
language sql
as $$ select tap.throws_ok(p_sql, p_errcode::text, p_errmsg, null::text); $$;

create function tap.throws_ok(p_sql text, p_errcode integer)
returns text
language sql
as $$ select tap.throws_ok(p_sql, p_errcode::text, null::text, null::text); $$;

create function tap.lives_ok(p_sql text, p_descr text)
returns text
language plpgsql
as $$
begin
  execute tap._query(p_sql);
  return tap.record(true, p_descr);
exception when others then
  return tap.record(false, p_descr, '        died: ' || sqlstate || ': ' || sqlerrm);
end;
$$;

create function tap.lives_ok(p_sql text)
returns text
language sql
as $$ select tap.lives_ok(p_sql, null::text); $$;

-- ---------------------------------------------------------------------------------------
-- results_eq, set_eq, bag_eq
-- ---------------------------------------------------------------------------------------

-- The rows a query returns, each as its record text: (1,foo).
create function tap._rows(p_sql text)
returns text[]
language plpgsql
as $$
declare
  rec    record;
  v_rows text[] := '{}';
begin
  for rec in execute tap._query(p_sql) loop
    v_rows := pg_catalog.array_append(v_rows, rec::text);
  end loop;
  return v_rows;
end;
$$;

-- The same shape for an expected array, so array[1, 2] compares against a one-column query.
create function tap._array_rows(p_want anyarray)
returns text[]
language plpgsql
as $$
declare
  rec    record;
  v_rows text[] := '{}';
begin
  for rec in select * from pg_catalog.unnest(p_want) loop
    v_rows := pg_catalog.array_append(v_rows, rec::text);
  end loop;
  return v_rows;
end;
$$;

-- p_mode: 'results' compares in order, 'set' ignores order and duplicates, 'bag' ignores
-- order and keeps duplicates.
create function tap._compare(p_have text[], p_want text[], p_mode text, p_descr text)
returns text
language plpgsql
as $$
declare
  v_extra   text[];
  v_missing text[];
begin
  if p_mode = 'results' then
    for i in 1 .. greatest(cardinality(p_have), cardinality(p_want)) loop
      if p_have[i] is distinct from p_want[i] then
        return tap.record(false, p_descr,
          '    Results differ beginning at row ' || i || E':\n' ||
          '        have: ' || coalesce(p_have[i], 'NULL') || E'\n' ||
          '        want: ' || coalesce(p_want[i], 'NULL'));
      end if;
    end loop;
    return tap.record(true, p_descr);
  end if;

  if p_mode = 'set' then
    select array_agg(v order by v) into v_extra
      from (select unnest(p_have) as v except select unnest(p_want)) s;
    select array_agg(v order by v) into v_missing
      from (select unnest(p_want) as v except select unnest(p_have)) s;
  else
    select array_agg(v order by v) into v_extra
      from (select unnest(p_have) as v except all select unnest(p_want)) s;
    select array_agg(v order by v) into v_missing
      from (select unnest(p_want) as v except all select unnest(p_have)) s;
  end if;

  if v_extra is null and v_missing is null then
    return tap.record(true, p_descr);
  end if;
  return tap.record(false, p_descr, concat_ws(E'\n',
    case when v_extra is not null
      then E'    Extra records:\n        ' || array_to_string(v_extra, E'\n        ') end,
    case when v_missing is not null
      then E'    Missing records:\n        ' || array_to_string(v_missing, E'\n        ') end));
end;
$$;

create function tap.results_eq(p_have text, p_want text, p_descr text)
returns text
language sql
as $$ select tap._compare(tap._rows(p_have), tap._rows(p_want), 'results', p_descr); $$;

create function tap.results_eq(p_have text, p_want text)
returns text
language sql
as $$ select tap.results_eq(p_have, p_want, null::text); $$;

create function tap.results_eq(p_have text, p_want anyarray, p_descr text)
returns text
language sql
as $$ select tap._compare(tap._rows(p_have), tap._array_rows(p_want), 'results', p_descr); $$;

create function tap.results_eq(p_have text, p_want anyarray)
returns text
language sql
as $$ select tap.results_eq(p_have, p_want, null::text); $$;

create function tap.set_eq(p_have text, p_want text, p_descr text)
returns text
language sql
as $$ select tap._compare(tap._rows(p_have), tap._rows(p_want), 'set', p_descr); $$;

create function tap.set_eq(p_have text, p_want text)
returns text
language sql
as $$ select tap.set_eq(p_have, p_want, null::text); $$;

create function tap.set_eq(p_have text, p_want anyarray, p_descr text)
returns text
language sql
as $$ select tap._compare(tap._rows(p_have), tap._array_rows(p_want), 'set', p_descr); $$;

create function tap.set_eq(p_have text, p_want anyarray)
returns text
language sql
as $$ select tap.set_eq(p_have, p_want, null::text); $$;

create function tap.bag_eq(p_have text, p_want text, p_descr text)
returns text
language sql
as $$ select tap._compare(tap._rows(p_have), tap._rows(p_want), 'bag', p_descr); $$;

create function tap.bag_eq(p_have text, p_want text)
returns text
language sql
as $$ select tap.bag_eq(p_have, p_want, null::text); $$;

create function tap.bag_eq(p_have text, p_want anyarray, p_descr text)
returns text
language sql
as $$ select tap._compare(tap._rows(p_have), tap._array_rows(p_want), 'bag', p_descr); $$;

create function tap.bag_eq(p_have text, p_want anyarray)
returns text
language sql
as $$ select tap.bag_eq(p_have, p_want, null::text); $$;

-- ---------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------
--
-- Test files switch to anon or authenticated and call the assertions as that role, so every
-- role needs to reach the shim. PUBLIC covers anon, authenticated and service_role. The
-- grants are explicit because a migration may have revoked the default execute privilege.

grant usage on schema tap to public;
grant execute on all functions in schema tap to public;
grant usage, select, update on all sequences in schema tap to public;
grant select, update on tap.state to public;
