---
name: team-security
description: "The security catalogue and sweep security-analyst runs to hold the security gate, on every change, build and commit, and before any release. Seven passes in a fixed order, stopping on a critical in the first two: secrets and keys in the tree and in history; exposure of data stores, storage, endpoints, environment variables and CORS; authentication and access control, including client-side checks and IDOR; injection of every kind and dangerous functions such as eval; dependencies, including packages that do not exist and known CVEs; data handling, covering client storage, data in URLs and logs, security headers, CSRF and rate limiting; failure handling, errors and logging. Covers the threat model from PROJECT.md, the commands and evidence for each pass, severities and what blocks, the finding format, and written acceptance of critical and high findings by the Product Lead. Use when sweeping a change, rating a finding, or deciding whether the security gate can pass."
---

# Security

This is the catalogue security-analyst works from, and the sweep it runs to hold the
`security` gate. Every class here has shipped in real products, most of them many times, and most of them
because the code was written fast and nobody looked at it from the outside.

The gate is binding. The threat model comes from the product, so a finding on
a promise the product makes is never a style point, and it is never traded against a date.

Other roles read parts of it. code-analyst checks the line-level classes through
`team-code-analysis`. qc-engineer and qc-lead reuse the probe form for invariant cases. Only
security-analyst runs it whole, and only security-analyst records the `security` gate.

The examples use the generic product from `team-architecture`: accounts, projects and
invoices, with its example invariants I1 to I6. Your invariants are in
`PROJECT.md § Product invariants`. Commands that depend on the stack name the tool by what it
does and give the default pack, `stack-nextjs-supabase`, as the example. On another stack the
pack named in `PROJECT.md § Stack pack` supplies the equivalent, read by path at
`.claude/skills/<pack>/SKILL.md`. With `none`, work from `PROJECT.md § Stack` and
`PROJECT.md § Commands`.

## Sources

Every class in the catalogue maps to at least one public reference, and each item carries
the CWE identifier a reader can look up.

| Source | What it gives the catalogue |
|---|---|
| OWASP Top 10 | The class names and the sense of blast radius: broken access control, injection, security misconfiguration, vulnerable components, authentication failures, integrity failures, logging failures |
| OWASP Application Security Verification Standard (ASVS) | The requirement behind each item, in its chapters on authentication, session management, access control, validation and encoding, data protection, configuration, error handling and logging |
| OWASP API Security Top 10 | Broken object level authorisation (IDOR), broken function level authorisation, unrestricted resource consumption |
| OWASP Cheat Sheet Series | The fixes: secrets management, injection prevention, cross-site scripting prevention, CSRF prevention, HTTP headers, password storage, logging, threat modelling |
| MITRE CWE | The identifier on every item, so a finding can be traced to a known weakness |
| Threat Modeling Manifesto | The four questions the threat model asks |

---

## The seven passes

This table is the sweep. In the team's own repository, the security diagram
(`assets/security-light.svg`, `assets/security-dark.svg`, drawn by
`scripts/assets/diagrams.mjs`) and the readable checklist in `docs/SECURITY-CHECKLIST.md` are
drawn from it. Change a title or a summary here and change them with it.

| # | Pass | Key | Summary | Stops the sweep on a critical |
|---|---|---|---|---|
| 01 | Secrets and keys | `secrets` | Keys and passwords in the diff, the tree and every commit. | Yes |
| 02 | Exposure and configuration | `exposure` | Open data stores and endpoints, storage, client variables, CORS. | Yes |
| 03 | Authentication and access control | `access` | Decided on the server, IDOR probed as every role, every route in. | No |
| 04 | Injection and dangerous functions | `injection` | SQL, XSS, command and template injection, eval and its relatives. | No |
| 05 | Dependencies and supply chain | `dependencies` | Every new package proved real, the audit clean of known CVEs. | No |
| 06 | Data handling | `data` | Client storage, data in URLs and logs, headers, CSRF, rate limits. | No |
| 07 | Failure handling | `failure` | Every failure path run, nothing swallowed, errors and logs clean. | No |

The key is the class a finding carries in its heading (`S-03 · Critical · exposure · ...`)
and the prefix of every evidence file the pass writes.

---

## How to run it

Run it on every change, in the order of the table, for the reasons below.

Pass 1 runs first because a leaked key walks past every control the rest of the sweep checks,
and it cannot be taken back: the fix is rotation, not deletion. It is also the cheapest pass.

Pass 2 runs next because an open data store or a public bucket means every row or file is
already reachable with the public client key. Reviewing individual access rules while the
store itself is open is wasted effort.

Passes 3 to 7 run in order of blast radius, widest first. Access control is the class behind
most real breaches, then code execution through injection, then third-party code, then the
handling of data at rest and in transit, then failure. If a blocked tool cuts the sweep short,
what did run has covered the worst outcomes.

### Stopping on a critical

A critical in pass 1 or pass 2 stops the sweep. Report it rather than completing the rest for
tidiness. The gate fails on that finding, `findings.md` and the handoff name the passes not
yet run, and the full sweep runs from pass 1 on the resubmission.

A critical in passes 3 to 7 does not stop the sweep. Finish it, so the author receives every
finding in one round rather than one finding per round.

### What every pass records

Every pass saves its commands, calls and output under `evidence/security/`, including the
passes that found nothing. A clean pass is evidence. An unrun pass is a gap.

A pass that does not apply is named in `plan.md` with the reason, and its line in the
`findings.md` header reads `not run` with that reason. No evidence file is invented for it.
Pass 5 always runs its audit, even when no manifest changed, because advisories are published
against code that did not change. Its new-package checks run when a manifest or a lockfile
changed.

### Read and probe, never change

Every tool in the sweep reads or probes. No migration is applied, no function deployed, no
setting altered, no fix made. Probes run inside a transaction that rolls back, against a local
build, or against a disposable environment, so nothing a probe does persists. Probes that send
volume (rate limits) or induce failure never run against an environment with real users, and
never with a live messaging or payment provider.

### When a tool does not answer

If a tool the sweep needs does not answer (a server that is not authorised, a missing audit
command, an auth error), nothing is faked. Run every pass you still can, including the
offline proof the stack pack names, set `status` to `blocked` with the tool and the error in
`blockers`, and the orchestrator takes it to the Product Lead. For the default pack the reason
is `supabase MCP not authorised`, and the Product Lead authorises the server with `/mcp`.

---

## The threat model

Step 1, before choosing passes. Read `PROJECT.md § Product` and
`PROJECT.md § Product invariants`, then write a `## Threat model` section in
`security-analyst/plan.md` that answers the four questions of the Threat Modeling Manifesto.

1. What are we working on? The change surface, split into data layer and access rules,
   server functions and handlers, client code, dependencies, configuration and storage.
2. What can go wrong? For each invariant the change touches, the path by which it could
   break and the actor who could break it.
3. What are we going to do about it? The pass, the probe and the role matrix cell that
   would catch each threat.
4. Did we do a good enough job? Answered at step 4 in `review.md`: every threat listed has
   a pass result or a probe as evidence, or a stated reason it has none.

The actors to consider, every time:

| Actor | Holds | The question |
|---|---|---|
| Anonymous visitor | The public client key, which ships in every browser by design | What can they read or change with no session? |
| Signed-in member of another account | A valid session | Can they reach another account's rows by changing an id? (I1 in the example) |
| Signed-in member with a lower role | A valid session and a role | Can they perform an action their role does not allow? |
| Anyone with the bundle | The shipped JavaScript, source maps, variables prefixed for the browser | What secret or internal address does the bundle reveal? |
| A malicious or compromised package | Code that runs at install and at run time | What does a new dependency run, and when? |
| Anyone who sees a URL or a log | Access logs, referrers, history, screenshots, log drains | What personal data or token travels there? |
| A flood of requests | No limit | What does an unlimited endpoint cost, or let someone enumerate? |

Then the invariant map, one row per invariant the change touches:

| Invariant | Path this change touches | Layer meant to hold it, from the ADR | Pass and probe that proves it |
|---|---|---|---|
| I1 | `GET /projects?account_id=` and the projects export | Row-level rule on `projects`, keyed on membership | Pass 3, `access` probe as a member of account A asking for account B |

A path an invariant governs raises every finding on it to at least high. A path that touches
authentication, storage, payments or messaging raises the default severity one step. If
`PROJECT.md § Product invariants` is missing or still holds a `TODO:` marker, hand off
`blocked` with `missing_inputs`. A threat model built on guessed invariants protects the
wrong things.

---

## Toolchain

Assume only what `PROJECT.md § Toolchain` lists. The core commands use git and node and
nothing else. The dependency commands in pass 5 are npm's, shown because the default pack
uses npm; on another package manager its own equivalents run instead. Where your dispatch or
`run.json` names a base ref, use it as `<base>`. `git diff <base>...` reads what the branch committed. When the change is not yet committed,
use `git diff <base>`, which compares the working tree with the base. `git grep --untracked`
includes new files that are not yet added.

Two helpers, defined once at the top of the sweep. Both use node only, so the sweep does not
depend on grep being installed.

```bash
# match: print each line of standard input that matches a pattern, case-insensitive, numbered
match() { node -e 'const re=new RegExp(process.argv[1],"i");let n=0;require("readline").createInterface({input:process.stdin}).on("line",(l)=>{n+=1;if(re.test(l))console.log(n+": "+l)})' "$1"; }

# redact: replace quoted values, key-shaped runs and passwords in URLs with <redacted>
redact() { node -e 'require("readline").createInterface({input:process.stdin}).on("line",(l)=>console.log(l.replace(/(["'\''`])[^"'\''`]{8,}\1/g,"$1<redacted>$1").replace(/((secret|token|password|passwd|key)\w*\s*[=:]\s*)[^\s"'\''`<]{8,}/gi,"$1<redacted>").replace(/(sk_live_|sb_secret_|eyJ)[\w.-]{8,}/g,"$1<redacted>").replace(/(:\/\/[^\/\s:@]+:)[^\/\s@]+@/g,"$1<redacted>@")))'; }
```

Every scan that can print a credential goes through `redact` before it is saved. A key, a
token or a password never appears in evidence: keep the file, the line and the name, and
replace the value.

The stack-dependent tools, named by what they do:

| Need | On any stack | On the default pack |
|---|---|---|
| Catalogue of data stores and their access rules | The stack's catalogue queries, as the pack lists them | The pack's catalogue queries, each in its own `execute_sql` call through the Supabase MCP |
| A probe as a role | A request or a transaction that switches to the role and rolls back | `execute_sql` inside `begin; ... rollback;` with `set local role` and `set local request.jwt.claims` |
| The same case from outside | curl or a node fetch script against the real API URL with the public client key | The REST URL from `get_project_url` and the key from `get_publishable_keys` |
| The platform's own security checks | Whatever the platform provides | `get_advisors` for type `security` and type `performance` |
| Server logs | The platform's log reader | `get_logs` |
| Offline proof | Whatever the pack names, labelled offline | `node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs` |
| Dependency audit | The audit command of each package manager `PROJECT.md § Toolchain` lists | `npm audit` |
| A running build | The dev or build command in `PROJECT.md § Commands` | The `web/` scripts the pack sets out |

With stack pack `none`, the probes run against a running build started with the dev command
in `PROJECT.md § Commands`, signed in as a test account for each role. The Product Lead sets
up the test accounts. Their passwords live in the environment of the machine that runs the
probe, never in the repository or the evidence.

---

## Pass 1. Secrets and keys

Key `secrets`. A critical here stops the sweep. OWASP Top 10: security misconfiguration and
cryptographic failures. ASVS: configuration and data protection. OWASP Secrets Management
Cheat Sheet.

### 1.1 Hard-coded credentials · Critical · CWE-798

A key, token, password, private key, or connection string with a password in it, written into
source, configuration, a test fixture, a seed file, a CI workflow or a document. A fixture
counts when the credential works anywhere. The fix is to read it from the environment or the
platform's secret store, and to rotate it, because everyone with the repository has already
been able to read it.

### 1.2 Secrets in history · Critical · CWE-798

Scan every commit on every branch, not only the working tree. A key committed once and removed
in the next commit has leaked: clones, forks and caches keep it, and rewriting history does
not change that. The fix is rotation. The finding stays open until the new key is in place and
the old one is revoked.

### 1.3 A privileged key where a client can reach it · Critical · CWE-200

There are two kinds of key, and the difference is the point of this item.

| Key | Where it may appear | What protects the data |
|---|---|---|
| Public client key | The browser bundle, by design | The access rules in the data layer, and nothing else. A public key with an access rule off is a public database. |
| Privileged key, one that bypasses access control | Server environments and function secrets only | Nothing. It bypasses every rule. |

The stack pack lists the privileged key names and value shapes for its platform. On the
default pack they are in its Security probes section: `service_role`, `SERVICE_ROLE`,
`SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_` and `SUPABASE_JWT_SECRET`. Any of them in a path the
browser downloads is a critical and a rotation event. A key that is a JWT has a readable
payload, so decode any committed one and read the role it grants.

### 1.4 Environment files and CI · Critical · CWE-538

A tracked `.env` file, or an `.env.example` that holds a value rather than a name. A CI
workflow that echoes a secret, passes one on a command line where process lists and logs
record it, or runs code from an outside contribution with secrets available to it.

### 1.5 Secrets in the team's own artefacts · High · CWE-532

The run folder, evidence, handoffs, screenshots and logs are artefacts too. A token pasted into
a handoff, or a screenshot of a settings page with a key on it, is a leak. This is why every
scan in the sweep goes through `redact`.

### Commands

```bash
# the change: credential-shaped assignments on added lines
git diff <base>... | match '^\+.*(secret|token|password|passwd|api[_-]?key|private[_-]?key|client[_-]?secret|bearer)\s*[=:]\s*["'\''`]' | redact

# the whole tracked tree, and new files not yet added
git grep --untracked -nEi '(secret|token|password|passwd|api[_-]?key|private[_-]?key|client[_-]?secret|bearer)[[:space:]]*[=:][[:space:]]*["'\''`]' | redact

# private keys, and connection strings with a password in them
git grep --untracked -nE -e '-----BEGIN [A-Z ]*PRIVATE KEY' -e '[a-z]+://[^/[:space:]:@]+:[^/[:space:]@]+@' | redact

# every commit on every branch, removed lines included; add the privileged key names the pack lists
git log -p --all | match 'sk_live_|-----BEGIN [A-Z ]*PRIVATE KEY|(secret|token|password|api[_-]?key)\s*[=:]\s*["'\''][^"'\'']{12,}' | redact

# environment files tracked by mistake: must print nothing
git ls-files -- ':(glob)**/.env*' ':(exclude,glob)**/.env.example'

# a committed key that is a JWT: print its payload and read the role
node -e 'console.log(Buffer.from(process.argv[1].split(".")[1], "base64url").toString())' '<token>'
```

