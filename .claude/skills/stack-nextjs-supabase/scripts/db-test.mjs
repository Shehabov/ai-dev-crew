#!/usr/bin/env node
/**
 * The offline database proof for the stack-nextjs-supabase pack.
 *
 * Builds the project's database from nothing in a throwaway Postgres and runs its pgTAP
 * files, with nothing on the machine but node and npm. It is how backend-engineer iterates
 * before touching the Supabase project, and its output is evidence, labelled PGlite.
 *
 * Run it from the project root. The root is the current working directory: the supabase
 * folder defaults to ./supabase, paths in the output are shown relative to it, and PGlite is
 * loaded from its node_modules. Install PGlite there once with
 * `npm i -D @electric-sql/pglite`.
 *
 * What it does, in order:
 *   1. Starts PGlite in memory: real Postgres compiled to WebAssembly. No Docker, no server,
 *      no Supabase CLI, and nothing written to disk.
 *   2. Applies a Supabase-shaped bootstrap: the anon, authenticated and service_role roles,
 *      Supabase's default grants on public, the extensions schema with pgcrypto and
 *      uuid-ossp in it, and an auth schema with auth.users, auth.uid(), auth.jwt(),
 *      auth.role() and auth.email() reading request.jwt.claims.
 *   3. Applies supabase/migrations/*.sql in file-name order, one statement at a time, so a
 *      failure names the file and the line. A migration's `create extension pgtap` is
 *      skipped and reported, because the shim stands in for pgTAP offline.
 *   4. Applies supabase/seed.sql, if there is one.
 *   5. Installs the pgTAP shim, db-test-shim.sql beside this file, and runs every
 *      supabase/tests/*.test.sql, each inside a transaction that is rolled back, printing TAP.
 *      The TAP is every text value any statement returns, in order, so a test file in the
 *      pack's collector form (each line gathered into a temporary table and returned by the
 *      last select) reads the same here as a plain one.
 *
 * What it proves: the migrations apply in order to an empty database, the seed loads, and
 * every assertion in the test files holds on real Postgres, including RLS, grants, roles,
 * security definer functions, triggers and the catalogue.
 *
 * What it cannot prove, so it never replaces pgTAP on the project through the Supabase MCP:
 *   - No PostgREST. Nothing here is an HTTP call, so no status code, header or error
 *     mapping is proved.
 *   - No real pgTAP. The assertions run under a shim that implements part of pgTAP's
 *     interface (listed in db-test-shim.sql). A function it lacks fails loudly.
 *   - No Supabase platform. The bootstrap is a likeness of the roles and the auth schema, not
 *     Supabase's own: no Auth service, Storage, Realtime or Edge Functions, no platform
 *     extensions such as pg_net, pg_cron or pg_graphql, no advisors, and the migrations run
 *     as a superuser, which the project's postgres role is not.
 *   - Not the project's Postgres version. PGlite may be newer than the project.
 *
 * Invariants this file upholds:
 *   - It never writes to the project. The database lives in memory and dies with the
 *     process.
 *   - It applies no SQL from outside the supabase folder except the bootstrap and the shim,
 *     which stand in for what the platform provides and are never applied to a project.
 *   - The first line of every run says it ran on PGlite, so the output cannot be passed off
 *     as the project.
 *   - Exit code: 0 when every test passes, 1 on any failure or SQL error, 2 when there are
 *     no migrations to prove.
 *
 * Usage:  node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs
 *           [--only <test file>] [--reverse <sql file>] [--supabase-dir <dir>] [--json]
 * Env:    DEVTEAM_SUPABASE_DIR   the supabase folder to prove, instead of ./supabase
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.cwd()
const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SHIM_PATH = join(HERE, 'db-test-shim.sql')

const LABEL = 'offline proof on PGlite. Not the Supabase project, not real pgTAP.'
const BASE_PATH = '"$user", public, extensions'
const TEST_PATH = `${BASE_PATH}, tap`

const USAGE = `Usage: node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs [flags]

Run from the project root. Applies supabase/migrations/*.sql in file-name order and
supabase/seed.sql to an in-memory PGlite database shaped like a Supabase project, runs
supabase/tests/*.test.sql under a pgTAP-compatible shim, and prints TAP. Offline evidence,
labelled PGlite. It never replaces pgTAP on the project through the Supabase MCP.

  --only <file>          run one test file: a path, or a file name inside supabase/tests/
  --reverse <file>       after the tests, apply this reverse script to the migrated, seeded
                         database, then re-apply the newest migration
  --supabase-dir <dir>   prove this folder instead of ./supabase in the current directory
                         (or set DEVTEAM_SUPABASE_DIR; the flag wins)
  --json                 print one JSON object instead of TAP
  --help                 print this and exit

Needs @electric-sql/pglite in the project: npm i -D @electric-sql/pglite

Exit: 0 every test passed, 1 any failure or SQL error, 2 no migrations to prove.`

/** A migration statement that installs, alters or drops pgTAP. Skipped offline. */
const PGTAP_EXTENSION = /^(?:create|alter|drop)\s+extension\s+(?:if\s+(?:not\s+)?exists\s+)?"?pgtap"?(?=[\s;]|$)/i

