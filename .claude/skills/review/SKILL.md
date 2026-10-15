---
name: review
description: Run the read-only reviewer subagent on a diff, branch or files against the repo rules.
argument-hint: "[commit | branch | files]"
context: fork
agent: reviewer
disable-model-invocation: true
---

Review: $ARGUMENTS

If that is empty, review `git diff main...HEAD`.
