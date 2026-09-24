<picture><source media="(prefers-color-scheme: dark)" srcset="../assets/security-dark.svg"><img src="../assets/security-light.svg" alt="The security gate: seven passes" width="100%"></picture>

# Security checklist

This page is the security gate, written for people. The gate is called `security`, and one
role holds it: [security-analyst](agents/security-analyst.md). It reads every diff at stage
6, beside peer-reviewer, code-analyst and code-steward, and it must pass before the
regression guard and the engineering gate can run. It blocks on its own authority, and
nothing downstream starts until it reads pass. Only the Product Lead can overrule it, and
its findings are never traded against a date.

The sweep is seven passes in a fixed order. Each pass looks for a set of numbered items, from
1.1 to 7.4, and each item carries a default severity and a CWE identifier you can look up.
The titles, numbers and severities here are the ones in the
[team-security skill](../.claude/skills/team-security/SKILL.md), which is the source. If the
two ever disagree, the skill is right and this page is out of date.

## Why the order matters

Pass 01 runs first. A leaked key walks past every control the rest of the sweep checks, and
it cannot be taken back: the fix is rotation, because deleting the line leaves the key in
every clone. It is also the cheapest pass.

Pass 02 runs next. An open data store or a public bucket means every row or file is already
reachable with the public client key, so reviewing individual access rules while the store
is open is wasted effort.

A critical in either of these two stops the sweep. The gate fails on that finding, the
findings file and the handoff name the passes not yet run, and the full sweep runs again from
pass 01 when the fix comes back.

Passes 03 to 07 run in order of blast radius, widest first: access control, then injection,
then third-party code, then the handling of data, then failure. A critical in any of them does
not stop the sweep. The analyst finishes, so the author receives every finding in one round.
If a blocked tool cuts the sweep short, what did run has already covered the worst outcomes.

## Before the first pass

The threat model comes first. security-analyst reads `PROJECT.md § Product` and
`PROJECT.md § Product invariants`, then answers the four questions of the Threat Modeling
Manifesto in its plan: what are we working on, what can go wrong, what are we going to do
about it, and did we do a good enough job. Every invariant the change touches is mapped to
the pass and the probe that would prove it holds. If the invariants are missing or still
carry a `TODO:` marker, the analyst hands off `blocked`, because a threat model built on
guessed invariants protects the wrong things.

The actors it considers, every time: an anonymous visitor holding the public client key, a
signed-in member of another account, a signed-in member with a lower role, anyone with the
shipped bundle, a malicious or compromised package, anyone who sees a URL or a log, and a
flood of requests.

Four rules hold in every pass.

- Every pass saves its commands and their output under `evidence/security/` in the run
  folder, including the passes that found nothing. A clean pass counts as evidence, and a
  pass that never ran is a gap.
- A key, a token or a password never appears in evidence. Every scan that can print one goes
  through `redact`, which keeps the file, the line and the name, and replaces the value.
- Every tool reads or probes. Nothing is applied, deployed or altered, and no fix is made.
  Probes run inside a transaction that rolls back, against a local build, or against a
  disposable environment. Probes that send volume or induce failure never touch an
  environment with real users.
- A tool that does not answer is never faked. The analyst runs every pass it still can, hands
  off `blocked` with the tool and the error, and the orchestrator takes it to the Product
  Lead.

Each pass has a key, such as `secrets` or `access`. It is the class a finding carries in its
heading (`S-03 · Critical · exposure · ...`) and the prefix of every evidence file the pass
writes. Every finding states where, what, why, proof, fix and rotation, and names an evidence
file someone else can reproduce it from.

The scans use two small node helpers, defined once at the top of the sweep, so nothing
depends on grep being installed. `match` prints each line of standard input that matches a
pattern. `redact` replaces quoted values, key-shaped runs and passwords in URLs.

