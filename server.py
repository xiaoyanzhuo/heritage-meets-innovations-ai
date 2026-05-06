#!/usr/bin/env python3
"""Lightweight live backend for the AAPIN Heritage Showcase site."""

from __future__ import annotations

import cgi
import json
import mimetypes
import os
import posixpath
import shutil
import sqlite3
import sys
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
UPLOAD_DIR = ROOT / "uploads"
DB_PATH = Path(os.environ.get("AAPIN_DB_PATH", DATA_DIR / "aapin_live.db"))
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
CLIENT_HEADER = "X-AAPIN-Client"
ADMIN_HEADER = "X-AAPIN-Admin-Key"
ADMIN_KEY = os.environ.get("AAPIN_ADMIN_KEY", "aapin-admin")

IDEA_FIELDS = ("id", "title", "description", "category", "author", "stage", "votes", "pinned", "createdAt")
SHOWCASE_FIELDS = (
    "id",
    "title",
    "category",
    "heritage",
    "originCulture",
    "author",
    "webinarConsent",
    "source",
    "aiMode",
    "resultType",
    "connections",
    "originalAiMode",
    "originalResultType",
    "originalConnections",
    "convertedFromNeedsAi",
    "convertedAt",
    "updatedAt",
    "aiText",
    "readingGuide",
    "resource",
    "imagePath",
    "imagePaths",
    "coverImagePath",
    "applause",
    "featured",
    "createdAt",
)