/** Any extension a migration or the seed creates, so PGlite can load it before boot. */
const CREATE_EXTENSION = /create\s+extension\s+(?:if\s+not\s+exists\s+)?("?)([A-Za-z0-9_-]+)\1/gi

/** Supabase installs these in schema extensions on every project. */
const PREINSTALLED = ['pgcrypto', 'uuid-ossp']

/** pgTAP functions the shim does not implement, for a precise message when a test calls one. */
const PGTAP_ONLY = new Set([
  'has_table', 'hasnt_table', 'has_view', 'hasnt_view', 'has_column', 'hasnt_column',
  'col_type_is', 'col_not_null', 'col_is_null', 'col_has_default', 'col_default_is',
  'col_is_pk', 'col_isnt_pk', 'col_is_fk', 'col_is_unique', 'has_pk', 'hasnt_pk', 'has_fk',
  'fk_ok', 'has_index', 'index_is_unique', 'has_function', 'hasnt_function',
  'function_returns', 'is_definer', 'isnt_definer', 'function_lang_is', 'volatility_is',
  'has_trigger', 'trigger_is', 'has_schema', 'schemas_are', 'tables_are', 'views_are',
  'columns_are', 'functions_are', 'indexes_are', 'policies_are', 'policy_roles_are',
  'policy_cmd_is', 'has_role', 'roles_are', 'table_privs_are', 'function_privs_are',
  'schema_privs_are', 'column_privs_are', 'sequence_privs_are', 'has_extension',
  'extensions_are', 'has_type', 'has_enum', 'enum_has_labels', 'cmp_ok', 'matches',
  'imatches', 'doesnt_match', 'alike', 'unalike', 'isa_ok', 'throws_like', 'throws_matching',
  'throws_ilike', 'performs_ok', 'performs_within', 'results_ne', 'set_ne', 'set_has',
  'set_hasnt', 'bag_ne', 'bag_has', 'bag_hasnt', 'row_eq', 'is_strict', 'has_sequence',
  'skip', 'todo', 'todo_start', 'todo_end', 'runtests', 'is_member_of', 'is_superuser',
])

/* ------------------------------------------------------------------ arguments */

function parseArgs(argv) {
  const flags = { help: false, json: false, only: null, reverse: null, dir: null }
  const valued = { '--only': 'only', '--reverse': 'reverse', '--supabase-dir': 'dir' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const eq = arg.indexOf('=')
    const name = eq > 0 ? arg.slice(0, eq) : arg
    if (arg === '--help' || arg === '-h') flags.help = true
    else if (arg === '--json') flags.json = true
    else if (valued[name]) {
      const value = eq > 0 ? arg.slice(eq + 1) : argv[++i]
      if (!value || value.startsWith('--')) throw new Error(`${name} needs a value`)
      flags[valued[name]] = value
    } else throw new Error(`unknown argument: ${arg}`)
  }
  return flags
}

/* ------------------------------------------------------------------ files */

/** A path relative to the project root, with forward slashes, or absolute when outside it. */
function show(path) {
  const rel = relative(ROOT, path)
  const shown = rel === '' ? '.' : rel.startsWith('..') || isAbsolute(rel) ? path : rel
  return shown.split(sep).join('/')
}

/** "1 statement", "102 statements". */
function count(n, noun) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function isFile(path) {
  try { return statSync(path).isFile() } catch { return false }
}

/** Files in dir whose name passes the test, in file-name order. Missing dir: none. */
function listFiles(dir, test) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .map((name) => join(dir, name))
}