On the default pack, add the pack's own scans from its Security probes section: a privileged
key name or value under `web/`, a secret key value in the tree and in history, and a browser
variable named like a secret. Each must print nothing.

Every finding in this pass states whether rotation is required, and why. Deleting the line is
never the fix on its own. A key that reached an environment with real data, or a repository
anyone can read, is a disclosure as well as a rotation, and goes to the Product Lead.

| Evidence | Holds |
|---|---|
| `secrets-diff.txt` | The scan of the change |
| `secrets-tree.txt` | The tree scans, including private keys and connection strings |
| `secrets-history.txt` | The scan of every commit on every branch |
| `secrets-env-files.txt` | Tracked environment files. Expected empty. |
| `secrets-privileged-keys.txt` | The stack pack's privileged key scans |

---

## Pass 2. Exposure and configuration

Key `exposure`. A critical here stops the sweep. OWASP Top 10: security misconfiguration and
broken access control. ASVS: configuration. OWASP API Security Top 10: security
misconfiguration.

This is the class behind the headline breaches. Nothing clever happens in them: a store is
left open, and someone finds it.

### 2.1 Open data stores · Critical · CWE-284

A data store a client can reach with no access rule in front of it. A table exposed through an
API generated from the schema, with its access rule off. A document store with open rules. A
search index, a cache or an admin console reachable from the internet without credentials, or
with the default ones.

On the default pack, a table in an exposed schema with row level security off is a public
database, because the API exposes every granted table and the publishable key is in the
browser by design.

An access rule turned on with no rules denies everything. That looks like a bug and gets
"fixed" by turning the rule off. Check the fix, not the symptom: a change that turns an access
rule off is a critical whatever its commit message says.

Prove it twice. The catalogue shows the setting, and a request from the caller's side shows
the effect.

1. The stack pack's catalogue queries. On the default pack, each query in its Catalogue
   queries section, in its own `execute_sql` call.
2. A request with the public client key and no session, sent to the real API URL, for every
   table the change touches. On the default pack, the anonymous case in its section on the
   same cases from outside. Expected: refused or empty, never rows.

### 2.2 Misconfigured storage · Critical · CWE-732

- No bucket or container is public unless every file in it is meant for anyone. Invoices,
  uploads and exports are never public.
- Every private store has access rules, tested the way table rules are: a probe as each role
  that reads, writes and lists. On the default pack, `select id, public from storage.buckets;`
  and then role-switched probes on `storage.objects`.
- Signed URLs are short-lived and scoped to one object.
- A file name is not a secret. An unguessable path is not access control.

### 2.3 Open endpoints · Critical · CWE-306

Every server route, server function, webhook, callable database function, job trigger, admin
page and debug route that answers without a session when it should not. Build the route
inventory from the code, then call each entry with no session and record what it answered.

| Route kind | Where to find it on the default pack |
|---|---|
| Route handlers | `web/src/app/**/route.ts` |
| Server Actions | Files and functions marked `'use server'` |
| Edge Functions | `supabase/functions/*/index.ts` |
| Database functions callable over the API | The pack's catalogue query for functions `anon` may execute |

A webhook may turn session checks off only because it verifies the provider's signature
instead. One that verifies nothing is an open endpoint.

Save the inventory as `exposure-routes.md`: every path, what it should require, and what it
answered with no session. Pass 3 reuses it for the role probes.

### 2.4 Client-exposed environment variables · High, Critical when it holds a secret · CWE-200

Anything given the browser prefix ships to every visitor (on the default pack, `NEXT_PUBLIC_`).
A secret with that prefix is a critical and a rotation event. A server variable read in client
code is undefined in the browser, and after a careless fix it is public. A third-party key the
client needs goes through a server function that holds it.

Search the source, then what the browser actually downloads, because a build can inline a
value the source only names.

```bash
# a browser variable named like a secret: must print nothing (default pack prefix shown)
git grep --untracked -nE 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE|PRIVATE|PASSWORD)'

# the built client bundle: must print nothing (default pack output folder shown)
git grep --no-index -nE 'sb_secret_|service_role|-----BEGIN' -- web/.next/static | redact
```

### 2.5 CORS · High · CWE-942

- An allowlist of origins, never `*`, on anything that reads a session or returns private data.
- The request's `Origin` is never echoed back unchecked.
- `Access-Control-Allow-Credentials: true` never appears with a wildcard or an echoed origin.
- The `null` origin is never allowed.

```bash
# a preflight from an origin that is not on the list: expect no allow-origin, or a fixed one
node -e '
const [url, origin] = process.argv.slice(1)
const ask = { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization, content-type" }
fetch(url, { method: "OPTIONS", headers: ask }).then((r) => {
  console.log("preflight " + r.status + " " + url)
  for (const h of ["access-control-allow-origin", "access-control-allow-credentials", "access-control-allow-methods", "access-control-allow-headers"])
    console.log(h + ": " + (r.headers.get(h) ?? "absent"))
})
' '<api url>' 'https://untrusted.example'
```

### 2.6 Debug modes, defaults and leftovers · High · CWE-489

- Debug and verbose error modes are off in production. A stack trace is a map.
- Source maps are not public unless the Product Lead chose that.
- Default credentials are changed, sample data removed and seed accounts disabled on every
  shared environment.
- No admin tool, test route or `.git` folder is served.
- A preview or staging deployment that holds real data has the same controls as production.

### Platform checks

Where the stack pack names the platform's own security checks, run them on every sweep and
treat every finding as a defect: clean, or each one accepted in writing. On the default pack
that is `get_advisors` for type `security` and type `performance`. A clean platform check never
replaces the catalogue queries or the probes, because it knows the platform's rules and not
your invariants.

| Evidence | Holds |
|---|---|
| `exposure-catalogue-<query>.json` | Each catalogue query and its rows. On the default pack, `catalogue-<query>.json`. |
| `exposure-public-key-probe.txt` | The public key, no session, against every table the change touches |
| `exposure-storage.json`, `exposure-storage-probe-<role>.txt` | The store settings, and each role's probe |
| `exposure-routes.md` | The route inventory, with what each answered with no session |
| `exposure-client-env.txt`, `exposure-bundle.txt` | Browser variables, and the built bundle scan |
| `exposure-cors-<route>.txt` | Each preflight and its response headers |
| `exposure-platform-security.json`, `exposure-platform-performance.json` | The platform's own checks. On the default pack, `get_advisors` for each type. |

---

## Pass 3. Authentication and access control

Key `access`. OWASP Top 10: broken access control and authentication failures. ASVS: the
chapters on authentication, session management and access control. OWASP API Security Top 10:
broken object level authorisation and broken function level authorisation.

Every finding in this pass is at least high. It is the class behind most real breaches.

### 3.1 Client-side authentication · Critical · CWE-602

If the decision runs in the browser, the user can read it and skip it.

| Hunt for | Signature |
|---|---|
| A role, permission or plan check in client code that decides what is fetched, not only what is shown | `if (user.role === 'admin')` guarding a request |
| A credential compared in the client | A password, code or token checked in the browser |
| A route guard that is the only protection for the data behind it | The API must refuse on its own |
| A token read without verification, used to authorise | On the default pack, `getSession()` on a server path. `getUser()` or `getClaims()` verify. |

