const STORAGE_KEY = "aapi-ai-heritage-showcase";

const seedEntries = [
  {
    id: "seed-proverb-grandmother",
    title: "A proverb from my grandmother",
    story: "A family saying about patience is translated, explained, and paired with reflection prompts for younger members learning the language.",
    format: "Proverb",
    heritage: "Family wisdom",
    resource: "",
    author: "AAPI ERG",
    aiUse: "Translated",
    applause: 14,
    featured: true,
    createdAt: "2026-05-01T04:20:00.000Z"
  },
  {
    id: "seed-artwork-festival",
    title: "Festival colors reimagined",
    story: "A member shares AI-assisted artwork inspired by textile patterns, dance, flowers, and the feeling of gathering across generations.",
    format: "Artwork",
    heritage: "Celebration",
    resource: "assets/aapi-ai-showcase.png",
    author: "Design circle",
    aiUse: "Created",
    applause: 11,
    featured: false,
    createdAt: "2026-05-01T04:24:00.000Z"
  },
  {
    id: "seed-document-interview",
    title: "Heritage interview guide",
    story: "A simple document members can use to interview elders about migration, food, language, music, and community memories.",
    format: "Document",
    heritage: "Oral history",
    resource: "",
    author: "Story team",
    aiUse: "Archived",
    applause: 8,
    featured: false,
    createdAt: "2026-05-01T04:28:00.000Z"
  },
  {
    id: "seed-artwork-calligraphy",
    title: "Calligraphy meets circuit patterns",
    story: "An artwork concept blending brush lettering, textile borders, and circuit lines to show how heritage and technology can sit side by side.",
    format: "Artwork",
    heritage: "Visual arts",
    resource: "",
    author: "Creative guild",
    aiUse: "Created",
    applause: 10,
    featured: false,
    createdAt: "2026-05-01T04:32:00.000Z"
  },
  {
    id: "seed-story-lunchbox",
    title: "The lunchbox story",
    story: "A member shares a childhood memory about packed lunches, identity, and learning to feel proud of food that carried home into school.",
    format: "Story",
    heritage: "Food memory",
    resource: "",
    author: "Member story circle",
    aiUse: "Explained",
    applause: 13,
    featured: true,
    createdAt: "2026-05-01T04:36:00.000Z"
  },
  {
    id: "seed-story-name",
    title: "The meaning of my name",
    story: "A short reflection on name pronunciation, family hopes, and how AI could help teammates learn the meaning behind names with care.",
    format: "Story",
    heritage: "Language and identity",
    resource: "",
    author: "ERG member",
    aiUse: "Archived",
    applause: 9,
    featured: false,
    createdAt: "2026-05-01T04:40:00.000Z"
  },
  {
    id: "seed-proverb-river",
    title: "Many streams make a river",
    story: "A proverb about collective effort is translated into plain language and turned into a discussion prompt about community impact.",
    format: "Proverb",
    heritage: "Collective care",
    resource: "",
    author: "Language table",
    aiUse: "Translated",
    applause: 7,
    featured: false,
    createdAt: "2026-05-01T04:44:00.000Z"
  },
  {
    id: "seed-tradition-new-year",
    title: "New year blessing wall",
    story: "Members contribute wishes, symbols, and traditions from different new year celebrations, then AI helps group themes across cultures.",
    format: "Tradition",
    heritage: "Seasonal celebration",
    resource: "",
    author: "Culture committee",
    aiUse: "Explained",
    applause: 12,
    featured: false,
    createdAt: "2026-05-01T04:48:00.000Z"
  },
  {
    id: "seed-tradition-tea",
    title: "Tea as welcome",
    story: "A sharing about tea rituals, hospitality, and the small gestures that make guests feel cared for across generations.",
    format: "Tradition",
    heritage: "Hospitality",
    resource: "",
    author: "Community host team",
    aiUse: "Archived",
    applause: 6,
    featured: false,
    createdAt: "2026-05-01T04:52:00.000Z"
  },
  {
    id: "seed-document-recipe",
    title: "Family recipe preservation sheet",
    story: "A template for capturing ingredients, substitutions, origin stories, and voice notes from relatives before recipes are lost.",
    format: "Document",
    heritage: "Food archive",
    resource: "",
    author: "Archive team",
    aiUse: "Archived",
    applause: 10,
    featured: false,
    createdAt: "2026-05-01T04:56:00.000Z"
  },
  {
    id: "seed-ai-demo-proverb",
    title: "Live proverb translator",
    story: "Members submit a proverb and see AI translate it, explain cultural context, and suggest a respectful workplace reflection.",
    format: "AI Demo",
    heritage: "Language learning",
    resource: "",
    author: "Demo team",
    aiUse: "Translated",
    applause: 15,
    featured: true,
    createdAt: "2026-05-01T05:00:00.000Z"
  },
  {
    id: "seed-ai-demo-story",
    title: "Story-to-STEM lesson builder",
    story: "A cultural story becomes a short STEM learning activity, connecting heritage narratives to curiosity, design, and experimentation.",
    format: "AI Demo",
    heritage: "Education",
    resource: "",
    author: "Learning pod",
    aiUse: "Created",
    applause: 11,
    featured: false,
    createdAt: "2026-05-01T05:04:00.000Z"
  }
];

const formatIcons = {
  Artwork: "A",
  Story: "S",
  Proverb: "P",
  Tradition: "T",
  Document: "D",
  "AI Demo": "AI"
};

