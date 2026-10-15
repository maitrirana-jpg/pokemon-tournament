# Refresh the `.scratch` mirror

`.scratch/` holds markdown copies of GitHub Issues. GitHub is the source of truth, so refresh after creating, editing or closing an issue.

```sh
node tools/scripts/sync-scratch.mjs
```

The script needs an authenticated `gh` CLI. It:

- treats every issue titled `Spec: …` as a feature and writes it to `.scratch/<feature>/spec.md`;
- writes each issue whose body has `## Parent` → `#<spec>` to `.scratch/<feature>/issues/NN-slug.md`, numbered by issue order;
- rewrites `.scratch/README.md`.

It never touches `reviews/` or `notes/`. To give a new feature a short folder name, add it to `FEATURE_DIRS` in the script; otherwise the folder is named after the spec title.