def now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def db() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    UPLOAD_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS ideas (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              category TEXT NOT NULL,
              author TEXT NOT NULL,
              submitter_name TEXT NOT NULL DEFAULT '',
              display_name TEXT NOT NULL DEFAULT '',
              stage TEXT NOT NULL,
              votes INTEGER NOT NULL DEFAULT 0,
              pinned INTEGER NOT NULL DEFAULT 0,
              owner_id TEXT NOT NULL DEFAULT '',
              deleted_at TEXT NOT NULL DEFAULT '',
              deleted_by TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS showcase (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              heritage TEXT NOT NULL,
              origin_culture TEXT NOT NULL,
              author TEXT NOT NULL,
              submitter_name TEXT NOT NULL DEFAULT '',
              display_name TEXT NOT NULL DEFAULT '',
              webinar_consent TEXT NOT NULL,
              source TEXT NOT NULL,
              ai_mode TEXT NOT NULL,
              result_type TEXT NOT NULL,
              connections TEXT NOT NULL,
              original_ai_mode TEXT NOT NULL,
              original_result_type TEXT NOT NULL,
              original_connections TEXT NOT NULL,
              converted_from_needs_ai INTEGER NOT NULL DEFAULT 0,
              converted_at TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL DEFAULT '',
              ai_text TEXT NOT NULL DEFAULT '',
              reading_guide TEXT NOT NULL DEFAULT '',
              resource TEXT NOT NULL DEFAULT '',
              image_path TEXT NOT NULL DEFAULT '',
              image_paths TEXT NOT NULL DEFAULT '[]',
              cover_image_path TEXT NOT NULL DEFAULT '',
              applause INTEGER NOT NULL DEFAULT 0,
              featured INTEGER NOT NULL DEFAULT 0,
              owner_id TEXT NOT NULL DEFAULT '',
              deleted_at TEXT NOT NULL DEFAULT '',
              deleted_by TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS idea_votes (
              idea_id TEXT NOT NULL,
              client_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              PRIMARY KEY (idea_id, client_id)
            );

            CREATE TABLE IF NOT EXISTS showcase_votes (
              showcase_id TEXT NOT NULL,
              client_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              PRIMARY KEY (showcase_id, client_id)
            );
            """
        )
        ensure_column(conn, "ideas", "owner_id", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "ideas", "submitter_name", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "ideas", "display_name", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "ideas", "deleted_at", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "ideas", "deleted_by", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "ideas", "updated_at", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "showcase", "owner_id", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "showcase", "submitter_name", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "showcase", "display_name", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "showcase", "deleted_at", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "showcase", "deleted_by", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "showcase", "image_paths", "TEXT NOT NULL DEFAULT '[]'")
        ensure_column(conn, "showcase", "cover_image_path", "TEXT NOT NULL DEFAULT ''")
        seed_if_empty(conn, "ideas", DATA_DIR / "ideas.json", upsert_idea)
        seed_if_empty(conn, "showcase", DATA_DIR / "showcase.json", upsert_showcase)


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def seed_if_empty(conn: sqlite3.Connection, table: str, path: Path, upsert) -> None:
    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    if count or not path.exists():
        return
    rows = json.loads(path.read_text(encoding="utf-8"))
    for row in rows:
        upsert(conn, row)


def row_to_idea(row: sqlite3.Row, client_id: str = "", include_deleted: bool = False, include_owner: bool = False) -> dict:
    display_name = row["display_name"] or row["author"]
    submitter_name = row["submitter_name"] or row["author"]
    can_edit = bool(row["owner_id"] and row["owner_id"] == client_id)
    idea = {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "category": row["category"],
        "author": display_name,
        "displayName": display_name,
        "stage": row["stage"],
        "votes": row["votes"],
        "pinned": bool(row["pinned"]),
        "canEdit": can_edit,
        "updatedAt": row["updated_at"] if "updated_at" in row.keys() else "",
        "createdAt": row["created_at"],
    }
    if include_deleted:
        idea["deletedAt"] = row["deleted_at"]
        idea["deletedBy"] = row["deleted_by"]
    if include_owner:
        idea["ownerId"] = row["owner_id"]
    if include_owner or can_edit:
        idea["submitterName"] = submitter_name
    return idea


def row_to_showcase(row: sqlite3.Row, client_id: str = "", include_deleted: bool = False, include_owner: bool = False) -> dict:
    display_name = row["display_name"] or row["author"]
    submitter_name = row["submitter_name"] or row["author"]
    can_edit = bool(row["owner_id"] and row["owner_id"] == client_id)
    image_paths = clean_list(row["image_paths"]) if "image_paths" in row.keys() else []
    if row["image_path"] and row["image_path"] not in image_paths:
        image_paths = [row["image_path"], *image_paths]
    cover_image_path = row["cover_image_path"] if "cover_image_path" in row.keys() else ""
    if not cover_image_path and image_paths:
        cover_image_path = image_paths[0]
    item = {
        "id": row["id"],
        "title": row["title"],
        "category": row["category"],
        "heritage": row["heritage"],
        "originCulture": row["origin_culture"],
        "author": display_name,
        "displayName": display_name,
        "webinarConsent": row["webinar_consent"],
        "source": row["source"],
        "aiMode": row["ai_mode"],
        "resultType": row["result_type"],
        "connections": json.loads(row["connections"] or "[]"),
        "originalAiMode": row["original_ai_mode"],
        "originalResultType": row["original_result_type"],
        "originalConnections": json.loads(row["original_connections"] or "[]"),
        "convertedFromNeedsAi": bool(row["converted_from_needs_ai"]),
        "convertedAt": row["converted_at"],
        "updatedAt": row["updated_at"],
        "aiText": row["ai_text"],
        "readingGuide": row["reading_guide"],
        "resource": row["resource"],
        "imagePath": cover_image_path or row["image_path"],
        "imagePaths": image_paths,
        "coverImagePath": cover_image_path,
        "imageData": "",
        "applause": row["applause"],
        "featured": bool(row["featured"]),
        "canEdit": can_edit,
        "createdAt": row["created_at"],
    }
    if include_deleted:
        item["deletedAt"] = row["deleted_at"]
        item["deletedBy"] = row["deleted_by"]
    if include_owner:
        item["ownerId"] = row["owner_id"]
    if include_owner or can_edit:
        item["submitterName"] = submitter_name
    return item


def clean_text(value, fallback: str = "") -> str:
    if value is None:
        return fallback
    return str(value).strip() or fallback


def clean_list(value) -> list[str]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            value = [value]
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def clean_bool(value, fallback: bool = False) -> bool:
    if value is None:
        return fallback
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def normalize_idea(payload: dict, existing: dict | None = None) -> dict:
    existing = existing or {}
    now = now_iso()
    submitter_name = clean_text(payload.get("submitterName"), existing.get("submitterName", ""))
    display_name = clean_text(payload.get("displayName"), existing.get("displayName", ""))
    legacy_author = clean_text(payload.get("author"), existing.get("author", ""))
    if not submitter_name:
        submitter_name = legacy_author
    if not submitter_name:
        raise ValueError("Username or name is required.")
    if not display_name:
        display_name = legacy_author or submitter_name
    return {
        "id": clean_text(payload.get("id"), existing.get("id") or str(uuid.uuid4())),
        "title": clean_text(payload.get("title"), existing.get("title", "")),
        "description": clean_text(payload.get("description"), existing.get("description", "")),
        "category": clean_text(payload.get("category"), existing.get("category", "Culture & Heritage")),
        "author": display_name,
        "submitterName": submitter_name,
        "displayName": display_name,
        "stage": clean_text(payload.get("stage"), existing.get("stage", "Spark")),
        "votes": int(payload.get("votes", existing.get("votes", 0)) or 0),
        "pinned": clean_bool(payload.get("pinned"), existing.get("pinned", False)),
        "ownerId": clean_text(payload.get("ownerId"), existing.get("ownerId", "")),
        "deletedAt": clean_text(payload.get("deletedAt"), existing.get("deletedAt", "")),
        "deletedBy": clean_text(payload.get("deletedBy"), existing.get("deletedBy", "")),
        "updatedAt": clean_text(payload.get("updatedAt"), now if existing else ""),
        "createdAt": clean_text(payload.get("createdAt"), existing.get("createdAt") or now),
    }


def normalize_showcase(payload: dict, existing: dict | None = None) -> dict:
    existing = existing or {}
    now = now_iso()
    ai_mode = clean_text(payload.get("aiMode"), existing.get("aiMode", "With AI"))
    result_type = clean_text(payload.get("resultType"), existing.get("resultType", "Needs AI Help"))
    connections = clean_list(payload.get("connections", existing.get("connections", [])))
    original_result_type = clean_text(payload.get("originalResultType"), existing.get("originalResultType", result_type))
    converted = clean_bool(payload.get("convertedFromNeedsAi"), existing.get("convertedFromNeedsAi", False))
    if original_result_type == "Needs AI Help" and result_type == "AI-Assisted Result":
        converted = True
    existing_images = clean_list(existing.get("imagePaths", []))
    if existing.get("imagePath") and existing["imagePath"] not in existing_images:
        existing_images = [existing["imagePath"], *existing_images]
    incoming_images = clean_list(payload.get("imagePaths", []))
    image_paths = [*existing_images]
    for image_path in incoming_images:
        if image_path not in image_paths:
            image_paths.append(image_path)
    single_image_path = clean_text(payload.get("imagePath"), existing.get("imagePath", ""))
    if single_image_path and single_image_path not in image_paths:
        image_paths.insert(0, single_image_path)
    cover_image_path = clean_text(payload.get("coverImagePath"), existing.get("coverImagePath", ""))
    if not cover_image_path and image_paths:
        cover_image_path = image_paths[0]
    if cover_image_path and cover_image_path not in image_paths:
        image_paths.insert(0, cover_image_path)
    submitter_name = clean_text(payload.get("submitterName"), existing.get("submitterName", ""))
    display_name = clean_text(payload.get("displayName"), existing.get("displayName", ""))
    legacy_author = clean_text(payload.get("author"), existing.get("author", ""))
    if not submitter_name:
        submitter_name = legacy_author
    if not submitter_name:
        raise ValueError("Username or name is required.")
    if not display_name:
        display_name = legacy_author or submitter_name
    origin_culture = clean_text(payload.get("originCulture"), existing.get("originCulture", ""))
    if not origin_culture:
        raise ValueError("Originated culture, country, or region is required.")
    return {
        "id": clean_text(payload.get("id"), existing.get("id") or str(uuid.uuid4())),
        "title": clean_text(payload.get("title"), existing.get("title", "")),
        "category": clean_text(payload.get("category"), existing.get("category", "Story")),
        "heritage": clean_text(payload.get("heritage"), existing.get("heritage", "Shared heritage")),
        "originCulture": origin_culture,
        "author": display_name,
        "submitterName": submitter_name,
        "displayName": display_name,
        "webinarConsent": clean_text(payload.get("webinarConsent"), existing.get("webinarConsent", "Maybe")),
        "source": clean_text(payload.get("source"), existing.get("source", "")),
        "aiMode": ai_mode,
        "resultType": result_type,
        "connections": [] if ai_mode == "No AI Please" else connections,
        "originalAiMode": clean_text(payload.get("originalAiMode"), existing.get("originalAiMode", ai_mode)),
        "originalResultType": original_result_type,
        "originalConnections": clean_list(payload.get("originalConnections", existing.get("originalConnections", connections))),
        "convertedFromNeedsAi": converted,
        "convertedAt": clean_text(payload.get("convertedAt"), existing.get("convertedAt") or (now if converted else "")),
        "updatedAt": clean_text(payload.get("updatedAt"), now if existing else ""),
        "aiText": "" if ai_mode == "No AI Please" else clean_text(payload.get("aiText"), existing.get("aiText", "")),
        "readingGuide": clean_text(payload.get("readingGuide"), existing.get("readingGuide", "")),
        "resource": clean_text(payload.get("resource"), existing.get("resource", "")),
        "imagePath": cover_image_path or (image_paths[0] if image_paths else ""),
        "imagePaths": image_paths,
        "coverImagePath": cover_image_path,
        "applause": int(payload.get("applause", existing.get("applause", 0)) or 0),
        "featured": clean_bool(payload.get("featured"), existing.get("featured", False)),
        "ownerId": clean_text(payload.get("ownerId"), existing.get("ownerId", "")),
        "deletedAt": clean_text(payload.get("deletedAt"), existing.get("deletedAt", "")),
        "deletedBy": clean_text(payload.get("deletedBy"), existing.get("deletedBy", "")),
        "createdAt": clean_text(payload.get("createdAt"), existing.get("createdAt") or now),
    }


def upsert_idea(conn: sqlite3.Connection, payload: dict) -> dict:
    idea = normalize_idea(payload)
    conn.execute(
        """
        INSERT INTO ideas (id, title, description, category, author, submitter_name, display_name, stage, votes, pinned, owner_id, deleted_at, deleted_by, updated_at, created_at)
        VALUES (:id, :title, :description, :category, :author, :submitterName, :displayName, :stage, :votes, :pinned, :ownerId, :deletedAt, :deletedBy, :updatedAt, :createdAt)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title, description=excluded.description, category=excluded.category,
          author=excluded.author, submitter_name=excluded.submitter_name,
          display_name=excluded.display_name, stage=excluded.stage, votes=excluded.votes,
          pinned=excluded.pinned, owner_id=excluded.owner_id, deleted_at=excluded.deleted_at,
          deleted_by=excluded.deleted_by, updated_at=excluded.updated_at, created_at=excluded.created_at
        """,
        {**idea, "pinned": int(idea["pinned"])},
    )
    return idea


def upsert_showcase(conn: sqlite3.Connection, payload: dict, existing: dict | None = None) -> dict:
    item = normalize_showcase(payload, existing)
    conn.execute(
        """
        INSERT INTO showcase (
          id, title, category, heritage, origin_culture, author, submitter_name, display_name, webinar_consent, source,
          ai_mode, result_type, connections, original_ai_mode, original_result_type,
          original_connections, converted_from_needs_ai, converted_at, updated_at,
          ai_text, reading_guide, resource, image_path, image_paths, cover_image_path,
          applause, featured, owner_id, deleted_at, deleted_by, created_at
        )
        VALUES (
          :id, :title, :category, :heritage, :originCulture, :author, :submitterName, :displayName, :webinarConsent, :source,
          :aiMode, :resultType, :connectionsJson, :originalAiMode, :originalResultType,
          :originalConnectionsJson, :convertedFromNeedsAiInt, :convertedAt, :updatedAt,
          :aiText, :readingGuide, :resource, :imagePath, :imagePathsJson, :coverImagePath,
          :applause, :featuredInt, :ownerId, :deletedAt, :deletedBy, :createdAt
        )
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title, category=excluded.category, heritage=excluded.heritage,
          origin_culture=excluded.origin_culture, author=excluded.author,
          submitter_name=excluded.submitter_name, display_name=excluded.display_name,
          webinar_consent=excluded.webinar_consent, source=excluded.source,
          ai_mode=excluded.ai_mode, result_type=excluded.result_type,
          connections=excluded.connections, original_ai_mode=excluded.original_ai_mode,
          original_result_type=excluded.original_result_type,
          original_connections=excluded.original_connections,
          converted_from_needs_ai=excluded.converted_from_needs_ai,
          converted_at=excluded.converted_at, updated_at=excluded.updated_at,
          ai_text=excluded.ai_text, reading_guide=excluded.reading_guide,
          resource=excluded.resource, image_path=excluded.image_path,
          image_paths=excluded.image_paths, cover_image_path=excluded.cover_image_path,
          applause=excluded.applause, featured=excluded.featured, owner_id=excluded.owner_id,
          deleted_at=excluded.deleted_at, deleted_by=excluded.deleted_by, created_at=excluded.created_at
        """,
        {
            **item,
            "connectionsJson": json.dumps(item["connections"]),
            "originalConnectionsJson": json.dumps(item["originalConnections"]),
            "imagePathsJson": json.dumps(item["imagePaths"]),
            "convertedFromNeedsAiInt": int(item["convertedFromNeedsAi"]),
            "featuredInt": int(item["featured"]),
        },
    )
    return item


def save_upload(field) -> str:
    if field is None or not getattr(field, "filename", ""):
        return ""
    content_type = field.type or ""
    if not content_type.startswith("image/"):
        raise ValueError("Only image uploads are supported.")
    ext = Path(field.filename).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"}:
        ext = mimetypes.guess_extension(content_type) or ".img"
    UPLOAD_DIR.mkdir(exist_ok=True)
    target = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
    with target.open("wb") as output:
        shutil.copyfileobj(field.file, output)
    if target.stat().st_size > MAX_UPLOAD_BYTES:
        target.unlink(missing_ok=True)
        raise ValueError("Image upload is too large. Please use an image 5 MB or smaller.")
    return f"uploads/{target.name}"


class Handler(BaseHTTPRequestHandler):
    server_version = "AAPINLive/1.0"

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        try:
            if path == "/api/ideas":
                self.send_json(self.list_ideas())
            elif path == "/api/showcase":
                self.send_json(self.list_showcase())
            elif path == "/api/admin/deleted":
                self.require_admin()
                self.send_json(self.list_deleted())
            elif path.startswith("/api/"):
                self.send_error_json(HTTPStatus.NOT_FOUND, "API route not found.")
            else:
                self.serve_static(path)
        except PermissionError as exc:
            self.send_error_json(HTTPStatus.FORBIDDEN, str(exc))

    def do_HEAD(self) -> None:
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            self.send_response(HTTPStatus.OK)
            self.end_headers()
            return
        self.serve_static(path, head_only=True)

    def do_POST(self) -> None:
        path = urlparse(self.path).path.strip("/").split("/")
        try:
            if path == ["api", "ideas"]:
                self.send_json(self.create_idea(), HTTPStatus.CREATED)
            elif path == ["api", "ideas", "reset"]:
                self.send_json(self.reset_table("ideas", DATA_DIR / "ideas.json", upsert_idea))
            elif len(path) == 4 and path[:2] == ["api", "ideas"] and path[3] == "vote":
                self.send_json(self.increment_idea(path[2]))
            elif len(path) == 5 and path[:2] == ["api", "admin"] and path[4] == "recover":
                self.require_admin()
                self.send_json(self.recover_row(path[2], path[3]))
            elif path == ["api", "showcase"]:
                self.send_json(self.create_showcase(), HTTPStatus.CREATED)
            elif path == ["api", "showcase", "reset"]:
                self.send_json(self.reset_table("showcase", DATA_DIR / "showcase.json", upsert_showcase))
            elif len(path) == 4 and path[:2] == ["api", "showcase"] and path[3] == "applause":
                self.send_json(self.increment_showcase(path[2]))
            else:
                self.send_error_json(HTTPStatus.NOT_FOUND, "API route not found.")
        except PermissionError as exc:
            self.send_error_json(HTTPStatus.FORBIDDEN, str(exc))
        except ValueError as exc:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(exc))

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path.strip("/").split("/")
        try:
            if len(path) == 3 and path[:2] == ["api", "ideas"]:
                self.send_json(self.update_idea(path[2]))
            elif len(path) == 3 and path[:2] == ["api", "showcase"]:
                self.send_json(self.update_showcase(path[2]))
            else:
                self.send_error_json(HTTPStatus.NOT_FOUND, "API route not found.")
        except PermissionError as exc:
            self.send_error_json(HTTPStatus.FORBIDDEN, str(exc))
        except ValueError as exc:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(exc))

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path.strip("/").split("/")
        try:
            if len(path) == 3 and path[:2] == ["api", "ideas"]:
                self.soft_delete_row("ideas", path[2])
            elif len(path) == 3 and path[:2] == ["api", "showcase"]:
                self.soft_delete_row("showcase", path[2])
            else:
                self.send_error_json(HTTPStatus.NOT_FOUND, "API route not found.")
        except PermissionError as exc:
            self.send_error_json(HTTPStatus.FORBIDDEN, str(exc))
        except ValueError as exc:
            self.send_error_json(HTTPStatus.BAD_REQUEST, str(exc))

    def parse_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length > MAX_UPLOAD_BYTES:
            raise ValueError("Request is too large.")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8") or "{}")

    def parse_multipart_or_json(self) -> dict:
        content_type = self.headers.get("Content-Type", "")
        if content_type.startswith("multipart/form-data"):
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": self.command})
            payload = {}
            uploaded_images = []
            for key in form.keys():
                field = form[key]
                if isinstance(field, list):
                    if key == "imageFile":
                        for item in field:
                            if item.filename:
                                uploaded_images.append({"filename": item.filename, "path": save_upload(item)})
                    else:
                        payload[key] = [item.value for item in field if not item.filename]
                elif field.filename:
                    if key == "imageFile":
                        uploaded_images.append({"filename": field.filename, "path": save_upload(field)})
                    else:
                        payload[key] = save_upload(field)
                else:
                    payload[key] = field.value
            if payload.get("connections") and isinstance(payload["connections"], str):
                payload["connections"] = [payload["connections"]]
            if uploaded_images:
                cover_name = clean_text(payload.get("coverImageName"))
                payload["imagePaths"] = [item["path"] for item in uploaded_images]
                cover = next((item["path"] for item in uploaded_images if item["filename"] == cover_name), "")
                payload["coverImagePath"] = cover or uploaded_images[0]["path"]
                payload["imagePath"] = payload["coverImagePath"]
            return payload
        return self.parse_json()

    def client_id(self) -> str:
        return clean_text(self.headers.get(CLIENT_HEADER))

    def is_admin(self) -> bool:
        return bool(ADMIN_KEY and self.headers.get(ADMIN_HEADER) == ADMIN_KEY)

    def require_admin(self) -> None:
        if not self.is_admin():
            raise PermissionError("Admin key is required for this action.")

    def require_owner_or_admin(self, existing: dict) -> None:
        if self.is_admin():
            return
        if existing.get("ownerId") and existing["ownerId"] == self.client_id():
            return
        raise PermissionError("Only the original submitter can edit or delete this item.")

    def list_ideas(self) -> list[dict]:
        with db() as conn:
            rows = conn.execute("SELECT * FROM ideas WHERE deleted_at = '' ORDER BY datetime(created_at) DESC").fetchall()
        return [row_to_idea(row, self.client_id(), include_owner=self.is_admin()) for row in rows]

    def list_showcase(self) -> list[dict]:
        with db() as conn:
            rows = conn.execute("SELECT * FROM showcase WHERE deleted_at = '' ORDER BY datetime(created_at) DESC").fetchall()
        return [row_to_showcase(row, self.client_id(), include_owner=self.is_admin()) for row in rows]

    def create_idea(self) -> dict:
        payload = self.parse_json()
        payload["ownerId"] = self.client_id()
        with db() as conn:
            idea = upsert_idea(conn, payload)
        return idea

    def update_idea(self, item_id: str) -> dict:
        payload = self.parse_json()
        with db() as conn:
            existing = self.get_idea(conn, item_id)
            if not existing:
                raise ValueError("Idea not found.")
            self.require_owner_or_admin(existing)
            idea = upsert_idea(conn, {**existing, **payload, "id": item_id, "updatedAt": now_iso()})
        return idea

    def increment_idea(self, item_id: str) -> dict:
        client_id = self.client_id()
        if not client_id:
            raise ValueError("A browser session is required to vote.")
        with db() as conn:
            row = conn.execute("SELECT * FROM ideas WHERE id = ? AND deleted_at = ''", (item_id,)).fetchone()
            if not row:
                raise ValueError("Idea not found.")
            try:
                conn.execute(
                    "INSERT INTO idea_votes (idea_id, client_id, created_at) VALUES (?, ?, ?)",
                    (item_id, client_id, now_iso()),
                )
            except sqlite3.IntegrityError:
                raise ValueError("You've already voted for this idea.")
            conn.execute("UPDATE ideas SET votes = votes + 1 WHERE id = ?", (item_id,))
            row = conn.execute("SELECT * FROM ideas WHERE id = ? AND deleted_at = ''", (item_id,)).fetchone()
            return row_to_idea(row, client_id)

    def create_showcase(self) -> dict:
        payload = self.parse_multipart_or_json()
        payload["ownerId"] = self.client_id()
        with db() as conn:
            item = upsert_showcase(conn, payload)
        return item

    def update_showcase(self, item_id: str) -> dict:
        payload = self.parse_multipart_or_json()
        with db() as conn:
            existing = self.get_showcase(conn, item_id)
            if not existing:
                raise ValueError("Showcase submission not found.")
            self.require_owner_or_admin(existing)
            item = upsert_showcase(conn, {**existing, **payload, "id": item_id}, existing)
        return item

    def increment_showcase(self, item_id: str) -> dict:
        client_id = self.client_id()
        if not client_id:
            raise ValueError("A browser session is required to vote.")
        with db() as conn:
            row = conn.execute("SELECT * FROM showcase WHERE id = ? AND deleted_at = ''", (item_id,)).fetchone()
            if not row:
                raise ValueError("Showcase submission not found.")
            try:
                conn.execute(
                    "INSERT INTO showcase_votes (showcase_id, client_id, created_at) VALUES (?, ?, ?)",
                    (item_id, client_id, now_iso()),
                )
            except sqlite3.IntegrityError:
                raise ValueError("You've already voted for this work.")
            conn.execute("UPDATE showcase SET applause = applause + 1 WHERE id = ?", (item_id,))
            row = conn.execute("SELECT * FROM showcase WHERE id = ? AND deleted_at = ''", (item_id,)).fetchone()
            return row_to_showcase(row, client_id)

    def reset_table(self, table: str, seed_path: Path, upsert) -> list[dict]:
        self.require_admin()
        with db() as conn:
            conn.execute(f"DELETE FROM {table}")
            if table == "ideas":
                conn.execute("DELETE FROM idea_votes")
            elif table == "showcase":
                conn.execute("DELETE FROM showcase_votes")
            rows = json.loads(seed_path.read_text(encoding="utf-8"))
            for row in rows:
                upsert(conn, row)
        return self.list_ideas() if table == "ideas" else self.list_showcase()

    def soft_delete_row(self, table: str, item_id: str) -> None:
        if table not in {"ideas", "showcase"}:
            raise ValueError("Unknown content type.")
        with db() as conn:
            existing = self.get_idea(conn, item_id) if table == "ideas" else self.get_showcase(conn, item_id)
            if not existing:
                raise ValueError("Item not found.")
            self.require_owner_or_admin(existing)
            conn.execute(
                f"UPDATE {table} SET deleted_at = ?, deleted_by = ? WHERE id = ?",
                (now_iso(), "admin" if self.is_admin() else self.client_id(), item_id),
            )
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def list_deleted(self) -> dict:
        with db() as conn:
            ideas = conn.execute("SELECT * FROM ideas WHERE deleted_at != '' ORDER BY datetime(deleted_at) DESC").fetchall()
            showcase = conn.execute("SELECT * FROM showcase WHERE deleted_at != '' ORDER BY datetime(deleted_at) DESC").fetchall()
        return {
            "ideas": [row_to_idea(row, include_deleted=True, include_owner=True) for row in ideas],
            "showcase": [row_to_showcase(row, include_deleted=True, include_owner=True) for row in showcase],
        }

    def recover_row(self, table: str, item_id: str) -> dict:
        if table not in {"ideas", "showcase"}:
            raise ValueError("Unknown content type.")
        with db() as conn:
            conn.execute(f"UPDATE {table} SET deleted_at = '', deleted_by = '' WHERE id = ?", (item_id,))
            row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
            if not row:
                raise ValueError("Item not found.")
        return row_to_idea(row) if table == "ideas" else row_to_showcase(row)

    def get_idea(self, conn: sqlite3.Connection, item_id: str) -> dict | None:
        row = conn.execute("SELECT * FROM ideas WHERE id = ?", (item_id,)).fetchone()
        return row_to_idea(row, include_deleted=True, include_owner=True) if row else None

    def get_showcase(self, conn: sqlite3.Connection, item_id: str) -> dict | None:
        row = conn.execute("SELECT * FROM showcase WHERE id = ?", (item_id,)).fetchone()
        return row_to_showcase(row, include_deleted=True, include_owner=True) if row else None

    def serve_static(self, path: str, head_only: bool = False) -> None:
        safe_path = posixpath.normpath(unquote(path)).lstrip("/")
        if safe_path in {"", "."}:
            safe_path = "heritage-showcase-v2.html"
        file_path = (ROOT / safe_path).resolve()
        if not str(file_path).startswith(str(ROOT)) or not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(file_path.stat().st_size))
        self.end_headers()
        if head_only:
            return
        with file_path.open("rb") as file:
            shutil.copyfileobj(file, self.wfile)

    def send_json(self, payload, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status: HTTPStatus, message: str) -> None:
        self.send_json({"error": message}, status)


def main() -> None:
    init_db()
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "127.0.0.1")
    print(f"Serving AAPIN live site at http://{host}:{port}")
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
