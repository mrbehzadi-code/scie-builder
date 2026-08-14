# SCIE Builder

Autonomous Software Engineering Agent for the Social Capital Intelligence Ecosystem.

Status: In Development
Version: 0.1.0

## User-facing dashboard

The product dashboard is separate from the development checkpoint. It is served from the local SCIE data outputs and is designed to become the main interface for exploring discovered people and capacities.

Run from the repository root:

```bash
python web/server.py
```

Then open:

`http://127.0.0.1:8000/dashboard`

The dashboard currently exposes:

- discovery and entity counts
- academic candidate count
- searchable discovered people/candidates
- pipeline status

When output files are absent, the dashboard shows an empty state rather than fabricated data.