The client may hide a control the user cannot use. It is never the reason they cannot reach
the data.

### 3.2 IDOR, missing object-level authorisation · Critical · CWE-639

An object id arrives in a request, and nothing checks that the caller may reach it. It is the
most common real breach in this class.

- Every data store a client can reach has a rule for every command, not only for reads.
- Every update rule checks the row before and after the change (on the default pack, `using`
  and `with check`). Without the second check a caller can move a row into a state they could
  not have read, such as into another account.
- Test the negative. A member of account A asking for an id in account B gets nothing, or a
  404. A 403 confirms that the row exists, which is itself a leak (I1 in the example).
- A server function that takes an account or user id from the request body and trusts it is
  the same bug with more steps. Identity comes from the verified session, never from the
  payload.

### 3.3 Broken function-level authorisation and mass assignment · Critical · CWE-285, CWE-915

An action the caller's role does not allow, reachable anyway: an admin route a member can
call, a user changing their own role, a member removing the account owner. Mass assignment is
the quiet version: a write that accepts a whole object, so a caller sets `role`, `account_id`
or `status` by adding a field. Write only named fields, checked against the role. On the
default pack, a role read from `user_metadata`, which users can change about themselves, is
this finding.

### 3.4 Enforcement in the wrong layer · Critical on an invariant path, High elsewhere · CWE-602

A rule enforced only in the client, or only in one server route that a direct API call can go
around. Two enforcement points that can disagree. A boundary that exists by convention. Every
rule in `PROJECT.md § Product invariants` holds in the lowest layer that can hold it, as the
ADR names it, and the probe proves it there. In the example, I2 (an issued invoice is never
edited) is refused by a database trigger, so an update sent straight to the API with a valid
session is refused too. Hiding the edit button is not the control.

### 3.5 Weak session handling · High · CWE-613, CWE-384

| Check | Must |
|---|---|
| Token generation | Cryptographically random (`crypto.randomUUID()`, `crypto.getRandomValues()`), never `Math.random()` |
| Verification | Signature and expiry checked on the server for every request. An unsigned token, or one with `alg: none`, is refused. |
| Expiry | As short as what the token grants allows. A single-use link token expires in minutes and after its first use. |
| Sign-out | Ends the session on the server and clears every trace on the device, because shared devices are normal |
| Cookies | `Secure`, `HttpOnly`, and `SameSite=Lax` or `Strict` |
| Fixation | A new session id after sign-in and after any privilege change |
| Revocation | A removed member loses access within the token lifetime the ADR states, and that lifetime is short |

### 3.6 Authentication bypass paths · Critical · CWE-288

Enumerate every path into the data, not only the one the change added: the web app, a direct
API call, a server function, a webhook, a realtime subscription, a scheduled job, an export, a
file store, an admin tool, a preview deployment. Start from `exposure-routes.md`. One
unauthenticated path makes every other control irrelevant. On the default pack, a table added
to the realtime publication sends each new row to anyone its read rule admits.

### 3.7 Credential storage · Critical · CWE-916, CWE-256

Passwords are stored by the auth provider, or with a slow, salted hash made for passwords
(argon2id, scrypt or bcrypt, as the OWASP Password Storage Cheat Sheet sets out). A custom
credential table, a hand-written hash, `md5`, `sha1` or a plain `sha256` over a password, or
reversible encryption of one, is a critical. API keys the product issues to its own users are
stored hashed and shown once.

### 3.8 Sign-in abuse and account enumeration · High · CWE-307, CWE-204

Sign-in, password reset, invite acceptance and one-time codes are rate-limited (6.6), and
neither their responses nor their timing reveal whether an account exists.

### Probes

1. The role matrix: every role the ADR names, against every command (read, create, update,
   delete, and each named action), on every data store and route the change touches. Each cell
   holds the expected result and the evidence file that proves it. Save it as
   `access-matrix.md`.
2. Each cell probed as the role, inside a transaction that rolls back, with the stack pack's
   tool. On the default pack, its role-switched probes.
3. The same case sent from outside, to the real API URL, with the public client key and the
   role's access token. On the default pack, its section on the same cases from outside.
4. Every server function and handler the change touches, called with no session, with a
   session of the right role, with a session from another account, and with a lower role.
5. The client-side checks, each hit read to see whether it decides what is fetched or mints a
   token.

```bash
# role and permission checks, and unverified session reads: read every hit
git grep --untracked -nE '\.role[[:space:]]*[!=]==?|is(Admin|Owner)|has(Role|Permission)|getSession\('

# tokens or ids minted without a secure source
git grep --untracked -nE 'Math\.random\('
```

| Evidence | Holds |
|---|---|
| `access-matrix.md` | The role matrix, each cell pointing at its proof |
| `access-probe-<role>-<case>.txt`, `access-rest-<role>-<case>.txt` | Each probe, and the same case from outside. On the default pack, `probe-<role>-<case>.txt` and `rest-<role>-<case>.txt`. |
| `access-server-<function>-<case>.txt` | Each server function call and its response |
| `access-client-checks.txt` | The client-side scans, with a note on each hit |

---

## Pass 4. Injection and dangerous functions

Key `injection`. OWASP Top 10: injection, and software and data integrity failures. ASVS: the
chapter on validation, sanitisation and encoding. OWASP Cheat Sheets: injection prevention,
query parameterisation, cross-site scripting prevention, DOM based XSS prevention, and OS
command injection defence.

Read every string that reaches an interpreter: a query, a shell, the page, a template, a URL, a
file path, a header, a log line, a model prompt. The searches below find candidates. Reading
finds the bug.

### 4.1 SQL and query injection · Critical · CWE-89, CWE-943

In a database function the risk is a query built as a string.

```sql
-- vulnerable: the identifier and the value are concatenated
execute 'select * from ' || tbl || ' where account_id = ''' || p_account || '''';

-- correct: %I quotes an identifier, and using passes the value as a parameter
execute format('select * from %I where account_id = $1', tbl) using p_account;
```

In application code, the same risk is a raw query with interpolation (`$queryRawUnsafe`, or
`.raw()` with concatenation), a filter string built from input (on the default pack, a filter
passed to `.or()` that contains user text, which lets a caller add filters of their own), and
operator injection into a document store, where an object from JSON reaches a query that
expected a string (`{"$ne": null}`). The role a caller runs as holds the least privilege it
needs, so an injection that succeeds still reaches nothing extra.

### 4.2 Cross-site scripting · High, Critical when it can act as another user · CWE-79

- Nothing that came from a user reaches `dangerouslySetInnerHTML` or its equivalent
  (`v-html`, `[innerHTML]`, `{@html}`) unless a maintained sanitiser has cleaned it.
- No `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write` with user data.
- A user-supplied URL is checked to be `http` or `https` before it reaches `href` or `src`. A
  `javascript:` URL is script.
- Data embedded in a `<script>` tag is serialised with `<` escaped, so a value cannot close the
  tag.
- Uploaded HTML or SVG is never served inline from the app's own origin (6.7).
- Encode on output, not only on input, because storage is not the only way in.
- A Content Security Policy that restricts `script-src` (6.4) limits the damage. It does not
  replace any of the above.

### 4.3 Command injection · Critical · CWE-78, CWE-88