let entries = loadEntries();
let activeFilter = "All";

const form = document.querySelector("#showcaseForm");
const grid = document.querySelector("#showcaseGrid");
const template = document.querySelector("#showcaseTemplate");
const emptyState = document.querySelector("#emptyState");
const entryCount = document.querySelector("#entryCount");
const applauseCount = document.querySelector("#applauseCount");
const formatCount = document.querySelector("#formatCount");
const filters = document.querySelector("#filters");
const exportButton = document.querySelector("#exportButton");
const clearButton = document.querySelector("#clearButton");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const entry = {
    id: createId(),
    title: formData.get("title").trim(),
    story: formData.get("story").trim(),
    format: formData.get("format"),
    heritage: formData.get("heritage").trim() || "Shared heritage",
    resource: formData.get("resource").trim(),
    author: formData.get("author").trim() || "Anonymous",
    aiUse: formData.get("aiUse"),
    applause: 0,
    featured: false,
    createdAt: new Date().toISOString()
  };

  entries = [entry, ...entries];
  saveEntries();
  form.reset();
  form.querySelector('input[name="aiUse"][value="Translated"]').checked = true;
  activeFilter = "All";
  updateFilterButtons();
  render();
});

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  updateFilterButtons();
  render();
});

exportButton.addEventListener("click", () => {
  const csv = toCsv(entries);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aapi-ai-heritage-showcase.csv";
  link.click();
  URL.revokeObjectURL(url);
});

clearButton.addEventListener("click", () => {
  const shouldClear = window.confirm("Clear locally saved showcase entries and restore the starter examples?");
  if (!shouldClear) return;
  entries = [...seedEntries];
  saveEntries();
  activeFilter = "All";
  updateFilterButtons();
  render();
});

function loadEntries() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [...seedEntries];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? mergeSeedEntries(parsed) : [...seedEntries];
  } catch {
    return [...seedEntries];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mergeSeedEntries(storedEntries) {
  const existingIds = new Set(storedEntries.map((entry) => entry.id));
  const missingSeeds = seedEntries.filter((entry) => !existingIds.has(entry.id));
  return [...storedEntries, ...missingSeeds];
}

function render() {
  grid.innerHTML = "";
  const visibleEntries = entries
    .filter((entry) => activeFilter === "All" || entry.format === activeFilter)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.applause - a.applause || new Date(b.createdAt) - new Date(a.createdAt));

  visibleEntries.forEach((entry) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.classList.toggle("is-pinned", entry.featured);

    const visual = card.querySelector(".showcase-card__visual");
    const image = card.querySelector("img");
    const formatIcon = card.querySelector(".format-icon");
    const tag = card.querySelector(".tag");
    const resource = card.querySelector(".resource-link");

    formatIcon.textContent = formatIcons[entry.format] || "SH";
    tag.textContent = entry.format;
    tag.dataset.category = entry.format;
    card.querySelector("h3").textContent = entry.title;
    card.querySelector(".idea-copy").textContent = entry.story;
    card.querySelector(".author").textContent = `${entry.author} · ${entry.heritage}`;
    card.querySelector(".stage").textContent = entry.aiUse;
    card.querySelector(".vote-button span").textContent = `${entry.applause} ${entry.applause === 1 ? "applause" : "applause"}`;

    if (isImageResource(entry.resource)) {
      image.src = entry.resource;
      image.alt = entry.title;
      visual.classList.add("has-image");
    }

    if (entry.resource) {
      resource.href = entry.resource;
      resource.classList.add("is-visible");
    }

    const featureButton = card.querySelector(".pin-button");
    featureButton.classList.toggle("is-active", entry.featured);
    featureButton.setAttribute("aria-pressed", String(entry.featured));
    featureButton.addEventListener("click", () => updateEntry(entry.id, { featured: !entry.featured }));

    card.querySelector(".vote-button").addEventListener("click", () => updateEntry(entry.id, { applause: entry.applause + 1 }));
    card.querySelector(".delete-button").addEventListener("click", () => deleteEntry(entry.id));

    grid.append(card);
  });

  emptyState.classList.toggle("is-visible", visibleEntries.length === 0);
  updateStats();
}

function updateEntry(id, patch) {
  entries = entries.map((entry) => entry.id === id ? { ...entry, ...patch } : entry);
  saveEntries();
  render();
}

function deleteEntry(id) {
  entries = entries.filter((entry) => entry.id !== id);
  saveEntries();
  render();
}

function updateStats() {
  entryCount.textContent = entries.length;
  applauseCount.textContent = entries.reduce((total, entry) => total + entry.applause, 0);
  formatCount.textContent = new Set(entries.map((entry) => entry.format)).size;
}

function updateFilterButtons() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === activeFilter);
  });
}

function isImageResource(resource) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(resource);
}

function toCsv(rows) {
  const headers = ["Title", "Sharing", "Format", "Heritage Focus", "Resource", "Shared By", "AI Connection", "Applause", "Featured", "Created At"];
  const values = rows.map((entry) => [
    entry.title,
    entry.story,
    entry.format,
    entry.heritage,
    entry.resource,
    entry.author,
    entry.aiUse,
    entry.applause,
    entry.featured ? "Yes" : "No",
    entry.createdAt
  ]);

  return [headers, ...values]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

render();