```bash
# match: print each line of standard input that matches a pattern, case-insensitive, numbered
match() { node -e 'const re=new RegExp(process.argv[1],"i");let n=0;require("readline").createInterface({input:process.stdin}).on("line",(l)=>{n+=1;if(re.test(l))console.log(n+": "+l)})' "$1"; }

# redact: replace quoted values, key-shaped runs and passwords in URLs with <redacted>
redact() { node -e 'require("readline").createInterface({input:process.stdin}).on("line",(l)=>console.log(l.replace(/(["'\''`])[^"'\''`]{8,}\1/g,"$1<redacted>$1").replace(/((secret|token|password|passwd|key)\w*\s*[=:]\s*)[^\s"'\''`<]{8,}/gi,"$1<redacted>").replace(/(sk_live_|sb_secret_|eyJ)[\w.-]{8,}/g,"$1<redacted>").replace(/(:\/\/[^\/\s:@]+:)[^\/\s@]+@/g,"$1<redacted>@")))'; }
```

Where a command says `<base>`, it means the base ref of the change. Commands that depend on
the stack use the default pack,
[stack-nextjs-supabase](../.claude/skills/stack-nextjs-supabase/SKILL.md), as the example. On
another stack, the pack named in `PROJECT.md § Stack pack` supplies the equivalent.

## 01 Secrets and keys

Key `secrets`. Keys and passwords in the diff, the tree and every commit. A critical here
stops the sweep.

| Item | Looks for | Default severity | CWE |
|---|---|---|---|
| 1.1 | Hard-coded credentials | Critical | CWE-798 |
| 1.2 | Secrets in history | Critical | CWE-798 |
| 1.3 | A privileged key where a client can reach it | Critical | CWE-200 |
| 1.4 | Environment files and CI | Critical | CWE-538 |
| 1.5 | Secrets in the team's own artefacts | High | CWE-532 |

### Why it matters

Everyone with the repository can read a key written into it. A key committed once and
removed in the next commit has still leaked, because clones, forks and caches keep it. A
privileged key, one that bypasses access control, protects nothing once it reaches the
browser. The public client key is the other kind: it ships to every browser by design, and
the access rules in the data layer are the only thing that makes it safe.

### How the team checks it

The scans cover the change, the whole tracked tree and every commit on every branch,
removed lines included.

```bash
# the change: credential-shaped assignments on added lines
git diff <base>... | match '^\+.*(secret|token|password|passwd|api[_-]?key|private[_-]?key|client[_-]?secret|bearer)\s*[=:]\s*["'\''`]' | redact

# the whole tracked tree, and new files not yet added
git grep --untracked -nEi '(secret|token|password|passwd|api[_-]?key|private[_-]?key|client[_-]?secret|bearer)[[:space:]]*[=:][[:space:]]*["'\''`]' | redact

# private keys, and connection strings with a password in them
git grep --untracked -nE -e '-----BEGIN [A-Z ]*PRIVATE KEY' -e '[a-z]+://[^/[:space:]:@]+:[^/[:space:]@]+@' | redact

# every commit on every branch, removed lines included
git log -p --all | match 'sk_live_|-----BEGIN [A-Z ]*PRIVATE KEY|(secret|token|password|api[_-]?key)\s*[=:]\s*["'\''][^"'\'']{12,}' | redact

# environment files tracked by mistake: must print nothing
git ls-files -- ':(glob)**/.env*' ':(exclude,glob)**/.env.example'
```

The stack pack adds its own privileged key names to these patterns. On the default pack they
are `service_role`, `SERVICE_ROLE`, `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_` and
`SUPABASE_JWT_SECRET`, and any of them in a path the browser downloads is a critical and a
rotation event. A committed key that is a JWT has a readable payload, so the analyst decodes
it and reads the role it grants.

```bash
node -e 'console.log(Buffer.from(process.argv[1].split(".")[1], "base64url").toString())' '<token>'
```

The analyst also reads the CI workflows, for a secret echoed to a log, passed on a command
line, or made available to code from an outside contribution. The team's own artefacts count
too. A token pasted into a handoff, or a screenshot of a settings page with a key on it, is a
leak.

### Evidence

| File | Holds |
|---|---|
| `secrets-diff.txt` | The scan of the change |
| `secrets-tree.txt` | The tree scans, including private keys and connection strings |
| `secrets-history.txt` | The scan of every commit on every branch |
| `secrets-env-files.txt` | Tracked environment files. Expected empty. |
| `secrets-privileged-keys.txt` | The stack pack's privileged key scans |

### What blocks

Every finding. Nothing in this pass is rated below high, and a critical stops the sweep.
Each finding says whether rotation is required, and why. Deleting the line is never the fix
on its own: the finding stays open until the new key is in place and the old one is revoked.
A key that reached an environment with real data, or a repository anyone can read, is a
disclosure as well as a rotation, and it goes to the Product Lead.

## 02 Exposure and configuration

Key `exposure`. Open data stores and endpoints, storage, client variables, CORS. A critical
here stops the sweep.