/** The file an argument names: as a path first, then by name inside dir. */
function findFile(arg, dir) {
  const candidates = [resolve(arg)]
  if (dir) candidates.push(join(dir, arg), join(dir, basename(arg)))
  return candidates.find(isFile) ?? null
}

/** A SQL file as text, without the byte order mark Postgres would reject. */
function readSql(path) {
  return readFileSync(path, 'utf8').replace(/^﻿/, '')
}

/* ------------------------------------------------------------------ loading PGlite */

/**
 * Returns an importer for PGlite and its contrib extensions, resolved from the project root
 * when the root can see PGlite, and from this file's own folder otherwise.
 *
 * A bare import() searches upward from the importing file only. The pack normally sits inside
 * the project, where that finds the project's node_modules, but a pack kept in a separate
 * checkout would never see the project's install. Resolving from the root covers both, and
 * every module comes from the same copy, so the extensions always match the engine.
 */
function pgliteImporter() {
  const fromRoot = createRequire(join(ROOT, 'package.json'))
  let rootHasPglite = true
  try {
    fromRoot.resolve('@electric-sql/pglite')
  } catch {
    rootHasPglite = false
  }
  return (specifier) => rootHasPglite
    ? import(pathToFileURL(fromRoot.resolve(specifier)).href)
    : import(specifier)
}

/* ------------------------------------------------------------------ SQL splitting */

/**
 * Splits SQL into top-level statements, each with the offset and 1-based line where its
 * first token starts, so an error can name the file and the line.
 *
 * A naive split on ';' cuts every dollar-quoted function body in half. This one honours line
 * comments, nested block comments, standard and E'' escape strings, double-quoted
 * identifiers, dollar quoting with any tag, and BEGIN ATOMIC bodies, whose inner semicolons
 * do not end the statement.
 */
