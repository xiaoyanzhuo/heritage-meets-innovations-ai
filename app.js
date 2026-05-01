const FAVORITES_KEY = "aapi-ai-idea-wall-favorites";
const API_BASE = window.location.protocol === "file:" ? "" : "/api";

const seedIdeas = [
  {
    id: "seed-heritage",
    title: "Heritage language story helper",
    description: "Families submit proverbs, recipes, or elder stories and get bilingual summaries, pronunciation help, and classroom-friendly prompts.",
    category: "Culture & Heritage",
    author: "AAPI ERG",
    stage: "Ready to test",
    votes: 12,
    pinned: true,
    createdAt: "2026-05-01T04:00:00.000Z"
  },
  {
    id: "seed-care",
    title: "Resource navigator for new arrivals",
    description: "A multilingual assistant that explains local services, school forms, health resources, and community events in plain language.",
    category: "Access & Language",
    author: "Community care pod",
    stage: "Needs partners",
    votes: 9,
    pinned: false,
    createdAt: "2026-05-01T04:05:00.000Z"
  },
  {
    id: "seed-business",
    title: "Small business menu and flyer studio",
    description: "Help neighborhood restaurants and shops translate menus, create event flyers, and test social posts while keeping their voice.",
    category: "Small Business",
    author: "ERG member",
    stage: "Spark",
    votes: 7,
    pinned: false,
    createdAt: "2026-05-01T04:10:00.000Z"
  }
];

let ideas = [];
let activeFilter = "All";
let favoriteIds = loadFavorites();

const form = document.querySelector("#ideaForm");
const grid = document.querySelector("#ideaGrid");
const template = document.querySelector("#ideaTemplate");
const emptyState = document.querySelector("#emptyState");
const ideaCount = document.querySelector("#ideaCount");
const voteCount = document.querySelector("#voteCount");
const impactCount = document.querySelector("#impactCount");
const filters = document.querySelector("#filters");
const exportButton = document.querySelector("#exportButton");
const clearButton = document.querySelector("#clearButton");
const favoritesList = document.querySelector("#favoritesList");
const favoritesEmpty = document.querySelector("#favoritesEmpty");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const idea = {
    title: formData.get("title").trim(),
    description: formData.get("description").trim(),
    category: formData.get("category"),
    author: formData.get("author").trim() || "Anonymous",
    stage: formData.get("stage")
  };

  try {
    await apiRequest("/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idea)
    });
    ideas = await loadIdeas();
    form.reset();
    form.querySelector('input[name="stage"][value="Spark"]').checked = true;
    activeFilter = "All";
    updateFilterButtons();
    render();
  } catch (error) {
    window.alert(error.message);
  }
});

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  updateFilterButtons();
  render();
});

exportButton.addEventListener("click", () => {
  const csv = toCsv(ideas);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aapi-ai-idea-wall.csv";
  link.click();
  URL.revokeObjectURL(url);
});

clearButton.addEventListener("click", async () => {
  const shouldClear = window.confirm("Restore the shared idea wall to starter examples? This affects everyone using the live site.");
  if (!shouldClear) return;
  try {
    ideas = await apiRequest("/ideas/reset", { method: "POST" });
    activeFilter = "All";
    updateFilterButtons();
    render();
  } catch (error) {
    window.alert(error.message);
  }
});

async function loadIdeas() {
  if (!API_BASE) return [...seedIdeas];
  try {
    const loadedIdeas = await apiRequest("/ideas");
    return Array.isArray(loadedIdeas) ? loadedIdeas : [...seedIdeas];
  } catch (error) {
    console.warn(error);
    return [...seedIdeas];
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    let message = "The live idea wall could not complete that request.";
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      // Keep the fallback message.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds]));
}

function render() {
  grid.innerHTML = "";
  const visibleIdeas = ideas
    .filter((idea) => activeFilter === "All" || idea.category === activeFilter)
    .sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)) || b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt));

  visibleIdeas.forEach((idea) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.classList.toggle("is-pinned", favoriteIds.has(idea.id));
    card.querySelector(".tag").textContent = idea.category;
    card.querySelector(".tag").dataset.category = idea.category;
    card.querySelector("h3").textContent = idea.title;
    card.querySelector(".idea-copy").textContent = idea.description;
    card.querySelector(".author").textContent = idea.author;
    card.querySelector(".stage").textContent = idea.stage;
    const voteButton = card.querySelector(".vote-button");
    voteButton.querySelector("span").textContent = `${idea.votes} ${idea.votes === 1 ? "vote" : "votes"}`;

    const pinButton = card.querySelector(".pin-button");
    const isFavorite = favoriteIds.has(idea.id);
    pinButton.classList.toggle("is-active", isFavorite);
    pinButton.setAttribute("aria-pressed", String(isFavorite));
    pinButton.addEventListener("click", () => toggleFavorite(idea.id));

    voteButton.addEventListener("click", () => voteIdea(idea.id));
    card.querySelector(".delete-button").addEventListener("click", () => deleteIdea(idea.id));

    grid.append(card);
  });

  emptyState.classList.toggle("is-visible", visibleIdeas.length === 0);
  updateStats();
  renderFavorites();
}

async function voteIdea(id) {
  try {
    const updatedIdea = await apiRequest(`/ideas/${id}/vote`, { method: "POST" });
    ideas = ideas.map((idea) => idea.id === id ? updatedIdea : idea);
    render();
  } catch (error) {
    window.alert(error.message);
  }
}

async function deleteIdea(id) {
  const shouldDelete = window.confirm("Remove this idea from the shared wall?");
  if (!shouldDelete) return;
  try {
    await apiRequest(`/ideas/${id}`, { method: "DELETE" });
    ideas = ideas.filter((idea) => idea.id !== id);
    favoriteIds.delete(id);
    saveFavorites();
    render();
  } catch (error) {
    window.alert(error.message);
  }
}

function toggleFavorite(id) {
  if (favoriteIds.has(id)) {
    favoriteIds.delete(id);
  } else {
    favoriteIds.add(id);
  }
  saveFavorites();
  render();
}

function updateStats() {
  ideaCount.textContent = ideas.length;
  voteCount.textContent = ideas.reduce((total, idea) => total + idea.votes, 0);
  impactCount.textContent = new Set(ideas.map((idea) => idea.category)).size;
}

function renderFavorites() {
  favoritesList.innerHTML = "";
  const favorites = ideas.filter((idea) => favoriteIds.has(idea.id));
  favoritesEmpty.classList.toggle("is-hidden", favorites.length > 0);

  favorites.forEach((idea) => {
    const chip = document.createElement("span");
    chip.className = "favorite-chip";
    chip.textContent = idea.title;
    favoritesList.append(chip);
  });
}

function updateFilterButtons() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === activeFilter);
  });
}

function toCsv(rows) {
  const headers = ["Title", "Description", "Impact Area", "Submitted By", "Stage", "Votes", "Pinned", "Created At"];
  const values = rows.map((idea) => [
    idea.title,
    idea.description,
    idea.category,
    idea.author,
    idea.stage,
    idea.votes,
    favoriteIds.has(idea.id) ? "Saved by this browser" : "",
    idea.createdAt
  ]);

  return [headers, ...values]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

async function initialize() {
  ideas = await loadIdeas();
  render();
}

initialize();