| Item | Looks for | Default severity | CWE |
|---|---|---|---|
| 2.1 | Open data stores | Critical | CWE-284 |
| 2.2 | Misconfigured storage | Critical | CWE-732 |
| 2.3 | Open endpoints | Critical | CWE-306 |
| 2.4 | Client-exposed environment variables | High, Critical when it holds a secret | CWE-200 |
| 2.5 | CORS | High | CWE-942 |
| 2.6 | Debug modes, defaults and leftovers | High | CWE-489 |

### Why it matters

This is the class behind the headline breaches, and nothing clever happens in them. A store
is left open, and someone finds it. On the default pack, a table in an exposed schema with
row level security off is a public database, because the API exposes every granted table
and the publishable key is in the browser by design.

### How the team checks it

Every data store is proved twice. The catalogue shows the setting, and a request from the
caller's side shows the effect.

1. The stack pack's catalogue queries. On the default pack, each query in its own
   `execute_sql` call through the Supabase MCP.
2. A request with the public client key and no session, sent to the real API URL, for every
   table the change touches. Expected: refused or empty, never rows.

Storage gets the same treatment. No bucket is public unless every file in it is meant for
anyone, and every private store is probed as each role that reads, writes and lists. On the
default pack that starts with `select id, public from storage.buckets;`. Signed URLs are
short-lived and scoped to one object, and an unguessable path is never counted as access
control.

For endpoints, the analyst builds a route inventory from the code (route handlers, server
actions, server functions, webhooks, database functions callable over the API, admin and
debug routes) and calls each entry with no session. A webhook may skip the session check only
because it verifies the provider's signature instead. The inventory is saved as
`exposure-routes.md`, with what each route should require and what it answered, and pass 03
reuses it.

Browser variables are read in the source, then in what the browser actually downloads,
because a build can inline a value the source only names.

```bash
# a browser variable named like a secret: must print nothing (default pack prefix shown)
git grep --untracked -nE 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE|PRIVATE|PASSWORD)'

# the built client bundle: must print nothing (default pack output folder shown)
git grep --no-index -nE 'sb_secret_|service_role|-----BEGIN' -- web/.next/static | redact
```

CORS is checked with a preflight request from an origin that is not on the list, using the
node script in the skill. Expected: no allow-origin header, or a fixed one. A wildcard on
anything that reads a session, an origin echoed back unchecked, an allowed `null` origin, or
`Access-Control-Allow-Credentials: true` beside a wildcard or an echoed origin, is a finding.

Then the leftovers: debug and verbose error modes in production, public source maps the
Product Lead did not choose, default credentials, sample data and seed accounts on a shared
environment, a served admin tool, test route or `.git` folder, and a preview deployment that
holds real data without the controls production has.

Where the stack pack names the platform's own security checks, they run on every sweep. On
the default pack that is `get_advisors` for type `security` and type `performance`. A clean
platform check never replaces the catalogue queries or the probes, because it knows the
platform's rules and not your invariants.

### Evidence

| File | Holds |
|---|---|
| `exposure-catalogue-<query>.json` | Each catalogue query and its rows. On the default pack, `catalogue-<query>.json`. |
| `exposure-public-key-probe.txt` | The public key, no session, against every table the change touches |
| `exposure-storage.json`, `exposure-storage-probe-<role>.txt` | The store settings, and each role's probe |
| `exposure-routes.md` | The route inventory, with what each answered with no session |
| `exposure-client-env.txt`, `exposure-bundle.txt` | Browser variables, and the built bundle scan |
| `exposure-cors-<route>.txt` | Each preflight and its response headers |
| `exposure-platform-security.json`, `exposure-platform-performance.json` | The platform's own checks |

### What blocks

Every finding. Like secrets, this class is never rated below high, and a critical stops the
sweep. A change that turns an access rule off is a critical whatever its commit message
says. An access rule turned on with no rules denies everything, which looks like a bug and
gets "fixed" by turning the rule off, so the analyst checks the fix and not the symptom. Every
finding from the platform's own checks is a defect too: clean, or each one accepted in
writing.

## 03 Authentication and access control

Key `access`. Decided on the server, IDOR probed as every role, every route in.

| Item | Looks for | Default severity | CWE |
|---|---|---|---|
| 3.1 | Client-side authentication | Critical | CWE-602 |
| 3.2 | IDOR, missing object-level authorisation | Critical | CWE-639 |
| 3.3 | Broken function-level authorisation and mass assignment | Critical | CWE-285, CWE-915 |
| 3.4 | Enforcement in the wrong layer | Critical on an invariant path, High elsewhere | CWE-602 |
| 3.5 | Weak session handling | High | CWE-613, CWE-384 |
| 3.6 | Authentication bypass paths | Critical | CWE-288 |
| 3.7 | Credential storage | Critical | CWE-916, CWE-256 |
| 3.8 | Sign-in abuse and account enumeration | High | CWE-307, CWE-204 |

