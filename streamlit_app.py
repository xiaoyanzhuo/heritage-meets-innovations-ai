from __future__ import annotations

import csv
import json
import uuid
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

import streamlit as st


APP_DIR = Path(__file__).parent
ASSET_DIR = APP_DIR / "assets"
DATA_DIR = APP_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
IDEAS_FILE = DATA_DIR / "ideas.json"
SHOWCASE_FILE = DATA_DIR / "showcase.json"

AI_CONNECTIONS = ["Translate", "Explain", "AI Image"]
SHARE_LABELS = {
    "No AI Please": "No AI Please",
    "Needs AI Help": "Needs AI",
    "AI-Assisted Result": "AI-Assisted",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_data_dirs() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    UPLOAD_DIR.mkdir(exist_ok=True)


def read_json(path: Path, fallback: list[dict]) -> list[dict]:
    if not path.exists():
        write_json(path, fallback)
        return fallback.copy()
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, list) else fallback.copy()
    except json.JSONDecodeError:
        return fallback.copy()


def write_json(path: Path, data: list[dict]) -> None:
    ensure_data_dirs()
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def save_upload(uploaded_file, prefix: str) -> str:
    if not uploaded_file:
        return ""
    extension = Path(uploaded_file.name).suffix or ".png"
    filename = f"{prefix}-{uuid.uuid4().hex}{extension}"
    target = UPLOAD_DIR / filename
    target.write_bytes(uploaded_file.getbuffer())
    return str(target.relative_to(APP_DIR))


def image_path(relative_or_url: str) -> str | None:
    if not relative_or_url:
        return None
    if relative_or_url.startswith(("http://", "https://")):
        return relative_or_url
    path = APP_DIR / relative_or_url
    return str(path) if path.exists() else None


def seed_ideas() -> list[dict]:
    return [
        {
            "id": "seed-heritage",
            "title": "Heritage language story helper",
            "description": "Families submit proverbs, recipes, or elder stories and get bilingual summaries, pronunciation help, and classroom-friendly prompts.",
            "category": "Culture & Heritage",
            "author": "AAPIN",
            "stage": "Ready to test",
            "votes": 12,
            "createdAt": "2026-05-01T04:00:00+00:00",
        },
        {
            "id": "seed-care",
            "title": "Resource navigator for new arrivals",
            "description": "A multilingual assistant that explains local services, school forms, health resources, and community events in plain language.",
            "category": "Access & Language",
            "author": "Community care pod",
            "stage": "Needs partners",
            "votes": 9,
            "createdAt": "2026-05-01T04:05:00+00:00",
        },
        {
            "id": "seed-business",
            "title": "Small business menu and flyer studio",
            "description": "Help neighborhood restaurants and shops translate menus, create event flyers, and test social posts while keeping their voice.",
            "category": "Small Business",
            "author": "ERG member",
            "stage": "Spark",
            "votes": 7,
            "createdAt": "2026-05-01T04:10:00+00:00",
        },
    ]