function splitStatements(sql) {
  const statements = []
  const lineOf = lineIndex(sql)
  let start = 0
  let i = 0
  let atomicDepth = 0
  let previousWord = ''

  const push = (end) => {
    const from = skipTrivia(sql, start, end)
    const text = sql.slice(from, end).trimEnd()
    if (text) statements.push({ sql: text, offset: from, line: lineOf(from) })
  }

  while (i < sql.length) {
    const c = sql[i]
    const next = sql[i + 1]
    if (c === '-' && next === '-') { i = skipLineComment(sql, i); continue }
    if (c === '/' && next === '*') { i = skipBlockComment(sql, i); continue }
    if (c === "'") { i = skipQuoted(sql, i, "'", false); continue }
    if ((c === 'E' || c === 'e') && next === "'" && !isIdentChar(sql, i - 1)) {
      i = skipQuoted(sql, i + 1, "'", true)
      continue
    }
    if (c === '"') { i = skipQuoted(sql, i, '"', false); continue }
    if (c === '$' && !isIdentChar(sql, i - 1)) {
      const tag = /^\$(?:[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/.exec(sql.slice(i, i + 128))
      if (tag) {
        const close = sql.indexOf(tag[0], i + tag[0].length)
        i = close === -1 ? sql.length : close + tag[0].length
        continue
      }
    }
    if (/[A-Za-z_]/.test(c) && !isIdentChar(sql, i - 1)) {
      let j = i + 1
      while (j < sql.length && isIdentChar(sql, j)) j++
      const word = sql.slice(i, j).toLowerCase()
      if (atomicDepth > 0) {
        if (word === 'begin' || word === 'case') atomicDepth++
        else if (word === 'end') atomicDepth--
      } else if (word === 'atomic' && previousWord === 'begin') {
        atomicDepth = 1
      }
      previousWord = word
      i = j
      continue
    }
    if (c === ';' && atomicDepth === 0) {
      push(i)
      start = i + 1
      previousWord = ''
    }
    i++
  }
  push(sql.length)
  return statements
}

function isIdentChar(sql, i) {
  if (i < 0 || i >= sql.length) return false
  const code = sql.charCodeAt(i)
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) ||
    code === 95 || code === 36 || code >= 128
}

function skipLineComment(sql, i) {
  const newline = sql.indexOf('\n', i)
  return newline === -1 ? sql.length : newline + 1
}

function skipBlockComment(sql, i) {
  let depth = 1
  let j = i + 2
  while (j < sql.length && depth > 0) {
    if (sql[j] === '/' && sql[j + 1] === '*') { depth++; j += 2 }
    else if (sql[j] === '*' && sql[j + 1] === '/') { depth--; j += 2 }
    else j++
  }
  return j
}

function skipQuoted(sql, i, quote, backslashEscapes) {
  let j = i + 1
  while (j < sql.length) {
    if (backslashEscapes && sql[j] === '\\') { j += 2; continue }
    if (sql[j] === quote && sql[j + 1] === quote) { j += 2; continue }
    if (sql[j] === quote) return j + 1
    j++
  }
  return sql.length
}

/** Past whitespace and comments, so a statement's line is its first token's, not a comment's. */
function skipTrivia(sql, i, end) {
  while (i < end) {
    if (/\s/.test(sql[i])) i++
    else if (sql[i] === '-' && sql[i + 1] === '-') i = skipLineComment(sql, i)
    else if (sql[i] === '/' && sql[i + 1] === '*') i = skipBlockComment(sql, i)
    else break
  }
  return Math.min(i, end)
}

/** Maps a character offset to its 1-based line number. */
function lineIndex(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return (offset) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

/* ------------------------------------------------------------------ errors */

/** A database error, located in its file, with a hint where db-test knows the cause. */
function describeError(error, file, statement, text) {
  const position = Number(error.position)
  const line = position > 0 && text !== undefined
    ? lineIndex(text)(statement.offset + position - 1)
    : statement?.line ?? null
  return {
    file,
    line,
    code: error.code ?? null,
    message: error.message ?? String(error),
    detail: error.detail ?? null,
    hint: hintFor(error) ?? error.hint ?? null,
    where: error.where ?? null,
    statement: statement ? statement.sql.split('\n').slice(0, 6).join('\n') : null,
  }
}

function hintFor(error) {
  const message = error.message ?? ''
  const extension = /extension "([^"]+)" is not available/.exec(message)
  if (extension) {
    return `PGlite does not ship the ${extension[1]} extension, so this cannot be proved offline. ` +
      'Prove it on the project through the Supabase MCP, and say in the handoff that the offline proof could not run.'
  }
  const fn = /function ([A-Za-z0-9_."]+)\(/.exec(message)
  if (error.code === '42883' && fn) {
    const name = fn[1].replace(/"/g, '').split('.').pop()
    if (PGTAP_ONLY.has(name)) {
      return `${name} is pgTAP but not in the offline shim (${show(SHIM_PATH)}). ` +
        'Add it to the shim, or prove this file on the project only and say so in the handoff.'
    }
  }
  return null
}

function errorLines(error) {
  const where = error.line ? `${error.file}:${error.line}` : error.file
  const lines = [`# error: ${where}: ${error.code ? error.code + ' ' : ''}${error.message}`]
  for (const key of ['detail', 'hint', 'where']) {
    if (!error[key]) continue
    String(error[key]).split('\n').forEach((text, n) => lines.push(n ? `#     ${text}` : `#   ${key}: ${text}`))
  }
  if (error.statement) {
    lines.push('#   statement:')
    for (const text of error.statement.split('\n')) lines.push(`#     ${text}`)
  }
  return lines
}

/* ------------------------------------------------------------------ TAP */

/** Reads one test file's TAP: the plan, the test points, and each failure's diagnostic. */
function readTap(rawLines) {
  let planned = null
  let ran = 0
  let failed = 0
  let bailed = false
  let current = null
  const failures = []
  const lines = []
  for (const raw of rawLines) {
    const line = raw.replace(/\s+$/, '')
    let m
    if ((m = /^1\.\.(\d+)/.exec(line))) {
      if (planned === null) planned = Number(m[1])
      current = null
      lines.push(line)
    } else if ((m = /^(not )?ok\b\s*(\d+)?\s*(?:-\s*)?(.*)$/.exec(line))) {
      ran++
      current = null
      if (m[1]) {
        failed++
        current = { number: m[2] ? Number(m[2]) : ran, description: m[3], diag: [] }
        failures.push(current)
      }
      lines.push(line)
    } else if (line.startsWith('#')) {
      if (current && /^#\s{2,}/.test(line)) current.diag.push(line.replace(/^#\s?/, ''))
      lines.push(line)
    } else if (line.startsWith('Bail out!')) {
      bailed = true
      lines.push(`# ${line}`)
    } else if (line !== '') {
      lines.push(`# output: ${line}`)
    }
  }
  return { planned, ran, failed, bailed, failures, lines }
}

/* ------------------------------------------------------------------ bootstrap */

/**
 * The pieces a Supabase project has before its first migration runs, and nothing else. A
 * likeness, not Supabase's own definitions: close enough that a migration which relies on
 * them applies here, never applied anywhere but PGlite.
 */
function bootstrapSql(extensions) {
  const installed = PREINSTALLED
    .filter((name) => extensions.includes(name.replace(/-/g, '_')))
    .map((name) => `create extension if not exists "${name}" with schema extensions;`)
    .join('\n')
  return `
-- The client roles, as Supabase creates them. authenticator is the role PostgREST logs in
-- as; supabase_auth_admin is the role Auth hooks are granted to.
create role anon          nologin noinherit;
create role authenticated nologin noinherit;
create role service_role  nologin noinherit bypassrls;
create role authenticator nologin noinherit;
create role supabase_auth_admin nologin noinherit createrole;
grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role to current_user;

create schema if not exists extensions;
create schema if not exists auth;
grant usage on schema public     to postgres, anon, authenticated, service_role;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
grant usage on schema auth       to anon, authenticated, service_role;

-- Supabase's default privileges. Every table, view, sequence and function created in public
-- is reachable by the client roles until a migration revokes it. Without these, a migration
-- that forgets its revokes would pass here and leak on the project.
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;

${installed}

-- The columns of auth.users that migrations and seeds reference, so a foreign key to it and
-- a seed that inserts users both apply. Not granted to any client role, as on the project.
create table auth.users (
  instance_id                 uuid,
  id                          uuid primary key,
  aud                         varchar(255),
  role                        varchar(255),
  email                       varchar(255),
  encrypted_password          varchar(255),
  email_confirmed_at          timestamptz,
  invited_at                  timestamptz,
  confirmation_token          varchar(255),
  confirmation_sent_at        timestamptz,
  recovery_token              varchar(255),
  recovery_sent_at            timestamptz,
  email_change_token_new      varchar(255),
  email_change                varchar(255),
  email_change_sent_at        timestamptz,
  last_sign_in_at             timestamptz,
  raw_app_meta_data           jsonb,
  raw_user_meta_data          jsonb,
  is_super_admin              boolean,
  created_at                  timestamptz,
  updated_at                  timestamptz,
  phone                       text unique default null,
  phone_confirmed_at          timestamptz,
  phone_change                text default '',
  phone_change_token          varchar(255) default '',
  phone_change_sent_at        timestamptz,
  confirmed_at                timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored,
  email_change_token_current  varchar(255) default '',
  email_change_confirm_status smallint default 0,
  banned_until                timestamptz,
  reauthentication_token      varchar(255) default '',
  reauthentication_sent_at    timestamptz,
  is_sso_user                 boolean not null default false,
  deleted_at                  timestamptz,
  is_anonymous                boolean not null default false
);

-- The claim readers, in the form Supabase ships. The second argument to current_setting is
-- missing_ok, so with no claims set each returns null rather than raising, which is what
-- lets a seed or a trigger run with no session at all.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create or replace function auth.email() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;

grant execute on function auth.jwt(), auth.uid(), auth.role(), auth.email()
  to anon, authenticated, service_role;
`
}

/* ------------------------------------------------------------------ the run */

async function main() {
  let flags
  try {
    flags = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error(`db-test: ${e.message}\n\n${USAGE}`)
    return 1
  }
  if (flags.help) {
    console.log(USAGE)
    return 0
  }

  const started = Date.now()
  const supabaseDir = resolve(flags.dir ?? process.env.DEVTEAM_SUPABASE_DIR ?? join(ROOT, 'supabase'))
  const migrationsDir = join(supabaseDir, 'migrations')
  const testsDir = join(supabaseDir, 'tests')
  const seedPath = join(supabaseDir, 'seed.sql')

  const report = {
    tool: 'db-test',
    source: 'PGlite',
    label: LABEL,
    engine: null,
    supabaseDir: show(supabaseDir),
    startedAt: new Date(started).toISOString(),
    finishedAt: null,
    ms: null,
    bootstrap: null,
    migrations: [],
    seed: null,
    shim: null,
    tests: [],
    reverse: null,
    error: null,
    result: null,
    exitCode: null,
  }

  const tap = (line) => { if (!flags.json) process.stdout.write(line + '\n') }
  const finish = (result, exitCode) => {
    report.result = result
    report.exitCode = exitCode
    report.finishedAt = new Date().toISOString()
    report.ms = Date.now() - started
    if (flags.json) process.stdout.write(JSON.stringify(report, null, 2) + '\n')
    return exitCode
  }
  const bail = (error) => {
    report.error = error
    tap(`Bail out! ${error.line ? `${error.file}:${error.line}` : error.file}: ${error.code ? error.code + ' ' : ''}${error.message}`)
    for (const line of errorLines(error).slice(1)) tap(line)
    return finish('fail', 1)
  }

  tap(`# db-test: ${LABEL}`)
  tap(`# supabase:  ${show(supabaseDir)}`)

  const migrations = listFiles(migrationsDir, (name) => name.endsWith('.sql'))
  if (!migrations.length) {
    tap(`1..0 # SKIP no migrations in ${show(migrationsDir)}, so there is nothing to prove`)
    return finish('no-migrations', 2)
  }

  let tests
  if (flags.only) {
    const found = findFile(flags.only, testsDir)
    if (!found) return bail({ file: flags.only, message: `--only names no file, as a path or inside ${show(testsDir)}` })
    tests = [found]
  } else {
    tests = listFiles(testsDir, (name) => name.endsWith('.test.sql'))
  }

  let reversePath = null
  if (flags.reverse) {
    reversePath = findFile(flags.reverse, null)
    if (!reversePath) return bail({ file: flags.reverse, message: '--reverse names no file' })
  }

  const load = pgliteImporter()
  let PGlite
  try {
    const mod = await load('@electric-sql/pglite')
    PGlite = mod.PGlite ?? mod.default?.PGlite
    if (!PGlite) throw new Error('no PGlite export')
  } catch {
    return bail({
      file: 'package.json',
      message: '@electric-sql/pglite is not installed. Run npm i -D @electric-sql/pglite in the project root, the folder db-test runs from.',
    })
  }

  // PGlite loads an extension only if it is named before boot, so find every one the
  // migrations and the seed create. Names PGlite does not ship are left to fail at their
  // create extension statement, where the error can say which file needs it.
  const hasSeed = isFile(seedPath)
  const wanted = new Set(PREINSTALLED)
  for (const path of hasSeed ? [...migrations, seedPath] : migrations) {
    for (const m of readSql(path).matchAll(CREATE_EXTENSION)) wanted.add(m[2].toLowerCase())
  }
  wanted.delete('pgtap')
  const extensions = {}
  for (const name of wanted) {
    const key = name.replace(/-/g, '_')
    try {
      const mod = await load(`@electric-sql/pglite/contrib/${key}`)
      const extension = mod[key] ?? mod.default?.[key]
      if (extension) extensions[key] = extension
    } catch {
      // Not shipped by PGlite. Reported at the statement that needs it.
    }
  }

  const db = await PGlite.create({ extensions })
  try {
    const version = (await db.query('select version() as v')).rows[0].v
    report.engine = /^PostgreSQL \S+ \(PGlite [^)]+\)/.exec(version)?.[0] ?? version
    tap(`# engine:    ${report.engine}`)

    /** Applies one SQL text statement by statement. Stops at the first error. */
    const apply = async (file, text, { skipPgtap = false } = {}) => {
      const statements = splitStatements(text)
      const result = { file, statements: statements.length, skipped: [], ms: 0, error: null }
      const t0 = Date.now()
      for (const statement of statements) {
        if (skipPgtap && PGTAP_EXTENSION.test(statement.sql)) {
          result.skipped.push({ line: statement.line, statement: statement.sql.split('\n')[0] })
          continue
        }
        try {
          await db.exec(statement.sql)
        } catch (e) {
          result.error = describeError(e, file, statement, text)
          break
        }
      }
      if (!result.error && db.isInTransaction()) {
        result.error = { file, line: null, code: null, message: 'the file left a transaction open: a begin with no commit' }
        await db.exec('rollback')
      }
      result.ms = Date.now() - t0
      return result
    }

    const bootstrap = await apply(`bootstrap (built into ${show(SCRIPT_PATH)})`, bootstrapSql(Object.keys(extensions)))
    report.bootstrap = bootstrap
    if (bootstrap.error) return bail(bootstrap.error)
    await db.exec(`set search_path to ${BASE_PATH}`)
    tap(`# bootstrap: ${count(bootstrap.statements, 'statement')}, ${bootstrap.ms} ms (anon, authenticated, service_role, auth, extensions)`)

    for (const path of migrations) {
      const file = show(path)
      const result = await apply(file, readSql(path), { skipPgtap: true })
      if (!/^\d{14}_[A-Za-z0-9_-]+\.sql$/.test(basename(path))) {
        result.warning = 'the name does not follow <yyyymmddhhmmss>_<slug>.sql'
        tap(`# warning:   ${file}: ${result.warning}`)
      }
      report.migrations.push(result)
      if (result.error) return bail(result.error)
      tap(`# migration: ${file}, ${count(result.statements, 'statement')}, ${result.ms} ms`)
      for (const s of result.skipped) {
        tap(`# skipped:   ${file}:${s.line}: ${s.statement} (PGlite has no pgTAP; the shim stands in for it offline)`)
      }
    }

    if (hasSeed) {
      const seed = await apply(show(seedPath), readSql(seedPath))
      report.seed = seed
      if (seed.error) return bail(seed.error)
      tap(`# seed:      ${seed.file}, ${count(seed.statements, 'statement')}, ${seed.ms} ms`)
    } else {
      tap(`# seed:      none (${show(seedPath)} does not exist)`)
    }

    const shim = await apply(show(SHIM_PATH), readSql(SHIM_PATH))
    report.shim = { file: shim.file, statements: shim.statements, ms: shim.ms }
    if (shim.error) return bail(shim.error)
    tap(`# shim:      ${shim.file}, ${count(shim.statements, 'statement')}`)

    // One top-level test point per test file, each file's own TAP indented under it as a
    // subtest, plus two for the reverse when it is asked for.
    let point = 0
    const planned = Math.max(tests.length, 1) + (reversePath ? 2 : 0)
    tap(`1..${planned}`)

    if (!tests.length) {
      tap(`not ok ${++point} - ${show(testsDir)} has no *.test.sql files, so nothing was proved`)
      report.tests.push({ file: show(testsDir), ok: false, reason: 'no test files' })
    }

    for (const path of tests) {
      const file = show(path)
      const text = readSql(path)
      const statements = splitStatements(text)
      await db.exec('select tap.reset_run()')
      await db.exec(`set search_path to ${TEST_PATH}`)

      // Each file runs in a transaction that is rolled back, so no file sees what another
      // wrote. A file that opens its own transaction keeps it.
      const opensOwn = statements.length > 0 && /^(begin|start\s+transaction)\b/i.test(statements[0].sql)
      if (!opensOwn) await db.exec('begin')

      const output = []
      let error = null
      for (const statement of statements) {
        try {
          const results = await db.exec(statement.sql)
          for (const result of results) {
            for (const row of result.rows ?? []) {
              for (const value of Object.values(row)) {
                if (typeof value === 'string' && value !== '') output.push(...value.split(/\r?\n/))
              }
            }
          }
        } catch (e) {
          error = describeError(e, file, statement, text)
          break
        }
      }

      const committed = !error && statements.length > 0 && /^(commit|end)\b/i.test(statements[statements.length - 1].sql)
      if (db.isInTransaction()) await db.exec('rollback')
      await db.exec('reset role')
      await db.exec(`select set_config('request.jwt.claims', '', false)`)

      const result = readTap(output)
      const ok = !error && !result.bailed && result.planned !== null &&
        result.ran === result.planned && result.failed === 0
      const reason = ok ? null
        : error ? 'SQL error'
        : result.bailed ? 'bailed out'
        : result.planned === null ? 'no plan'
        : result.ran !== result.planned ? `planned ${result.planned} but ran ${result.ran}`
        : `${result.failed} failed`

      tap(`# Subtest: ${file}`)
      for (const line of result.lines) tap(`    ${line}`)
      if (error) for (const line of errorLines(error)) tap(`    ${line}`)
      tap(`${ok ? 'ok' : 'not ok'} ${++point} - ${file}`)
      tap(`# ${file}: planned ${result.planned ?? 'none'}, ran ${result.ran}, failed ${result.failed}${reason ? `, ${reason}` : ''}`)
      if (committed) tap(`# warning: ${file} commits, so later test files see what it wrote`)

      report.tests.push({
        file,
        ok,
        reason,
        planned: result.planned,
        ran: result.ran,
        passed: result.ran - result.failed,
        failed: result.failed,
        failures: result.failures,
        error,
        committed,
        tap: result.lines,
      })
    }

    if (reversePath) {
      await db.exec(`set search_path to ${BASE_PATH}`)
      const file = show(reversePath)
      const newest = migrations[migrations.length - 1]
      const back = await apply(file, readSql(reversePath), { skipPgtap: true })
      tap(`${back.error ? 'not ok' : 'ok'} ${++point} - reverse ${file} applies to the migrated, seeded database`)
      if (back.error) for (const line of errorLines(back.error)) tap(line)

      let again = null
      if (back.error) {
        tap(`not ok ${++point} - ${show(newest)} re-applies after the reverse`)
        tap('# not attempted: the reverse failed')
      } else {
        again = await apply(show(newest), readSql(newest), { skipPgtap: true })
        tap(`${again.error ? 'not ok' : 'ok'} ${++point} - ${show(newest)} re-applies after the reverse`)
        if (again.error) for (const line of errorLines(again.error)) tap(line)
      }
      report.reverse = { file, reverse: back, reapplied: again }
    }

    const filesPassed = report.tests.filter((t) => t.ok).length
    const assertions = report.tests.reduce((sum, t) => sum + (t.ran ?? 0), 0)
    const assertionsPassed = report.tests.reduce((sum, t) => sum + (t.passed ?? 0), 0)
    const reverseOk = !report.reverse || (!report.reverse.reverse.error && report.reverse.reapplied && !report.reverse.reapplied.error)
    const pass = tests.length > 0 && filesPassed === tests.length && reverseOk

    tap(`# result: ${pass ? 'pass' : 'fail'} on PGlite. ${filesPassed} of ${tests.length} test files, ` +
      `${assertionsPassed} of ${assertions} assertions${report.reverse ? `, reverse ${reverseOk ? 'ok' : 'failed'}` : ''}.`)
    return finish(pass ? 'pass' : 'fail', pass ? 0 : 1)
  } finally {
    await db.close()
  }
}

process.exitCode = await main()