### Why it matters

Broken access control causes more real breaches than any other class. If a decision runs
in the browser, the user can read it and skip it. The client may hide a control the user cannot
use, but it is never the reason they cannot reach the data. An object id in a request, with
nothing checking that the caller may reach it, is the most common breach of all in this
class.

### How the team checks it

Five probes, each one recorded.

1. The role matrix: every role the ADR names, against every command (read, create, update,
   delete, and each named action), on every data store and route the change touches. Each
   cell holds the expected result and the evidence file that proves it.
2. Each cell probed as the role, inside a transaction that rolls back. On the default pack,
   `execute_sql` inside `begin; ... rollback;` with `set local role` and
   `set local request.jwt.claims`.
3. The same case sent from outside, to the real API URL, with the public client key and the
   role's access token.
4. Every server function and handler the change touches, called four ways: with no session,
   with a session of the right role, with a session from another account, and with a lower
   role.
5. The client-side checks, each hit read to see whether it decides what is fetched or mints
   a token.

The negative case matters most. A member of account A asking for an id in account B gets
nothing, or a 404. A 403 confirms that the row exists, which is itself a leak. Identity comes
from the verified session, never from the request body, and every update rule checks the row
before and after the change, so a caller cannot move a row into another account. A write
accepts only named fields, checked against the role, so nobody sets their own `role` or
`account_id` by adding a field.

```bash
# role and permission checks, and unverified session reads: read every hit
git grep --untracked -nE '\.role[[:space:]]*[!=]==?|is(Admin|Owner)|has(Role|Permission)|getSession\('

# tokens or ids minted without a secure source
git grep --untracked -nE 'Math\.random\('
```

Sessions are held to a short list. Tokens come from a cryptographically secure source. The
server checks signature and expiry on every request, and refuses an unsigned token or one
with `alg: none`. Expiry is as short as what the token grants allows, and a single-use link
token expires in minutes and after its first use. Sign-out ends the session on the server and
clears the device. Cookies carry `Secure`, `HttpOnly` and `SameSite=Lax` or `Strict`. The
session id changes after sign-in and after any privilege change, and a removed member loses
access within the token lifetime the ADR states.

Passwords are stored by the auth provider, or with argon2id, scrypt or bcrypt. A custom
credential table with a hand-written hash, `md5`, `sha1` or a plain `sha256` over a password
is a critical. Sign-in, password reset, invite acceptance and one-time codes are
rate-limited, and neither their responses nor their timing reveal whether an account exists.

Last, every path into the data is enumerated, starting from `exposure-routes.md`: the web
app, a direct API call, a server function, a webhook, a realtime subscription, a scheduled
job, an export, a file store, an admin tool, a preview deployment. One unauthenticated path
makes every other control irrelevant.

### Evidence

| File | Holds |
|---|---|
| `access-matrix.md` | The role matrix, each cell pointing at its proof |
| `access-probe-<role>-<case>.txt`, `access-rest-<role>-<case>.txt` | Each probe, and the same case from outside. On the default pack, `probe-<role>-<case>.txt` and `rest-<role>-<case>.txt`. |
| `access-server-<function>-<case>.txt` | Each server function call and its response |
| `access-client-checks.txt` | The client-side scans, with a note on each hit |

### What blocks

Every finding. Nothing in this pass is rated below high. Each rule in
`PROJECT.md § Product invariants` holds in the lowest layer that can hold it, as the ADR
names it, and the probe proves it there. In the example product, an edit to an issued
invoice is refused by a database trigger, so the same update sent straight to the API with a
valid session is refused too. Hiding the edit button is not the control.

## 04 Injection and dangerous functions

Key `injection`. SQL, XSS, command and template injection, eval and its relatives.

| Item | Looks for | Default severity | CWE |
|---|---|---|---|
| 4.1 | SQL and query injection | Critical | CWE-89, CWE-943 |
| 4.2 | Cross-site scripting | High, Critical when it can act as another user | CWE-79 |
| 4.3 | Command injection | Critical | CWE-78, CWE-88 |
| 4.4 | Template injection | Critical | CWE-1336 |
| 4.5 | Path traversal | High | CWE-22 |
| 4.6 | Server-side request forgery and open redirect | High | CWE-918, CWE-601 |
| 4.7 | Header and log injection | Medium | CWE-113, CWE-117 |
| 4.8 | Untrusted structured input | High | CWE-502, CWE-1321 |
| 4.9 | Prompt injection | High | OWASP LLM01 |
| 4.10 | Dangerous functions | Critical | CWE-95, CWE-94 |