def seed_showcase() -> list[dict]:
    return [
        {
            "id": "v2-seed-no-ai-legacy",
            "title": "Why we keep this story unchanged",
            "category": "Story",
            "heritage": "Family legacy",
            "originCulture": "AAPI diaspora",
            "author": "Member reflection",
            "webinarConsent": "Maybe",
            "source": "A member shares a family migration story and asks that it be heard in their own words before any AI transformation is considered.",
            "aiMode": "No AI Please",
            "resultType": "No AI Please",
            "connections": [],
            "originalAiMode": "No AI Please",
            "originalResultType": "No AI Please",
            "originalConnections": [],
            "convertedFromNeedsAi": False,
            "convertedAt": "",
            "updatedAt": "",
            "aiText": "",
            "readingGuide": "",
            "resource": "",
            "imagePath": "",
            "applause": 18,
            "featured": True,
            "createdAt": "2026-05-01T05:06:00+00:00",
        },
        {
            "id": "v2-seed-ai-help-proverb",
            "title": "Grandmother's patience proverb",
            "category": "Proverb",
            "heritage": "Family wisdom",
            "originCulture": "East Asian family tradition",
            "author": "Language table",
            "webinarConsent": "Yes",
            "source": "A short family proverb about how patient work turns into lasting harvest.",
            "aiMode": "With AI",
            "resultType": "Needs AI Help",
            "connections": ["Translate", "Explain"],
            "originalAiMode": "With AI",
            "originalResultType": "Needs AI Help",
            "originalConnections": ["Translate", "Explain"],
            "convertedFromNeedsAi": False,
            "convertedAt": "",
            "updatedAt": "",
            "aiText": "Requested AI help: translate the proverb, preserve key cultural terms, explain the meaning, and suggest a reflection prompt for younger family members.",
            "readingGuide": "Speaking guide: say the key phrase slowly first, then repeat it in two natural rhythm groups.",
            "resource": "",
            "imagePath": "",
            "applause": 16,
            "featured": True,
            "createdAt": "2026-05-01T05:10:00+00:00",
        },
        {
            "id": "v2-seed-ai-image-art",
            "title": "Textile pattern portrait",
            "category": "Art",
            "heritage": "Visual arts",
            "originCulture": "Pacific and Southeast Asian inspired",
            "author": "Creative guild",
            "webinarConsent": "Yes",
            "source": "A member describes fabric borders, mountain colors, jasmine flowers, and a portrait of three generations.",
            "aiMode": "With AI",
            "resultType": "AI-Assisted Result",
            "connections": ["AI Image", "Explain"],
            "originalAiMode": "With AI",
            "originalResultType": "AI-Assisted Result",
            "originalConnections": ["AI Image", "Explain"],
            "convertedFromNeedsAi": False,
            "convertedAt": "",
            "updatedAt": "",
            "aiText": "AI-assisted result: an image prompt using member-approved symbols, layered textile borders, warm family portrait composition, and respectful cultural guardrails.",
            "readingGuide": "",
            "resource": "assets/aapi-ai-showcase.png",
            "imagePath": "",
            "applause": 12,
            "featured": False,
            "createdAt": "2026-05-01T05:22:00+00:00",
        },
    ]


def load_ideas() -> list[dict]:
    return read_json(IDEAS_FILE, seed_ideas())


def save_ideas(ideas: list[dict]) -> None:
    write_json(IDEAS_FILE, ideas)


def load_showcase() -> list[dict]:
    return read_json(SHOWCASE_FILE, seed_showcase())


def save_showcase(items: list[dict]) -> None:
    write_json(SHOWCASE_FILE, items)


