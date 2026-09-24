# Security

## Reporting a vulnerability

Report it privately, through GitHub's private vulnerability reporting. Open the Security
tab of this repository and choose "Report a vulnerability". Please do not open a public
issue, discussion or pull request for it.

A useful report says what you found, which files are involved, how to reproduce it, and
what someone could do with it. A proof of concept helps, but a clear description is
enough.

## In scope

The agents, skills and scripts in this repository, and the defaults they ship with.

| Area | What a vulnerability looks like |
|---|---|
| `.claude/agents/` and `.claude/skills/` | An instruction that would lead an agent to expose a secret, weaken an access rule, trust input it should reject, or run a destructive command without asking |
| `.claude/settings.json` | A default permission that allows something it should ask about or deny |
| `.devteam/bin/`, `scripts/` and the stack pack's scripts | A script that can be made to read or write outside the folder it is given, or to run its input as code |
| `.github/workflows/` | A workflow that exposes a token, or runs untrusted code with write access |

## Out of scope

Products built with the team are out of scope. Their code, data and deployments belong to
their owners, and a vulnerability in one should go to whoever maintains it. Claude Code
itself, MCP servers and third-party companion skills are out of scope too; each has its own
maintainers and its own route for reports.

## What to expect

This repository is maintained by one person, so the response is modest and honest. You
should hear back within seven days to say the report arrived. Once the issue is reproduced
you will get an assessment and, if it is confirmed, a fix on `main` with you credited in
the change, unless you would rather not be named. There is no bug bounty.

Only the latest commit on `main` is supported. Earlier copies installed into other
projects are updated by running the installer again with `--force`.