### Why it matters

Any string that reaches an interpreter can become code: a query, a shell, the page, a
template, a URL, a file path, a header, a log line, a model prompt. The shortest solution is
often the unsafe one. The textbook case is `eval` used for arithmetic on user input, which
hands over arbitrary code execution to save four lines.

### How the team checks it

The searches find candidates. Reading finds the bug, so the analyst also reads every handler
the change adds, whether or not a search hit it.

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

A query built as a string is fixed by passing values as parameters.

```sql
-- vulnerable: the identifier and the value are concatenated
execute 'select * from ' || tbl || ' where account_id = ''' || p_account || '''';

-- correct: %I quotes an identifier, and using passes the value as a parameter
execute format('select * from %I where account_id = $1', tbl) using p_account;
```

The same reading covers the rest of the table. A shell command takes its arguments as an
array, with `--` before any user value. A template is compiled from the repository, never
from user input. A file path is resolved and checked to stay inside its root. A server that
fetches a user's URL allows only listed hosts and refuses private, loopback, link-local and
cloud metadata addresses, and a `next` or `returnTo` parameter is checked against paths
inside the app. Untrusted JSON is validated against a schema at every boundary. Where the
product passes user text to a language model, the model's output is untrusted input, and
every tool call it makes passes the same authorisation as any other request.

Where a candidate needs proof, the analyst sends a harmless payload to a local build and
saves the request and the response: a quote character in a query parameter,
`<img src=x onerror=alert(1)>` in a free-text field that is shown back, `../` in a file
parameter. Never against an environment with real users.

### Evidence

| File | Holds |
|---|---|
| `injection-code.txt`, `injection-markup.txt` | The code, command and markup sink scans, with a note on each hit |
| `injection-queries.txt`, `injection-templates.txt` | The query and template scans |
| `injection-paths.txt` | File paths, redirects and server-side fetches |
| `injection-probe-<case>.txt` | Each payload sent, and the response |

### What blocks

Every critical and high, which is every item but one. Item 4.7 is the medium in this pass:
it is logged with an owner and a date, and three mediums in the same area block together. A
Content Security Policy that restricts `script-src` limits the damage of cross-site
scripting, and it replaces none of the fixes above.

## 05 Dependencies and supply chain

Key `dependencies`. Every new package proved real, the audit clean of known CVEs.

| Item | Looks for | Default severity | CWE |
|---|---|---|---|
| 5.1 | Packages that do not exist, or imitate a popular name | High | CWE-829 |
| 5.2 | Known vulnerabilities | High, or the advisory's severity when higher | CWE-1395 |
| 5.3 | Install scripts and integrity | High | CWE-506 |
| 5.4 | Unmaintained and deprecated packages | Medium | CWE-1104 |
| 5.5 | Unpinned code loaded at run time | High | CWE-829 |

### Why it matters

Code generators, and people in a hurry, name packages that do not exist. Whoever registers
that plausible name owns every build that installs it, and a name one letter away from a
popular package works the same way. Advisories are published against code that did not
change, which is why the audit runs on every sweep, even when no manifest changed.

### How the team checks it

