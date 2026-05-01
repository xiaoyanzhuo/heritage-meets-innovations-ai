# Heritage Meets Innovation: Live Static App

This version keeps the original HTML/CSS/JavaScript experience and adds a small Python + SQLite backend so submissions are shared live across members.

## Run locally

```bash
python3 server.py
```

Open:

```text
http://127.0.0.1:8000/
```

## What the backend stores

- `data/aapin_live.db`: SQLite database for ideas and showcase submissions.
- `uploads/`: member-uploaded images.
- `data/ideas.json` and `data/showcase.json`: starter examples used when the database is first created or reset from the UI.

These runtime files are intentionally ignored by git:

- `data/*.db`
- `data/*.db-shm`
- `data/*.db-wal`
- `uploads/`

## GCP VM deployment shape

For a lightweight internal deployment:

1. Clone the repo on the VM.
2. Run the app with a service manager such as `systemd`.
3. Put Nginx in front of it for HTTPS and internal routing.
4. Back up `data/aapin_live.db` and `uploads/`.

Example service command:

```bash
HOST=127.0.0.1 PORT=8000 python3 /path/to/heritage-meets-innovations-ai/server.py
```

For the expected scale of a few hundred showcase entries and around one hundred ideas, this single-VM SQLite setup should stay quick and simple.