def csv_download(rows: list[dict], fieldnames: list[str]) -> str:
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def add_css() -> None:
    st.markdown(
        """
        <style>
        :root {
          --ink: #10224a;
          --muted: #596171;
          --teal: #08788a;
          --plum: #6f2c8f;
          --saffron: #e59a28;
          --leaf: #16834f;
          --clay: #c6542c;
        }
        .stApp {
          background:
            radial-gradient(circle at top left, rgba(229, 154, 40, 0.18), transparent 34rem),
            radial-gradient(circle at bottom right, rgba(8, 120, 138, 0.18), transparent 32rem),
            linear-gradient(135deg, #fff8ec 0%, #fffdf8 48%, #f3fbfb 100%);
          color: var(--ink);
        }
        .block-container {
          max-width: 1180px;
          padding-top: 1.4rem;
        }
        .eyebrow {
          color: var(--clay);
          font-size: .78rem;
          font-weight: 800;
          text-transform: uppercase;
          margin: 0 0 .35rem;
        }
        .hero-title {
          color: var(--ink);
          font-size: clamp(2.35rem, 5.4vw, 4.75rem);
          line-height: .98;
          font-weight: 850;
          margin: 0;
        }
        .lede {
          color: #25375c;
          font-size: 1.06rem;
          line-height: 1.45;
          margin: 1rem 0;
        }
        .metric-card {
          border: 1px solid rgba(16, 34, 74, .16);
          border-radius: 8px;
          background: rgba(255,255,255,.62);
          padding: .65rem .85rem;
          font-weight: 800;
        }
        .card {
          border: 1px solid rgba(16, 34, 74, .16);
          border-radius: 8px;
          background: rgba(255, 253, 248, .95);
          padding: 1rem;
          box-shadow: 0 10px 24px rgba(28, 38, 68, .08);
          min-height: 100%;
        }
        .tag {
          display: inline-flex;
          height: 28px;
          align-items: center;
          border-radius: 999px;
          color: white;
          background: var(--teal);
          padding: 0 .65rem;
          font-size: .76rem;
          font-weight: 850;
          white-space: nowrap;
        }
        .tag.secondary {
          background: rgba(16,34,74,.08);
          color: var(--ink);
        }
        .saved-shelf {
          border: 1px solid rgba(229, 154, 40, .34);
          border-radius: 8px;
          background: rgba(255,253,248,.72);
          padding: .85rem;
          margin: .7rem 0 1rem;
        }
        .chip {
          display: inline-block;
          border: 1px solid rgba(16,34,74,.14);
          border-radius: 999px;
          background: white;
          padding: .35rem .6rem;
          margin: .2rem .25rem .2rem 0;
          font-size: .84rem;
          font-weight: 800;
        }
        .small-muted {
          color: var(--muted);
          font-size: .88rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def hero(image_file: str, title: str, subtitle: str, metrics: list[tuple[str, str]]) -> None:
    left, right = st.columns([0.9, 1.1], vertical_alignment="center")
    with left:
        st.image(str(ASSET_DIR / image_file), use_column_width=True)
    with right:
        st.markdown('<p class="eyebrow">AAPIN Presents</p>', unsafe_allow_html=True)
        st.markdown(f'<h1 class="hero-title">{title}</h1>', unsafe_allow_html=True)
        st.markdown(f'<p class="lede">{subtitle}</p>', unsafe_allow_html=True)
        cols = st.columns(len(metrics))
        for col, (value, label) in zip(cols, metrics):
            col.markdown(f'<div class="metric-card">{value}<br><span class="small-muted">{label}</span></div>', unsafe_allow_html=True)


def init_session() -> None:
    st.session_state.setdefault("saved_ideas", set())
    st.session_state.setdefault("saved_showcase", set())
    st.session_state.setdefault("editing_showcase_id", None)


def render_saved_shelf(title: str, empty: str, items: list[dict], saved_ids: set[str]) -> None:
    saved = [item for item in items if item["id"] in saved_ids]
    st.markdown('<div class="saved-shelf">', unsafe_allow_html=True)
    st.markdown(f'<p class="eyebrow">Saved by you</p><strong>{title}</strong>', unsafe_allow_html=True)
    if not saved:
        st.markdown(f'<p class="small-muted">{empty}</p>', unsafe_allow_html=True)
    else:
        st.markdown("".join(f'<span class="chip">{item["title"]}</span>' for item in saved), unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)


def idea_wall_page() -> None:
    ideas = load_ideas()
    categories = ["All", "Culture & Heritage", "Education", "Community Care", "Small Business", "Access & Language"]
    hero(
        "ai-community-ideas-wall.png",
        "AI for Community Idea Wall",
        "Share practical, culture-rooted ideas for how AI can help our communities learn, connect, preserve heritage, and support one another.",
        [(str(len(ideas)), "ideas"), (str(sum(item.get("votes", 0) for item in ideas)), "votes"), (str(len({item['category'] for item in ideas})), "impact areas")],
    )

    form_col, wall_col = st.columns([0.42, 0.58], gap="large")
    with form_col:
        st.subheader("Submit an idea")
        with st.form("idea_form", clear_on_submit=True):
            title = st.text_input("Idea title", max_chars=72, placeholder="Example: Heritage language story helper")
            description = st.text_area("Your idea", max_chars=340, placeholder="Describe the community need, who it helps, and what AI could do.")
            category = st.selectbox("Impact area", categories[1:])
            author = st.text_input("Submitted by", max_chars=40, placeholder="Name, team, or anonymous")
            stage = st.radio("Stage", ["Spark", "Ready to test", "Needs partners"], horizontal=True)
            if st.form_submit_button("Add to wall", use_container_width=True):
                if title and description:
                    ideas.insert(
                        0,
                        {
                            "id": uuid.uuid4().hex,
                            "title": title,
                            "description": description,
                            "category": category,
                            "author": author or "Anonymous",
                            "stage": stage,
                            "votes": 0,
                            "createdAt": now_iso(),
                        },
                    )
                    save_ideas(ideas)
                    st.rerun()
                st.warning("Please add a title and idea description.")

    with wall_col:
        st.subheader("Community ideas")
        selected = st.radio("Filter ideas", categories, horizontal=True, label_visibility="collapsed")
        filtered = [idea for idea in ideas if selected == "All" or idea["category"] == selected]
        filtered.sort(key=lambda idea: (idea["id"] in st.session_state.saved_ideas, idea.get("votes", 0), idea.get("createdAt", "")), reverse=True)

        render_saved_shelf("My saved ideas", "Tap Save on ideas you want to revisit.", ideas, st.session_state.saved_ideas)
        st.download_button(
            "Export ideas CSV",
            csv_download(ideas, ["title", "description", "category", "author", "stage", "votes", "createdAt"]),
            "aapi-ai-idea-wall.csv",
            "text/csv",
        )

        for idea in filtered:
            with st.container(border=True):
                st.markdown(f'<span class="tag">{idea["category"]}</span> <span class="tag secondary">{idea["stage"]}</span>', unsafe_allow_html=True)
                st.markdown(f"### {idea['title']}")
                st.write(idea["description"])
                st.caption(f"Submitted by {idea['author']}")
                c1, c2, c3 = st.columns([1, 1, 1])
                if c1.button(f"❤ {idea.get('votes', 0)} votes", key=f"vote-{idea['id']}"):
                    idea["votes"] = idea.get("votes", 0) + 1
                    save_ideas(ideas)
                    st.rerun()
                is_saved = idea["id"] in st.session_state.saved_ideas
                if c2.button("Saved" if is_saved else "Save", key=f"save-{idea['id']}"):
                    st.session_state.saved_ideas.symmetric_difference_update({idea["id"]})
                    st.rerun()
                if c3.button("Delete", key=f"delete-{idea['id']}"):
                    ideas = [item for item in ideas if item["id"] != idea["id"]]
                    st.session_state.saved_ideas.discard(idea["id"])
                    save_ideas(ideas)
                    st.rerun()


def default_showcase_form_values(item: dict | None) -> dict:
    return {
        "title": item.get("title", "") if item else "",
        "source": item.get("source", "") if item else "",
        "category": item.get("category", "Story") if item else "Story",
        "heritage": item.get("heritage", "") if item else "",
        "originCulture": item.get("originCulture", "") if item else "",
        "author": item.get("author", "") if item else "",
        "webinarConsent": item.get("webinarConsent", "Yes") if item else "Yes",
        "aiMode": item.get("aiMode", "With AI") if item else "With AI",
        "resultType": item.get("resultType", "Needs AI Help") if item else "Needs AI Help",
        "connections": item.get("connections", ["Translate"]) if item else ["Translate"],
        "aiText": item.get("aiText", "") if item else "",
        "readingGuide": item.get("readingGuide", "") if item else "",
        "resource": item.get("resource", "") if item else "",
    }


def showcase_page() -> None:
    items = load_showcase()
    editing_id = st.session_state.editing_showcase_id
    editing_item = next((item for item in items if item["id"] == editing_id), None)
    defaults = default_showcase_form_values(editing_item)

    hero(
        "aapi-ai-showcase.png",
        "(AI) Heritage Showcase",
        "Members can share heritage source material, ask for AI help, upload their own AI-assisted results, or choose no AI for their submission.",
        [(str(len(items)), "submissions"), (str(sum(1 for item in items if item.get("aiMode") == "With AI")), "with AI path"), (str(sum(1 for item in items if item.get("imagePath") or image_path(item.get("resource", "")))), "images")],
    )

    form_col, gallery_col = st.columns([0.42, 0.58], gap="large")
    with form_col:
        st.subheader("Edit submission" if editing_item else "Member submission")
        with st.form("showcase_form"):
            title = st.text_input("Title", value=defaults["title"], max_chars=78)
            source = st.text_area("Source sharing", value=defaults["source"], max_chars=620)
            category = st.selectbox("Submission type", ["Story", "Proverb", "Tradition", "Art", "Festival", "Recipe", "Memory"], index=["Story", "Proverb", "Tradition", "Art", "Festival", "Recipe", "Memory"].index(defaults["category"]) if defaults["category"] in ["Story", "Proverb", "Tradition", "Art", "Festival", "Recipe", "Memory"] else 0)
            heritage = st.text_input("Heritage focus", value=defaults["heritage"], max_chars=44)
            origin = st.text_input("Originated culture, country, or region", value=defaults["originCulture"], max_chars=116, placeholder="Example: Vietnamese, Chinese, South Asian, Pacific Islander")
            st.caption("Use whatever you prefer: specific culture/country or broader region.")
            author = st.text_input("Member or team", value=defaults["author"], max_chars=42)
            webinar = st.selectbox("Heritage Month webinar sharing", ["Yes", "Maybe", "No"], index=["Yes", "Maybe", "No"].index(defaults["webinarConsent"]) if defaults["webinarConsent"] in ["Yes", "Maybe", "No"] else 0)

            ai_mode = st.radio("Submission mode", ["With AI", "No AI Please"], index=0 if defaults["aiMode"] == "With AI" else 1, horizontal=True)
            ai_status = "No AI Please"
            connections: list[str] = []
            ai_text = ""
            if ai_mode == "With AI":
                ai_status = st.radio("With AI path", ["Needs AI Help", "AI-Assisted Result"], index=0 if defaults["resultType"] == "Needs AI Help" else 1)
                connections = st.multiselect("AI connection types", AI_CONNECTIONS, default=[item for item in defaults["connections"] if item in AI_CONNECTIONS] or ["Translate"])
                ai_text = st.text_area("AI text result", value=defaults["aiText"], max_chars=820)
            else:
                st.info("Share the source in its own voice. Real photos, scanned recipes, family artifacts, or original artwork are welcome here.")

            reading = st.text_area("How to speak it", value=defaults["readingGuide"], max_chars=360)
            upload = st.file_uploader("Upload image", type=["png", "jpg", "jpeg", "webp"])
            resource = st.text_input("Image or document link", value=defaults["resource"])

            submitted = st.form_submit_button("Update submission" if editing_item else "Add submission", use_container_width=True)
            if submitted:
                if not title or not source:
                    st.warning("Please add a title and source sharing.")
                else:
                    existing = editing_item or {}
                    current_id = existing.get("id", uuid.uuid4().hex)
                    original_status = existing.get("originalResultType", existing.get("resultType", ai_status))
                    converted = bool(existing.get("convertedFromNeedsAi") or (original_status == "Needs AI Help" and ai_status == "AI-Assisted Result"))
                    timestamp = now_iso()
                    image_file = save_upload(upload, "showcase") if upload else existing.get("imagePath", "")
                    item = {
                        "id": current_id,
                        "title": title,
                        "category": category,
                        "heritage": heritage or "Shared heritage",
                        "originCulture": origin or "Not specified",
                        "author": author or "Anonymous",
                        "webinarConsent": webinar,
                        "source": source,
                        "aiMode": ai_mode,
                        "resultType": "No AI Please" if ai_mode == "No AI Please" else ai_status,
                        "connections": [] if ai_mode == "No AI Please" else connections or ["Translate"],
                        "originalAiMode": existing.get("originalAiMode", existing.get("aiMode", ai_mode)),
                        "originalResultType": original_status,
                        "originalConnections": existing.get("originalConnections", existing.get("connections", connections)),
                        "convertedFromNeedsAi": converted,
                        "convertedAt": existing.get("convertedAt") or (timestamp if converted else ""),
                        "updatedAt": timestamp if editing_item else "",
                        "aiText": "" if ai_mode == "No AI Please" else ai_text or f"Requested AI help: {', '.join(connections or ['Translate'])}.",
                        "readingGuide": reading,
                        "resource": resource,
                        "imagePath": image_file,
                        "applause": existing.get("applause", 0),
                        "featured": existing.get("featured", False),
                        "createdAt": existing.get("createdAt", timestamp),
                    }
                    items = [item if row["id"] == current_id else row for row in items] if editing_item else [item, *items]
                    save_showcase(items)
                    st.session_state.editing_showcase_id = None
                    st.rerun()

        if editing_item and st.button("Cancel edit", use_container_width=True):
            st.session_state.editing_showcase_id = None
            st.rerun()

    with gallery_col:
        st.subheader("Member shares")
        filter_options = ["All", "No AI Please", "Needs AI Help", "AI-Assisted Result", *AI_CONNECTIONS]
        selected = st.radio("Filter member shares", filter_options, horizontal=True, label_visibility="collapsed")
        filtered = [item for item in items if selected == "All" or item.get("resultType") == selected or selected in item.get("connections", [])]
        filtered.sort(key=lambda item: (item["id"] in st.session_state.saved_showcase, item.get("applause", 0), item.get("createdAt", "")), reverse=True)

        render_saved_shelf("My saved shares", "Tap Save on member shares you want to revisit.", items, st.session_state.saved_showcase)
        export_fields = ["title", "category", "heritage", "originCulture", "author", "webinarConsent", "source", "originalAiMode", "originalResultType", "originalConnections", "aiMode", "resultType", "connections", "convertedFromNeedsAi", "convertedAt", "updatedAt", "aiText", "readingGuide", "resource", "imagePath", "applause", "featured", "createdAt"]
        st.download_button("Export showcase CSV", csv_download(items, export_fields), "aapi-ai-heritage-showcase.csv", "text/csv")

        for item in filtered:
            with st.container(border=True):
                st.markdown(f'<span class="tag">{SHARE_LABELS.get(item["resultType"], item["resultType"])}</span> <span class="tag secondary">{item["category"]}</span>', unsafe_allow_html=True)
                st.markdown(f"### {item['title']}")
                image_src = image_path(item.get("imagePath", "")) or image_path(item.get("resource", ""))
                if image_src:
                    st.image(image_src, use_column_width=True)
                if item.get("aiText"):
                    st.write(item["aiText"])
                elif item["resultType"] == "No AI Please" and not image_src:
                    st.write("No-AI share: source preserved without AI transformation.")
                if item.get("readingGuide"):
                    st.info(f"How to speak it: {item['readingGuide']}")
                with st.expander("Member source"):
                    st.write(item["source"])
                st.caption(f"{item['author']} · {item.get('originCulture') or item.get('heritage')}")
                st.caption("Connections: " + (" + ".join(item.get("connections", [])) or "Source only"))
                c1, c2, c3, c4 = st.columns(4)
                if c1.button(f"❤ {item.get('applause', 0)}", key=f"applause-{item['id']}"):
                    item["applause"] = item.get("applause", 0) + 1
                    save_showcase(items)
                    st.rerun()
                is_saved = item["id"] in st.session_state.saved_showcase
                if c2.button("Saved" if is_saved else "Save", key=f"save-showcase-{item['id']}"):
                    st.session_state.saved_showcase.symmetric_difference_update({item["id"]})
                    st.rerun()
                if c3.button("Edit", key=f"edit-{item['id']}"):
                    st.session_state.editing_showcase_id = item["id"]
                    st.rerun()
                if c4.button("Delete", key=f"delete-showcase-{item['id']}"):
                    items = [row for row in items if row["id"] != item["id"]]
                    st.session_state.saved_showcase.discard(item["id"])
                    save_showcase(items)
                    st.rerun()


def main() -> None:
    st.set_page_config(page_title="AAPIN Heritage Showcase", page_icon="AI", layout="wide")
    ensure_data_dirs()
    init_session()
    add_css()

    page = st.sidebar.radio("AAPIN Presents", ["Heritage Showcase", "Idea Wall"])
    if page == "Heritage Showcase":
        showcase_page()
    else:
        idea_wall_page()


if __name__ == "__main__":
    main()