A user value reaching a shell: `exec`, `execSync`, `spawn` with `shell: true`, or a command
built as a string. Pass arguments as an array to `execFile`, or to `spawn` without a shell. A
value that starts with `-` can still become an option, so end the options with `--` before
any user value.

### 4.4 Template injection · Critical · CWE-1336

Templates are code, and they live in the repository. User values are data passed into them,
escaped by default.

- A template compiled from user input on the server (`Handlebars.compile(input)`,
  `ejs.render(input)`, `_.template(input)`) is code execution.
- Unescaped output syntax (`{{{ }}}`, `<%- %>`, `| safe`) with user data is cross-site
  scripting.
- An email or document template assembled by concatenation is usually both.

### 4.5 Path traversal · High · CWE-22

A user value in a file path, an import or a storage key: `../`, an absolute path, or an encoded
form of either. Resolve the path and check that the result is still inside the intended root,
or better, map an id to a path on the server.

### 4.6 Server-side request forgery and open redirect · High · CWE-918, CWE-601

- A server that fetches a URL the user supplied (a webhook target, an image import, a link
  preview) allows only listed hosts, refuses private, loopback and link-local addresses,
  cloud metadata endpoints included, and checks again after every redirect.
- A `next` or `returnTo` parameter is checked against a list of paths inside the app. An open
  redirect turns your domain into a phishing link.

### 4.7 Header and log injection · Medium · CWE-113, CWE-117

A carriage return or line feed in a value written to a header or a log line lets a caller
split the response or forge log entries. Log values as structured fields, never by
concatenation.

### 4.8 Untrusted structured input · High · CWE-502, CWE-1321

Untrusted JSON written straight into a typed column, a webhook body used without schema
validation, a YAML loader that builds objects, or a deep merge of user JSON that lets
`__proto__` change every object in the process. Validate against a schema at every boundary,
including between your own services.

### 4.9 Prompt injection · High · OWASP LLM01

Where the product passes user text or fetched content to a language model, the model's output
is untrusted input, the model acts with no more privilege than the user it serves, and every
tool call it makes passes the same authorisation as any other request.

### 4.10 Dangerous functions · Critical · CWE-95, CWE-94

This class exists because the shortest solution is often the unsafe one.

| Never | Instead |
|---|---|
| `eval`, `new Function`, `setTimeout` or `setInterval` with a string | Parse the input, or use a real expression library |
| `vm.runInContext` on user input | Nothing in-process. `vm` is not a sandbox. |
| `child_process.exec` with interpolation | `execFile` with an argument array |
| A dynamic `import()` or `require()` built from user input | An allowlist map from a key to a module |
| A SQL `execute` on a concatenated string | `format()` with `%I` and `%L`, and `using` for values |

The textbook case is `eval` used for arithmetic on user input: arbitrary code execution,
written to save four lines.

### Commands