The audit runs in every folder that holds a lockfile, and its output is read in full. An exit
code of zero from a dry run does not mean a fix exists.

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
```

When a manifest or a lockfile changed, every new package, direct or pulled in through the
lockfile, is proved to exist and to be the one intended. The skill carries a node script that
lists the new and changed packages from both files. Then, for each new name:

```bash
npm view <name> name version time.created time.modified repository.url maintainers deprecated --json
node -e 'fetch("https://api.npmjs.org/downloads/point/last-week/" + process.argv[1]).then((r) => r.json()).then((j) => console.log(JSON.stringify(j)))' <name>
```

| Signal | What it means |
|---|---|
| The registry answers 404 | The name is free for anyone to register tomorrow. Remove it. |
| First published in the last few weeks, with a few hundred downloads or fewer | The shape of a squat. Needs a reason in writing. |
| One edit away from a popular name, or a popular name with a scope or suffix added | Typosquatting until proved otherwise |
| No repository link, or a link to a different project | No source to read, so no way to know what it runs |
| An install script (`hasInstallScript` in the lockfile) | Runs code on every machine that installs it. Critical if it fetches or runs anything it did not ship with. |
| Deprecated, or a maintainer change shortly before a new release | Abandoned, or taken over |

The lockfile is committed and CI installs from it with `npm ci`, and every `resolved` URL in
it points at the registry the project uses. A script from a CDN carries an `integrity`
attribute, and nothing loaded at run time follows `latest` or a branch. A deprecated or
archived package gets an owner and a date to replace it. Another package manager uses its own
audit command, and only when `PROJECT.md § Toolchain` lists it.

### Evidence

| File | Holds |
|---|---|
| `dependencies-audit-<dir>.json`, `dependencies-audit-<dir>.txt` | The audit of each lockfile, as JSON and as read |
| `dependencies-fix-dry-run-<dir>.txt` | What a fix would change, and what it cannot |
| `dependencies-signatures-<dir>.txt` | The signature and provenance check |
| `dependencies-new.txt` | Every new or changed package, direct and transitive |
| `dependencies-registry-<name>.txt` | The registry entry and downloads for each new package |

### What blocks

An advisory rated critical is a critical finding, high is high, moderate is medium and low is
low, before the severity rules below apply. Every critical and high is fixed, or accepted in
writing by the Product Lead with a reason and a date. "It is only a dev dependency" is an
acceptance, and it is written down like any other. When no fixed version exists, the choice
between removing the dependency and shipping with the risk goes to the Product Lead. A
missing audit tool is `blocked`, never skipped.

## 06 Data handling

Key `data`. Client storage, data in URLs and logs, headers, CSRF, rate limits.

| Item | Looks for | Default severity | CWE |
|---|---|---|---|
| 6.1 | Insecure client-side storage | High | CWE-922 |
| 6.2 | Sensitive data in URLs | Medium, High on an invariant path or with a token | CWE-598 |
| 6.3 | Sensitive data in logs | Medium, High on an invariant path | CWE-532 |
| 6.4 | Missing security headers | Medium | CWE-693, CWE-1021 |
| 6.5 | No CSRF protection | High | CWE-352 |
| 6.6 | Missing rate limiting | High | CWE-770, CWE-307 |
| 6.7 | File uploads | High | CWE-434 |

### Why it matters

URLs land in access logs, referrers, browser history, analytics and shared screenshots, and
logs travel to places no access rule covers. Anything left in browser storage can be read by
cross-site scripting, and by the next person to pick up a shared device. An endpoint with no
rate limit costs money when it sends a message or charges a card, and it lets an attacker
walk every sign-in code or token in turn.

### How the team checks it

```bash
# client storage, personal data in URLs, and request data in logs: read every hit
git grep --untracked -nE 'localStorage|sessionStorage|indexedDB|document\.cookie'
git grep --untracked -nEi '[?&](email|phone|token|password|name|ssn)=|searchParams\.(set|append)\([[:space:]]*["'\''](email|phone|token|password)'
git grep --untracked -nE 'console\.(log|info|warn|error|debug)\(.*(req|request)\.(body|headers)|console\.(log|info|warn|error|debug)\(.*JSON\.stringify\((req|request|user|body)'
```

Where the stack pack provides a browser runner (Playwright on the default pack), the analyst
signs in, uses the changed surface, signs out, and saves what storage holds afterwards.
Expected: nothing from the session. It then reads what the server actually wrote to its logs
after calling the changed paths (`get_logs` on the default pack), because redaction happens
before writing, not after.

Headers are read from a running build, on one page, one API route and one static file. They
are set centrally, so every route inherits them rather than each one remembering.

| Header | Value |
|---|---|
| `Content-Security-Policy` | Restrictive. `script-src` without `unsafe-inline`, using nonces or hashes, and `frame-ancestors` set. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`, read on the deployed HTTPS origin |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options`, or CSP `frame-ancestors` | Deny, unless the product is meant to be embedded |
| `Referrer-Policy` | `strict-origin-when-cross-origin`, or stricter |
| `Permissions-Policy` | Deny every feature the product does not use |

```bash
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
```

A local build over plain HTTP may omit `Strict-Transport-Security`, so that one is read on
the deployed HTTPS origin, or recorded as not verified.

CSRF is probed with a cookie-authenticated write sent from a foreign origin, and the expected
answer is a refusal. The defences are `SameSite=Lax` or `Strict` on the session cookie, no
state change on `GET`, and an anti-CSRF token or a verified `Origin` check on every
cookie-authenticated write.

Rate limits are probed with a burst of requests to one route, on a local build or a
disposable environment only, with messaging and payment providers in test mode. Where neither
exists, the analyst reads the limiter's code and configuration and records the item as read,
not probed. The skill carries the node scripts for both probes.

Uploads are checked for a type read from the content rather than the name, a size cap, a
private store, a name the server generates, and delivery with
`Content-Disposition: attachment` or from a separate origin. HTML and SVG are never served
inline from the app's own origin.

### Evidence

| File | Holds |
|---|---|
| `data-client-storage.txt`, `data-client-storage-after-signout.txt` | The storage scan, and what storage held after sign-out |
| `data-urls.txt` | Personal data and tokens in URLs |
| `data-logs-code.txt`, `data-logs-platform.txt` | Log calls in the code, and what the server wrote |
| `data-headers-<route>.txt` | Response headers and cookie flags, per route |
| `data-csrf-<route>.txt` | The cross-origin write, and its status |
| `data-rate-limit-<route>.txt` | Status counts from the rate-limit probe |
| `data-uploads.txt` | The upload checks, with the file sent and the response |

### What blocks

Every high: client storage, CSRF, rate limiting and uploads. The three mediums (6.2, 6.3 and
6.4) are logged with an owner and a date, and three mediums in the same area block together.
Personal data in a URL or a log rises to high on a path an invariant governs, and a token in
a URL rises to high wherever it appears.

## 07 Failure handling

Key `failure`. Every failure path run, nothing swallowed, errors and logs clean.

| Item | Looks for | Default severity | CWE |
|---|---|---|---|
| 7.1 | Missing error handling | High | CWE-755 |
| 7.2 | Swallowed exceptions and failing open | High, Critical when an access check fails open | CWE-390, CWE-636 |
| 7.3 | Errors that say too much | Medium, High when it reveals data the caller cannot read | CWE-209, CWE-204 |
| 7.4 | Logging that is absent | Medium | CWE-778 |

### Why it matters

This is the half of the catalogue a user sees first, and the reason a product feels fragile
before anyone calls it insecure. Code written in a hurry handles the happy path well and the
rest not at all. A swallowed exception is worse than a crash, because it leaves a wrong state
nobody sees. The worst form is an authorisation or validation step that throws and lets the
request through.

### How the team checks it

Every path below runs against a local build, on each surface and handler the change touches.
The devices and networks in `PROJECT.md § Quality bar` fail in these ways routinely.

| Path | How to induce it | Must |
|---|---|---|
| Network timeout | A node fetch with `AbortSignal.timeout(1)`, or the browser runner's network throttling | Retry with backoff, or fail with a stated next step |
| Offline mid-submit | The browser runner's offline mode during a submit | Hold the input, say so plainly, send on reconnect, never twice |
| Empty or missing field | Submit without it, or send the request without it | Refused with a message beside the field, and a code from the server |
| Wrong type | A string where a number belongs, an array where an object belongs | Refused at the boundary with a code, never coerced silently |
| Upstream 5xx | Point the upstream at a stub that answers 500, or stop it | Something usable, never a blank screen |
| Partial failure | Fail one of the several requests a screen makes | What resolved is shown, what did not is labelled |
| Duplicate submit | Send the same request twice, or double-click | One side effect, held by an idempotency key under a unique constraint |

```bash
# swallowed exceptions: read every hit, then every handler the change adds
git grep --untracked -nE 'catch[[:space:]]*(\([^)]*\))?[[:space:]]*\{[[:space:]]*\}|\.catch\([[:space:]]*\([^)]*\)[[:space:]]*=>[[:space:]]*(\{[[:space:]]*\}|null|undefined)[[:space:]]*\)'
git grep --untracked -nEi 'when[[:space:]]+others[[:space:]]+then[[:space:]]+null' -- '*.sql'