```bash
# strings becoming code or commands: read every hit
git grep --untracked -nE '(^|[^[:alnum:]_.])eval[[:space:]]*\(|new[[:space:]]+Function[[:space:]]*\(|set(Timeout|Interval)[[:space:]]*\([[:space:]]*["'\''`]|vm\.run|child_process|(^|[^[:alnum:]_])exec(Sync)?[[:space:]]*\(|shell:[[:space:]]*true'

# strings becoming markup
git grep --untracked -nE 'dangerouslySetInnerHTML|v-html|\[innerHTML\]|\{@html|\.(inner|outer)HTML[[:space:]]*=|insertAdjacentHTML|document\.write'

# strings becoming queries: every dynamic execute in SQL, and raw or interpolated queries in code
git grep --untracked -nEi '(^|[^[:alnum:]_])execute[[:space:]]' -- '*.sql'
git grep --untracked -nE '\$queryRawUnsafe|\$executeRawUnsafe|\.raw\(|\.(or|filter)\([[:space:]]*`|(query|execute)\([[:space:]]*`[^`]*\$\{'

# strings becoming templates
git grep --untracked -nE '[Hh]andlebars\.compile\(|ejs\.render\(|_\.template\(|\{\{\{|<%-|\|[[:space:]]*safe'

# user values reaching a file path, a redirect or a server-side fetch
git grep --untracked -nE '(readFile|createReadStream|writeFile|sendFile|path\.(join|resolve))\(.*(req\.|params|searchParams|body|query)|redirect\(.*(searchParams|query|params|body)|fetch\([^)]*(body|query|params|searchParams)\.'
```

A search sees one line. Read every handler the change adds, whether or not a search hit it.
Where a candidate needs proof, send a harmless payload to a local build and save the request
and the response: a quote character in a query parameter, `<img src=x onerror=alert(1)>` in a
free-text field that is shown back, `../` in a file parameter. Never against an environment
with real users.

| Evidence | Holds |
|---|---|
| `injection-code.txt`, `injection-markup.txt` | The code, command and markup sink scans, with a note on each hit |
| `injection-queries.txt`, `injection-templates.txt` | The query and template scans |
| `injection-paths.txt` | File paths, redirects and server-side fetches |
| `injection-probe-<case>.txt` | Each payload sent, and the response |

---

## Pass 5. Dependencies and supply chain

Key `dependencies`. OWASP Top 10: vulnerable and outdated components, and software and data
integrity failures. OWASP Cheat Sheet: vulnerable dependency management.

### 5.1 Packages that do not exist, or imitate a popular name · High · CWE-829

Code generators, and people in a hurry, name packages that do not exist. An attacker who
registers that plausible name owns every build that installs it. A name one letter away from a
popular package works the same way. Every new package in the change, direct or pulled in
through the lockfile, is proved to exist and to be the one intended: the registry entry, the
repository link, last week's downloads, the first publish date, the maintainers.

| Signal | What it means |
|---|---|
| The registry answers 404 | The name is free for anyone to register tomorrow. Remove it. |
| First published in the last few weeks, with a few hundred downloads or fewer | The shape of a squat. Needs a reason in writing. |
| One edit away from a popular name, or a popular name with a scope or suffix added | Typosquatting until proved otherwise |
| No repository link, or a link to a different project | No source to read, so no way to know what it runs |
| An install script (`hasInstallScript` in the lockfile) | Runs code on every machine that installs it. Read the script. Critical if it fetches or runs anything it did not ship with. |
| Deprecated, or a maintainer change shortly before a new release | Abandoned, or taken over |

A package published last week with forty downloads and a name one character from a popular one
is the attack, not a coincidence.

### 5.2 Known vulnerabilities · High, or the advisory's severity when higher · CWE-1395

An advisory rated critical is a critical finding, high is high, moderate is medium, low is low,
before the rules in [Setting a severity](#setting-a-severity) apply. Every critical and high is
fixed, or accepted in writing by the Product Lead with a reason and a date. "It is only a dev
dependency" is an acceptance, and it is written down like any other. When no fixed version
exists, the choice between removing the dependency and shipping with the risk goes to the
Product Lead. Read the audit output in full: an exit code of zero from a dry run does not mean
a fix exists.

### 5.3 Install scripts and integrity · High · CWE-506

The lockfile is committed and CI installs from it (`npm ci`). Every `resolved` URL in the
lockfile points at the registry the project uses; a changed host is a finding. Registry
signatures and provenance attestations verify where the registry publishes them.

### 5.4 Unmaintained and deprecated packages · Medium · CWE-1104

A deprecated package, a package with no release in years and open advisories, or one whose
repository is archived. Each has an owner and a date to replace it.

### 5.5 Unpinned code loaded at run time · High · CWE-829

A script from a CDN without Subresource Integrity (an `integrity` attribute), an import that
resolves at deploy time without a version (on the default pack, Edge Function imports are
pinned), a `latest` tag, or a git dependency that follows a branch.

### Commands

```bash
# every lockfile in the repository: the audit runs in each one's folder
git ls-files -- '*package-lock.json'

# the audit, saved in full and read in full: never trust the exit code
(cd <dir> && npm audit --audit-level=moderate)
(cd <dir> && npm audit --json) > .devteam/runs/<run-id>/evidence/security/dependencies-audit-<dir>.json

# what a fix would change, and what it cannot fix: the author applies it, never the reviewer
(cd <dir> && npm audit fix --dry-run)

# registry signatures and provenance of the installed tree (needs an install)
(cd <dir> && npm audit signatures)

# new and changed packages: direct from the manifest, transitive from the lockfile
node -e '
const { execFileSync } = require("node:child_process")
const { readFileSync } = require("node:fs")
const [base, dir] = process.argv.slice(1)
const json = (read) => { try { return JSON.parse(read()) } catch { return {} } }
const was = (file) => json(() => execFileSync("git", ["show", `${base}:${dir}/${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }))
const now = (file) => json(() => readFileSync(`${dir}/${file}`, "utf8"))
const direct = (p) => ({ ...p.dependencies, ...p.devDependencies, ...p.optionalDependencies, ...p.peerDependencies })
const [before, after] = [direct(was("package.json")), direct(now("package.json"))]
for (const [name, range] of Object.entries(after))
  if (before[name] !== range) console.log(`direct  ${name}@${range}  ${name in before ? "was " + before[name] : "new"}`)
const [lockBefore, lockAfter] = [was("package-lock.json").packages ?? {}, now("package-lock.json").packages ?? {}]
for (const [path, meta] of Object.entries(lockAfter))
  if (path && !(path in lockBefore))
    console.log(`locked  ${path.replace(/^.*node_modules\//, "")}@${meta.version}${meta.hasInstallScript ? "  install script" : ""}`)
' "$(git merge-base <base> HEAD)" <dir>

# for each new name: the registry entry, then last week's downloads. A 404 is the finding.
npm view <name> name version time.created time.modified repository.url maintainers deprecated --json
node -e 'fetch("https://api.npmjs.org/downloads/point/last-week/" + process.argv[1]).then((r) => r.json()).then((j) => console.log(JSON.stringify(j)))' <name>
```

`<dir>` is the folder that holds the manifest and its lockfile, `.` for the repository root.
Another package manager uses its own audit command, and only when `PROJECT.md § Toolchain`
lists it. A missing audit tool is `blocked`, never skipped.

| Evidence | Holds |
|---|---|
| `dependencies-audit-<dir>.json`, `dependencies-audit-<dir>.txt` | The audit of each lockfile, as JSON and as read |
| `dependencies-fix-dry-run-<dir>.txt` | What a fix would change, and what it cannot |
| `dependencies-signatures-<dir>.txt` | The signature and provenance check |
| `dependencies-new.txt` | Every new or changed package, direct and transitive |
| `dependencies-registry-<name>.txt` | The registry entry and downloads for each new package |

---

## Pass 6. Data handling

Key `data`. OWASP Top 10: cryptographic failures and security misconfiguration. ASVS: the
chapters on data protection and configuration. OWASP Cheat Sheets: HTML5 security, HTTP
headers, CSRF prevention, logging.

### 6.1 Insecure client-side storage · High · CWE-922

Nothing sensitive in `localStorage`, `sessionStorage`, IndexedDB or a cookie script can read:
no token beyond the session the auth library manages, no personal data, no payment details, no
data from another account. An offline queue the design calls for is cleared on submit and on
sign-out. If `PROJECT.md § Quality bar` names shared or low-cost devices, anything left behind
is readable by the next person to pick one up. Cross-site scripting reads all of it, which is
why a token in `localStorage` raises the cost of every XSS finding.

Where the stack pack provides a browser runner (on the default pack, Playwright), sign in, use
the changed surface, sign out, and save what the storage holds afterwards. Expected: nothing
from the session.

### 6.2 Sensitive data in URLs · Medium, High on an invariant path or with a token · CWE-598

URLs land in access logs, referrers, browser history, analytics and shared screenshots. No
email address, phone number, name, personal identifier, free text or token goes in a query
string or a path segment. A single-use token that must travel in a link (a sign-in or invite
email) is single-use, short-lived, exchanged for a session on first use, and the page it lands
on sets a `Referrer-Policy` that keeps it from leaking onward.

### 6.3 Sensitive data in logs · Medium, High on an invariant path · CWE-532

No personal data, free text, token, password, whole request body, or `Authorization` or
`Cookie` header in a log line, an error message, an exception, a trace, an analytics event or
an error-reporting breadcrumb. Redact before writing, not after. Read the code, then read what
the server actually wrote after calling the changed paths (on the default pack, `get_logs`).

### 6.4 Missing security headers · Medium · CWE-693, CWE-1021

Set centrally, so every route inherits them rather than each one remembering.

| Header | Value |
|---|---|
| `Content-Security-Policy` | Restrictive. `script-src` without `unsafe-inline`, using nonces or hashes, and `frame-ancestors` set. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`, read on the deployed HTTPS origin |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options`, or CSP `frame-ancestors` | Deny, unless the product is meant to be embedded |
| `Referrer-Policy` | `strict-origin-when-cross-origin`, or stricter |
| `Permissions-Policy` | Deny every feature the product does not use |

Session cookies carry `Secure`, `HttpOnly` and `SameSite` (3.5).

### 6.5 No CSRF protection · High · CWE-352

Anywhere a cookie authenticates a request that changes state. A request authenticated by a
token in a header is not exposed in the same way. A cookie flow is, and so is any form that
posts to a server function. The defences: `SameSite=Lax` or `Strict` on the session cookie, no
state change on `GET`, and an anti-CSRF token or a verified `Origin` check on every
cookie-authenticated write. On the default pack, Server Actions compare the `Origin` header
with the host. A route handler that accepts a cookie-authenticated `POST` has no such check
and needs its own.

### 6.6 Missing rate limiting · High · CWE-770, CWE-307

Applied per route, centrally. The routes that matter most:

- Anything that sends a message or charges money. Messaging and payments are billed per call,
  so an unlimited endpoint is a financial denial of service as well as a spam channel.
- Anything enumerable: sign-in, password reset, invite codes, one-time codes, token
  validation. With no limit, an attacker walks the space.
- Anything expensive: exports, search, file processing. Payload size and page size are capped
  too, so one request cannot ask for everything.

### 6.7 File uploads · High · CWE-434

The type is checked from the content, not from the name or the type the client sent. The size
is capped. The file lands in a private store (2.2), under a name the server generates. It is
served with `Content-Disposition: attachment`, or from a separate origin, and HTML and SVG are
never served inline from the app's own origin.

### Commands

```bash
# client storage, personal data in URLs, and request data in logs: read every hit
git grep --untracked -nE 'localStorage|sessionStorage|indexedDB|document\.cookie'
git grep --untracked -nEi '[?&](email|phone|token|password|name|ssn)=|searchParams\.(set|append)\([[:space:]]*["'\''](email|phone|token|password)'
git grep --untracked -nE 'console\.(log|info|warn|error|debug)\(.*(req|request)\.(body|headers)|console\.(log|info|warn|error|debug)\(.*JSON\.stringify\((req|request|user|body)'

# response headers and cookie flags on a running build: one page, one API route, one static file
node -e '
const url = process.argv[1]
const want = ["content-security-policy", "strict-transport-security", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"]
fetch(url, { redirect: "manual" }).then((r) => {
  console.log(r.status + " " + url)
  for (const h of want) console.log(h + ": " + (r.headers.get(h) ?? "MISSING"))
  for (const c of r.headers.getSetCookie()) console.log("set-cookie: " + c.replace(/=[^;]*/, "=<redacted>"))
})
' '<build url>'

# a cookie-authenticated write sent from a foreign origin: expect a refusal
node -e '
const [url, cookie] = process.argv.slice(1)
const headers = { Origin: "https://untrusted.example", Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" }
fetch(url, { method: "POST", headers, body: "probe=1", redirect: "manual" }).then((r) => console.log(r.status + " " + url))
' '<route url>' "$TEST_SESSION_COOKIE"

# rate limit, on a local build or a disposable environment only, providers in test mode
node -e '
const [url, count] = [process.argv[1], Number(process.argv[2] ?? 50)]
;(async () => {
  const seen = {}
  for (let i = 0; i < count; i += 1) {
    const status = await fetch(url, { method: "POST" }).then((r) => r.status, () => "error")
    seen[status] = (seen[status] ?? 0) + 1
  }
  console.log(url + " " + JSON.stringify(seen))
})()
' '<route url>' 50
```

Adapt the method and body to the route. A local build over plain HTTP may omit
`Strict-Transport-Security`, so read that one on the deployed HTTPS origin, or record it as
not verified. Where no local or disposable environment exists for a rate-limit probe, read the
limiter's code and configuration and record the item as read, not probed.

| Evidence | Holds |
|---|---|
| `data-client-storage.txt`, `data-client-storage-after-signout.txt` | The storage scan, and what storage held after sign-out |
| `data-urls.txt` | Personal data and tokens in URLs |
| `data-logs-code.txt`, `data-logs-platform.txt` | Log calls in the code, and what the server wrote |
| `data-headers-<route>.txt` | Response headers and cookie flags, per route |
| `data-csrf-<route>.txt` | The cross-origin write, and its status |
| `data-rate-limit-<route>.txt` | Status counts from the rate-limit probe |
| `data-uploads.txt` | The upload checks, with the file sent and the response |

---

## Pass 7. Failure handling

Key `failure`. OWASP Top 10: logging and monitoring failures, and the handling of exceptional
conditions. ASVS: the chapter on error handling and logging. OWASP Cheat Sheets: error
handling, logging.

This is the half of the catalogue a user sees first, and the reason a product feels fragile
rather than merely insecure. The devices and networks in `PROJECT.md § Quality bar` fail in
these ways routinely.

### 7.1 Missing error handling · High · CWE-755

Code written in a hurry handles the happy path well and the rest not at all. Run every path
below on each surface and handler the change touches.

| Path | How to induce it | Must |
|---|---|---|
| Network timeout | A node fetch with `AbortSignal.timeout(1)`, or the browser runner's network throttling | Retry with backoff, or fail with a stated next step |
| Offline mid-submit | The browser runner's offline mode during a submit | Hold the input, say so plainly, send on reconnect, never twice |
| Empty or missing field | Submit without it, or send the request without it | Refused with a message beside the field, and a code from the server |
| Wrong type | A string where a number belongs, an array where an object belongs | Refused at the boundary with a code, never coerced silently |
| Upstream 5xx | Point the upstream at a stub that answers 500, or stop it | Something usable, never a blank screen |
| Partial failure | Fail one of the several requests a screen makes | What resolved is shown, what did not is labelled |
| Duplicate submit | Send the same request twice, or double-click | One side effect, held by an idempotency key under a unique constraint |

### 7.2 Swallowed exceptions and failing open · High, Critical when an access check fails open · CWE-390, CWE-636

An empty `catch`, a `.catch(() => {})`, a promise with no handler, a database block with
`exception when others then null`. A swallowed exception is worse than a crash, because it
leaves a wrong state nobody sees. The worst form is an authorisation or validation step that
throws and lets the request through. Every check fails closed.

### 7.3 Errors that say too much · Medium, High when it reveals data the caller cannot read · CWE-209, CWE-204

A stack trace, a SQL error, a file path or a library version in a response. Worse, an error or
a difference between responses that lets a caller infer what they cannot read: a 403 where a
404 was due, which confirms a row exists; an error that names the filter that tripped a
minimum group size, which lets someone narrow a query down to one person; a sign-in that
answers faster for accounts that do not exist. An error carries a code and a plain message.
Detail goes to the server log, redacted (6.3).

### 7.4 Logging that is absent · Medium · CWE-778

A failure path with nothing logged, no metric, and no way to know at two in the morning.
Security events are logged: failed sign-ins, access refusals, role and permission changes,
key use. Every log line carries a correlation id, so a support conversation can find the
request. Too much logging is 6.3; too little is this.

### Commands

```bash
# swallowed exceptions: read every hit, then every handler the change adds
git grep --untracked -nE 'catch[[:space:]]*(\([^)]*\))?[[:space:]]*\{[[:space:]]*\}|\.catch\([[:space:]]*\([^)]*\)[[:space:]]*=>[[:space:]]*(\{[[:space:]]*\}|null|undefined)[[:space:]]*\)'
git grep --untracked -nEi 'when[[:space:]]+others[[:space:]]+then[[:space:]]+null' -- '*.sql'

# error detail returned to the caller
git grep --untracked -nE '(json|send|Response)\(.*(err|error|e)\.(stack|message)'
```

Then run each path in 7.1 against a local build, and each server function the change touches
with a malformed body, and save what came back.

| Evidence | Holds |
|---|---|
| `failure-paths.md` | Each path in 7.1: how it was induced, what happened, and the file that shows it |
| `failure-<case>.txt` | Each induced failure, its request and its response or screenshot |
| `failure-swallowed.txt`, `failure-errors.txt` | The scans, with a note on each hit |
| `failure-logging.txt` | What the server logged for each induced failure, redacted |

---

## Project checks

On every change, in addition to the passes. They come from `PROJECT.md § Product invariants`
and from the stack pack, so they differ by project.

- Each invariant the change touches has a probe that proves it holds in its layer, run as the
  role that would break it. In the example, I1 is a member of account A reading account B and
  getting nothing, and I2 is an update to an issued invoice sent straight to the API and
  refused.
- Each trap the stack pack lists is checked (on the default pack, its RLS traps table). A hit
  is a finding in the pass it belongs to, never a style point. A clean platform check does not
  replace the table.

These checks hold on any stack. The pass column says where a hit is filed.

| Check | Why | Pass |
|---|---|---|
| A privileged key outside server secrets | It bypasses every access rule | 1 |
| A grant on a base table an invariant protects | The function that guards it becomes decoration | 2 |
| An access rule off, or on with no rule, on any client-reachable table | An open endpoint, or a deny-all that gets "fixed" by turning it off | 2 |
| A private file store marked public | A path is not a secret | 2 |
| A privileged function that does not pin its lookup path (on the default pack, `security definer` without `set search_path = ''`) | Privilege escalation by shadowing an object | 3 |
| A view that runs as its owner (on the default pack, without `security_invoker = on`) | It skips the caller's access rules | 3 |
| A single-use token that is reusable, long-lived or logged | Anyone who sees it once becomes the user | 3 |
| Personal data in a log, a URL or an error | It leaks where no access rule applies | 6 |
| An error or a response that reveals what the caller cannot read | It lets a caller enumerate | 7 |

---

## Severity and what blocks

| Severity | Means | Gate |
|---|---|---|
| Critical | Data reachable by someone who should not reach it, a privileged credential exposed, or code execution | Blocks. The recommendation is always to fix before release. There is no "ship and patch". |
| High | A clear path to a critical, or a real failure in normal use | Blocks |
| Medium | Weakens a defence without opening one | Logged with an owner and a date. Three in the same area block, because that is a pattern rather than an oversight. |
| Low | Hardening | Logged |

### Setting a severity

1. Start from the item's default in the catalogue.
2. A finding in secrets, exposure or access control is never below high. Those classes block
   by default.
3. A finding on a path an invariant governs is at least high.
4. A finding on an authentication, storage, payment or messaging path moves up one step.
5. A repeat of a defect in `BUGS.md` or the regression brief moves up one step. A repeated
   defect is worse than a new one, because the register was written and nobody read it.
6. Nothing goes above critical. A finding goes below its default only with a written reason
   in the finding, and never below the floors in rules 2 and 3.

A critical or a high is never approved to meet a date or a demo, or because it sits behind a
flag: a flag is configuration, and configuration changes. It closes in one of two ways. It is fixed and the fix is proved again with the same probe, or the Product Lead
accepts it in writing.

The gate passes when every applicable pass ran with its evidence, no critical or high is open,
every medium has an owner and a date, the dependency audit is clean of critical and high or
each remaining one is accepted, no secret is in the tree or in history, every client-reachable
data store enforces access control in its lowest layer (proved by probes as each role, never by
reading the migration), the platform's own checks are clean or accepted, and no privileged
credential is reachable from a client. The full list is in `security-analyst`'s definition.

---

## Written acceptance

Only the Product Lead accepts a risk. security-analyst recommends. No other agent can accept
one, and neither can the author.

1. security-analyst hands off with the gate result `fail`, `status` `escalated`, `next`
   `orchestrator` and `blockers[].needs` `product-lead`, and a `decisions_for_product_lead`
   entry. The question names the finding id and severity. The options include fixing it now
   (with the cost), accepting it (with a compensating control and an expiry), and, for a
   dependency, removing it. The recommendation is security-analyst's own.
2. The orchestrator takes it to the Product Lead through the route in
   `PROJECT.md § Product Lead`, and records the answer in `ledger.md` as a `decision` event:
   the finding id, the decision, the reason, any compensating control, the expiry or revisit
   date, the Product Lead's name, and a timestamp from the shell.
3. security-analyst cites that ledger entry beside the finding (`status: accepted`, with the
   entry on the `accepted:` line) and names the accepted risk in its handoff.
4. bug-historian records the accepted risk in `BUGS.md`.

An acceptance covers the finding as written. When the code it covers changes, or its expiry
passes, the finding reopens. An acceptance in a chat message, a code comment, a commit message
or another agent's handoff is not an acceptance. Neither is silence. The Product Lead can also
overrule the gate as a whole, and the orchestrator records that override in the ledger the
same way.

---

## Findings

`security-analyst/findings.md` opens with the verdict and the state of the sweep, then lists
the findings of the newest round first, each ordered by severity.

```
# Security findings

verdict:   changes_requested
round:     2
base:      <base ref>
passes:    01 secrets ran · 02 exposure ran · 03 access ran · 04 injection ran ·
           05 dependencies ran · 06 data ran · 07 failure ran
not run:   none
open:      1 critical, 0 high, 2 medium, 1 low
accepted:  S-07, ledger.md <timestamp> decision
```

The verdict is `approved`, `changes_requested` or `blocked`. After a stop on a critical in pass
1 or 2, `not run` lists the passes left for the resubmission.

Each finding, in this form:

```
### S-03 · Critical · exposure · Invoices readable without a session
status:    open
where:     db/migrations/20261001090000_invoice_export.sql:14
what:      The migration adds the export view and turns off the access rule on the
           invoices table to make it work.
why:       The public client key ships in every browser by design, and the access
           rule is the only thing between it and every invoice of every account.
           Breaks PROJECT.md § Product invariants, I1.
proof:     evidence/security/exposure-public-key-probe.txt: a request with the
           public key and no session returns every row in the table.
fix:       Restore the access rule in the same migration, and build the export as a
           function that derives the account from the verified session.
rotation:  Not required for the public key. If this reached an environment with real
           data, treat it as a disclosure and escalate.
```

- Ids run `S-01` upward across every round of the run and are never reused.
- The class is the pass key from [the seven passes](#the-seven-passes).
- `status` is `open`, `fixed` (with the evidence of the re-proof) or `accepted` (with an
  `accepted:` line citing the ledger entry and the expiry).
- `proof` names an evidence file and says what it shows. A finding someone else cannot
  reproduce from what is written is not finished.
- `fix` is concrete. The author applies it. security-analyst never edits the code.
- `rotation` is stated for every finding in pass 1, and for any finding where a credential was
  exposed: required or not, and why.

A correctness bug or a readability point found along the way goes in `review.md` for the
orchestrator to route to its owner. It is not a security finding.

---

## Evidence

Run paths sit under `.devteam/runs/<run-id>/`, or under `DEVTEAM_RUNS_DIR` where that is set.
Every pass writes to `evidence/security/`, with the names in its own section.

- Every file opens with the command or call, where it ran (local, offline proof, or the
  project), and a timestamp from the shell
  (`node -e "console.log(new Date().toISOString())"`), then the output.
- An empty result is saved with its command. That is the evidence of a clean pass.
- Every value of a key, a token or a password is redacted. The name stays.
- Where the stack pack names a file for the same output, its name replaces the one here. On
  the default pack that is `catalogue-<query>.json`, `probe-<role>-<case>.txt` and
  `rest-<role>-<case>.txt`.
- The offline proof is labelled offline in its name and on its first line. It never stands in
  for a probe on the real project.

A sweep with no findings is reported as a sweep with no findings, with the output attached.
Silence is not a clean result, and the difference is the reason this role exists.

---

## Before handing off

- [ ] The threat model is in `plan.md`, with every invariant the change touches mapped to a
      pass and a probe.
- [ ] Every applicable pass ran in order, or the sweep stopped on a critical in pass 1 or 2 and
      `findings.md` and the handoff name the passes not run.
- [ ] Every pass that ran has its evidence under `evidence/security/`, clean passes included.
- [ ] No evidence file holds the value of a key, a token or a password.
- [ ] The dependency audit output was read in full, not only its exit code.
- [ ] Every finding has a status, where, what, why, proof, fix and rotation, and a severity set
      by the rules above.
- [ ] Every critical and high is fixed and proved again, accepted with its ledger entry cited,
      or open, and the gate reads `fail`.
- [ ] Every medium has an owner and a date, and three in one area are raised as a pattern.
- [ ] Every accepted risk is named in `findings.md` and in the handoff, for bug-historian.
- [ ] Nothing was changed through a tool. Every probe rolled back or ran on a disposable
      environment.