# error detail returned to the caller
git grep --untracked -nE '(json|send|Response)\(.*(err|error|e)\.(stack|message)'
```

Each server function the change touches is also called with a malformed body, and what came
back is saved. An error carries a code and a plain message, and the detail goes to the server
log, redacted. Security events are logged: failed sign-ins, access refusals, role and
permission changes, and key use. Every log line carries a correlation id, so a support
conversation can find the request.

### Evidence

| File | Holds |
|---|---|
| `failure-paths.md` | Each path in the table: how it was induced, what happened, and the file that shows it |
| `failure-<case>.txt` | Each induced failure, its request and its response or screenshot |
| `failure-swallowed.txt`, `failure-errors.txt` | The scans, with a note on each hit |
| `failure-logging.txt` | What the server logged for each induced failure, redacted |

### What blocks

Missing error handling and swallowed exceptions block. An access check that fails open is a
critical, because every check fails closed. An error that lets a caller infer what they
cannot read rises to high: a 403 where a 404 was due, or a sign-in that answers faster for
accounts that do not exist. A stack trace in a response and a failure path with nothing
logged are mediums, logged with an owner and a date.

## Severities

| Severity | Means | What it does to the gate |
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
   defect is worse than a new one, because the lesson was already on record.
6. Nothing goes above critical. A finding goes below its default only with a written reason
   in the finding, and never below the floors in rules 2 and 3.

### When the gate passes

The `security` gate reads pass when all of these hold.

1. Every applicable pass ran, with its command output as evidence.
2. No critical and no high finding is open. A finding closes when it is fixed and proved
   again, or when the Product Lead accepts it in writing.
3. Every medium is logged with an owner and a date.
4. The dependency audit is clean of critical and high, or each remaining one is accepted in
   writing by the Product Lead with a reason and a date.
5. No secret appears in the working tree or in git history.
6. Every data store a client can reach enforces access control in the lowest layer that can
   hold it, proved by probes as each role and never by reading the migration.
7. The platform's own security checks, where the stack pack names them, are clean or every
   finding is accepted in writing.
8. No privileged credential is referenced anywhere a client can reach it.

A pass that does not apply is named in the plan with its reason, and reads `not run` in the
findings file with that reason. Pass 05 always runs its audit.

## Written acceptance

A critical or a high is never approved for a date or a demo, or because it sits behind a
flag, since a flag is configuration and configuration changes. It closes in one of
two ways. It is fixed and the fix is proved again with the same probe, or the Product Lead
accepts it in writing.

Only the Product Lead accepts a risk. security-analyst recommends, and neither another agent
nor the author can accept one.

1. security-analyst fails the gate and escalates to the orchestrator with a
   `decisions_for_product_lead` entry. It names the finding id and severity, the options
   (fix it now, with the cost; accept it, with a compensating control and an expiry; and for
   a dependency, remove it), and its own recommendation.
2. The orchestrator takes the question to the Product Lead through the route in
   `PROJECT.md § Product Lead`, and records the answer in `ledger.md` as a `decision` event:
   the finding id, the decision, the reason, any compensating control, the expiry or revisit
   date, the Product Lead's name, and a timestamp from the shell.
3. security-analyst cites that ledger entry beside the finding, marks it `accepted`, and
   names the accepted risk in its handoff.
4. bug-historian records the accepted risk in [BUGS.md](../BUGS.md).

An acceptance covers the finding as written. When the code it covers changes, or its expiry
passes, the finding reopens. An acceptance in a chat message, a code comment, a commit message
or another agent's handoff does not count, and neither does silence. The Product Lead can also
overrule the gate as a whole, and the orchestrator records that override in the ledger the
same way.

## Use it without the team

The checklist works as a pre-release review for any codebase, with or without the agents.
Run the seven passes in order, save each command with its output, and stop on a critical in
the first two. Swap the default pack's tools for your platform's own, using the table in the
skill's [toolchain section](../.claude/skills/team-security/SKILL.md#toolchain), which names
each tool by what it does. Decide before you start who may accept a critical or a high, and
write their answer down where the next person will find it. A review that found nothing
keeps its output too, so anyone can see that it ran.

## Sources

Every item maps to at least one public reference, and each carries a CWE identifier. Look one
up at `https://cwe.mitre.org/data/definitions/<number>.html`, with the number from the item.

| Source | What it gives the checklist |
|---|---|
| [OWASP Top 10](https://owasp.org/projects/top-ten) | The class names and the sense of blast radius: broken access control, injection, security misconfiguration, vulnerable components, authentication failures, integrity failures, logging failures |
| [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/projects/asvs) | The requirement behind each item, in its chapters on authentication, session management, access control, validation and encoding, data protection, configuration, error handling and logging |
| [OWASP API Security Top 10](https://api-security.owasp.org/) | Broken object level authorisation (IDOR), broken function level authorisation, unrestricted resource consumption |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | The fixes: secrets management, injection prevention, cross-site scripting prevention, CSRF prevention, HTTP headers, password storage, logging, threat modelling |
| [MITRE CWE](https://cwe.mitre.org/) | The identifier on every item, so a finding can be traced to a known weakness |
| [Threat Modeling Manifesto](https://www.threatmodelingmanifesto.org/) | The four questions the threat model asks |
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) | LLM01, prompt injection, which item 4.9 cites |

[Read the full skill](../.claude/skills/team-security/SKILL.md)
