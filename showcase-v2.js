const STORAGE_KEY = "aapi-ai-heritage-results-v2";
const FAVORITES_KEY = "aapi-ai-heritage-showcase-favorites";
const DEPRECATED_SEED_IDS = new Set(["v2-seed-video-story", "v2-seed-animation-tradition", "v2-seed-pronunciation-name", "v2-seed-source-only-legacy"]);
const AI_CONNECTIONS = ["Translate", "Explain", "AI Image"];
const SHARE_TYPES = new Set(["No AI Please", "Needs AI Help", "AI-Assisted Result"]);
const SHARE_LABELS = {
  "No AI Please": "No AI Please",
  "Needs AI Help": "Needs AI",
  "AI-Assisted Result": "AI-Assisted"
};

const seedResults = [
  {
    id: "v2-seed-no-ai-legacy",
    title: "Why we keep this story unchanged",
    category: "Story",
    heritage: "Family legacy",
    originCulture: "AAPI diaspora",
    author: "Member reflection",
    webinarConsent: "Maybe",
    source: "A member shares a family migration story and asks that it be heard in their own words before any AI transformation is considered.",
    aiMode: "No AI Please",
    resultType: "No AI Please",
    connections: [],
    aiText: "",
    readingGuide: "",
    resource: "",
    imageData: "",
    applause: 18,
    featured: true,
    createdAt: "2026-05-01T05:06:00.000Z"
  },
  {
    id: "v2-seed-ai-help-proverb",
    title: "Grandmother's patience proverb",
    category: "Proverb",
    heritage: "Family wisdom",
    originCulture: "East Asian family tradition",
    author: "Language table",
    webinarConsent: "Yes",
    source: "A short family proverb about how patient work turns into lasting harvest.",
    aiMode: "With AI",
    resultType: "Needs AI Help",
    connections: ["Translate", "Explain"],
    aiText: "Requested AI help: translate the proverb, preserve key cultural terms, explain the meaning, and suggest a reflection prompt for younger family members.",
    readingGuide: "Speaking guide: say the key phrase slowly first, then repeat it in two natural rhythm groups.",
    resource: "",
    imageData: "",
    applause: 16,
    featured: true,
    createdAt: "2026-05-01T05:10:00.000Z"
  },
  {
    id: "v2-seed-ai-assisted-festival",
    title: "Lantern festival memory",
    category: "Festival",
    heritage: "Seasonal celebration",
    originCulture: "Chinese diaspora",
    author: "ERG member",
    webinarConsent: "Yes",
    source: "A childhood memory of lanterns, riddles, family walks, and sweets shared after dinner.",
    aiMode: "With AI",
    resultType: "AI-Assisted Result",
    connections: ["Explain"],
    aiText: "AI-assisted result: a concise cultural explainer connecting light, reunion, riddles, and shared sweets for teammates who may be new to the festival.",
    readingGuide: "",
    resource: "",
    imageData: "",
    applause: 13,
    featured: false,
    createdAt: "2026-05-01T05:14:00.000Z"
  },
  {
    id: "v2-seed-ai-help-recipe",
    title: "Auntie's festival noodles",
    category: "Recipe",
    heritage: "Food archive",
    originCulture: "South Asian family tradition",
    author: "Recipe circle",
    webinarConsent: "Maybe",
    source: "A recipe remembered by taste: wheat noodles, scallions, sesame oil, family shortcuts, and the story of when it is served.",
    aiMode: "With AI",
    resultType: "Needs AI Help",
    connections: ["Explain"],
    aiText: "Requested AI help: organize this memory into a recipe card with ingredients, approximate measurements, substitutions, serving occasion, and family notes.",
    readingGuide: "",
    resource: "",
    imageData: "",
    applause: 15,
    featured: false,
    createdAt: "2026-05-01T05:18:00.000Z"
  },
  {
    id: "v2-seed-ai-image-art",
    title: "Textile pattern portrait",
    category: "Art",
    heritage: "Visual arts",
    originCulture: "Pacific and Southeast Asian inspired",
    author: "Creative guild",
    webinarConsent: "Yes",
    source: "A member describes fabric borders, mountain colors, jasmine flowers, and a portrait of three generations.",
    aiMode: "With AI",
    resultType: "AI-Assisted Result",
    connections: ["AI Image", "Explain"],
    aiText: "AI-assisted result: an image prompt using member-approved symbols, layered textile borders, warm family portrait composition, and respectful cultural guardrails.",
    readingGuide: "",
    resource: "assets/aapi-ai-showcase.png",
    imageData: "",
    applause: 12,
    featured: false,
    createdAt: "2026-05-01T05:22:00.000Z"
  },
  {
    id: "v2-seed-name-translation",
    title: "The meaning of my name",
    category: "Memory",
    heritage: "Language and identity",
    originCulture: "Multilingual AAPI identity",
    author: "ERG member",
    webinarConsent: "Maybe",
    source: "A member shares the meaning of their name and the parts coworkers often mispronounce.",
    aiMode: "With AI",
    resultType: "AI-Assisted Result",
    connections: ["Translate"],
    aiText: "AI-assisted result: an explanation of the name's meaning, original spelling, and a respectful note to ask the person how they prefer to say it.",
    readingGuide: "Mai-LIN, emphasis on the second syllable. Practice slowly, then at conversational speed.",
    resource: "",
    imageData: "",
    applause: 10,
    featured: false,
    createdAt: "2026-05-01T05:26:00.000Z"
  }
];

let results = loadResults();
let activeFilter = "All";
let editingId = null;
let favoriteIds = loadFavorites();

const form = document.querySelector("#studioForm");
const grid = document.querySelector("#resultsGrid");
const template = document.querySelector("#resultTemplate");
const emptyState = document.querySelector("#emptyState");
const submissionCount = document.querySelector("#submissionCount");
const resultCount = document.querySelector("#resultCount");
const imageCount = document.querySelector("#imageCount");
const filters = document.querySelector("#filters");
const exportButton = document.querySelector("#exportButton");
const clearButton = document.querySelector("#clearButton");
const submitLabel = document.querySelector("#submitLabel");
const cancelEditButton = document.querySelector("#cancelEditButton");
const favoritesList = document.querySelector("#favoritesList");
const favoritesEmpty = document.querySelector("#favoritesEmpty");

form.addEventListener("change", (event) => {
  if (event.target.name === "aiMode") updateModePanels();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const aiMode = formData.get("aiMode");
  const isNoAi = aiMode === "No AI Please";
  const source = formData.get("source").trim();
  const aiText = formData.get("aiText").trim();
  const readingGuide = formData.get("readingGuide").trim();
  const imageFile = formData.get("imageFile");
  const imageData = imageFile && imageFile.size ? await fileToDataUrl(imageFile) : "";
  const connections = isNoAi ? [] : normalizeConnections(formData.getAll("connections"));
  const resultType = isNoAi ? "No AI Please" : formData.get("aiStatus");

  const existingResult = editingId ? results.find((entry) => entry.id === editingId) : null;
  const now = new Date().toISOString();
  const originalAiMode = existingResult?.originalAiMode || existingResult?.aiMode || aiMode;
  const originalResultType = existingResult?.originalResultType || existingResult?.resultType || resultType;
  const originalConnections = existingResult?.originalConnections || existingResult?.connections || connections;
  const convertedFromNeedsAi = Boolean(existingResult?.convertedFromNeedsAi || (originalResultType === "Needs AI Help" && resultType === "AI-Assisted Result"));
  const result = {
    id: editingId || crypto.randomUUID(),
    title: formData.get("title").trim(),
    category: formData.get("category"),
    heritage: formData.get("heritage").trim() || "Shared heritage",
    originCulture: formData.get("originCulture").trim() || "Not specified",
    author: formData.get("author").trim() || "Anonymous",
    webinarConsent: formData.get("webinarConsent"),
    source,
    aiMode,
    resultType,
    connections,
    originalAiMode,
    originalResultType,
    originalConnections,
    convertedFromNeedsAi,
    convertedAt: existingResult?.convertedAt || (convertedFromNeedsAi ? now : ""),
    updatedAt: editingId ? now : existingResult?.updatedAt || "",
    aiText: isNoAi ? "" : aiText || buildOutput(resultType, connections, source),
    readingGuide,
    resource: formData.get("resource").trim(),
    imageData: imageData || existingResult?.imageData || "",
    applause: existingResult?.applause || 0,
    featured: existingResult?.featured || false,
    createdAt: existingResult?.createdAt || now
  };

  results = editingId ? results.map((entry) => entry.id === editingId ? result : entry) : [result, ...results];
  saveResults();
  resetFormState();
  activeFilter = "All";
  updateFilterButtons();
  render();
});

cancelEditButton.addEventListener("click", resetFormState);

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  updateFilterButtons();
  render();
});

exportButton.addEventListener("click", () => {
  const csv = toCsv(results);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aapi-ai-heritage-showcase.csv";
  link.click();
  URL.revokeObjectURL(url);
});

clearButton.addEventListener("click", () => {
  const shouldClear = window.confirm("Clear locally saved v2 submissions and restore starter examples?");
  if (!shouldClear) return;
  results = [...seedResults];
  saveResults();
  activeFilter = "All";
  updateFilterButtons();
  render();
});

function loadResults() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [...seedResults];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? mergeSeedResults(normalizeResults(parsed)) : [...seedResults];
  } catch {
    return [...seedResults];
  }
}

function saveResults() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    window.alert("This browser could not save the image locally. Try using an image link or a smaller image file.");
  }
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

function normalizeResults(storedResults) {
  return storedResults
    .filter((entry) => !DEPRECATED_SEED_IDS.has(entry.id))
    .map((entry) => {
      const normalizedType = normalizeShareType(entry);
      const isNoAi = normalizedType === "No AI Please";
      const connections = isNoAi ? [] : normalizeConnections(entry.connections?.length ? entry.connections : inferConnections(entry.resultType));
      return {
        ...entry,
        aiMode: isNoAi ? "No AI Please" : "With AI",
        resultType: normalizedType,
        connections: isNoAi ? [] : connections,
        originCulture: entry.originCulture || entry.heritage || "Not specified",
        webinarConsent: entry.webinarConsent || "Maybe",
        originalAiMode: entry.originalAiMode || entry.aiMode || (isNoAi ? "No AI Please" : "With AI"),
        originalResultType: entry.originalResultType || normalizedType,
        originalConnections: entry.originalConnections || (isNoAi ? [] : connections),
        convertedFromNeedsAi: Boolean(entry.convertedFromNeedsAi || ((entry.originalResultType || normalizedType) === "Needs AI Help" && normalizedType === "AI-Assisted Result")),
        convertedAt: entry.convertedAt || "",
        updatedAt: entry.updatedAt || "",
        aiText: isNoAi ? "" : entry.aiText || entry.output || buildOutput(normalizedType, connections, entry.source || ""),
        readingGuide: entry.readingGuide || entry.pronunciation || "",
        imageData: entry.imageData || ""
      };
    });
}

function normalizeShareType(entry) {
  if (SHARE_TYPES.has(entry.resultType)) return entry.resultType;
  if (entry.resultType === "Source Only") return "No AI Please";
  if (entry.resultType === "Create Image") return "AI-Assisted Result";
  if (AI_CONNECTIONS.includes(entry.resultType)) return entry.aiText || entry.output ? "AI-Assisted Result" : "Needs AI Help";
  return entry.aiMode === "No AI Please" ? "No AI Please" : "Needs AI Help";
}

function inferConnections(resultType) {
  if (resultType === "Create Image") return ["AI Image"];
  if (AI_CONNECTIONS.includes(resultType)) return [resultType];
  return ["Translate"];
}

function normalizeConnections(connections) {
  const clean = connections.filter((connection) => AI_CONNECTIONS.includes(connection));
  return clean.length ? [...new Set(clean)] : ["Translate"];
}

function mergeSeedResults(storedResults) {
  const existingIds = new Set(storedResults.map((entry) => entry.id));
  const missingSeeds = seedResults.filter((entry) => !existingIds.has(entry.id));
  return [...storedResults, ...missingSeeds];
}

function render() {
  grid.innerHTML = "";
  const visibleResults = results
    .filter(matchesFilter)
    .sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)) || b.applause - a.applause || new Date(b.createdAt) - new Date(a.createdAt));

  visibleResults.forEach((result) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const isNoAi = result.resultType === "No AI Please";
    const imageSource = result.imageData || (isImageResource(result.resource) ? result.resource : "");
    const output = card.querySelector(".ai-output");

    card.classList.toggle("is-pinned", favoriteIds.has(result.id));
    card.querySelector(".result-type").textContent = SHARE_LABELS[result.resultType] || result.resultType;
    card.querySelector(".result-type").dataset.type = result.resultType;
    card.querySelector(".source-type").textContent = result.category;
    card.querySelector("h3").textContent = result.title;
    card.querySelector(".source-copy").textContent = result.source;
    card.querySelector(".author").textContent = `${result.author} · ${result.originCulture || result.heritage}`;
    card.querySelector(".stage").textContent = result.connections.length ? result.connections.join(" + ") : "Source only";
    const voteButton = card.querySelector(".vote-button");
    voteButton.querySelector("span").textContent = `${result.applause} ${result.applause === 1 ? "applause" : "applause"}`;

    const image = card.querySelector(".result-image");
    if (imageSource) {
      image.src = imageSource;
      image.alt = isNoAi ? `${result.title} source image` : `${result.title} shared image`;
      image.classList.add("is-visible");
    }

    if (isNoAi && imageSource) {
      output.remove();
    } else {
      output.textContent = isNoAi ? "No-AI share: source preserved without AI transformation." : result.aiText;
      output.classList.toggle("is-source-only", isNoAi);
    }

    const reading = card.querySelector(".reading-output");
    if (result.readingGuide) {
      reading.textContent = `How to speak it: ${result.readingGuide}`;
      reading.classList.add("is-visible");
    }

    const resource = card.querySelector(".resource-link");
    if (result.resource) {
      resource.href = result.resource;
      resource.classList.add("is-visible");
    }

    const featureButton = card.querySelector(".pin-button");
    const isFavorite = favoriteIds.has(result.id);
    featureButton.classList.toggle("is-active", isFavorite);
    featureButton.setAttribute("aria-pressed", String(isFavorite));
    featureButton.addEventListener("click", () => toggleFavorite(result.id));

    voteButton.addEventListener("click", () => updateResult(result.id, { applause: result.applause + 1 }));
    card.querySelector(".edit-button").addEventListener("click", () => startEdit(result.id));
    card.querySelector(".delete-button").addEventListener("click", () => deleteResult(result.id));

    grid.append(card);
  });

  emptyState.classList.toggle("is-visible", visibleResults.length === 0);
  updateStats();
  renderFavorites();
}

function matchesFilter(result) {
  if (activeFilter === "All") return true;
  return result.resultType === activeFilter || result.connections.includes(activeFilter);
}

function updateResult(id, patch) {
  results = results.map((result) => result.id === id ? { ...result, ...patch } : result);
  saveResults();
  render();
}

function deleteResult(id) {
  results = results.filter((result) => result.id !== id);
  favoriteIds.delete(id);
  saveFavorites();
  if (editingId === id) resetFormState();
  saveResults();
  render();
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

function renderFavorites() {
  favoritesList.innerHTML = "";
  const favorites = results.filter((result) => favoriteIds.has(result.id));
  favoritesEmpty.classList.toggle("is-hidden", favorites.length > 0);

  favorites.forEach((result) => {
    const chip = document.createElement("span");
    chip.className = "favorite-chip";
    chip.textContent = result.title;
    favoritesList.append(chip);
  });
}

function startEdit(id) {
  const result = results.find((entry) => entry.id === id);
  if (!result) return;

  editingId = id;
  form.elements.namedItem("title").value = result.title;
  form.elements.namedItem("source").value = result.source;
  form.elements.namedItem("category").value = result.category;
  form.elements.namedItem("heritage").value = result.heritage;
  form.elements.namedItem("originCulture").value = result.originCulture || "";
  form.elements.namedItem("author").value = result.author;
  form.elements.namedItem("webinarConsent").value = result.webinarConsent || "Maybe";
  form.elements.namedItem("resource").value = result.resource;
  form.elements.namedItem("aiText").value = result.aiText;
  form.elements.namedItem("readingGuide").value = result.readingGuide;
  form.elements.namedItem("imageFile").value = "";
  form.querySelector(`input[name="aiMode"][value="${result.aiMode}"]`).checked = true;

  if (result.aiMode === "With AI") {
    form.querySelector(`input[name="aiStatus"][value="${result.resultType}"]`).checked = true;
  }

  form.querySelectorAll('input[name="connections"]').forEach((input) => {
    input.checked = result.connections.includes(input.value);
  });

  updateModePanels();
  submitLabel.textContent = "Update submission";
  cancelEditButton.classList.remove("is-hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetFormState() {
  editingId = null;
  form.reset();
  form.querySelector('input[name="aiMode"][value="With AI"]').checked = true;
  form.querySelector('input[name="aiStatus"][value="Needs AI Help"]').checked = true;
  form.querySelector('input[name="connections"][value="Translate"]').checked = true;
  updateModePanels();
  submitLabel.textContent = "Add submission";
  cancelEditButton.classList.add("is-hidden");
}

function updateStats() {
  submissionCount.textContent = results.length;
  resultCount.textContent = results.filter((result) => result.aiMode === "With AI").length;
  imageCount.textContent = results.filter((result) => result.imageData || isImageResource(result.resource)).length;
}

function updateFilterButtons() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === activeFilter);
  });
}

function updateModePanels() {
  const mode = form.querySelector('input[name="aiMode"]:checked').value;
  document.querySelectorAll("[data-mode-panel]").forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.modePanel !== mode);
  });
}

function buildOutput(resultType, connections, source) {
  const excerpt = source.length > 96 ? `${source.slice(0, 96)}...` : source;
  if (resultType === "AI-Assisted Result") {
    return "AI-assisted result shared by member. Add details in the AI text field or attach the image/link.";
  }

  return `Requested AI help: ${connections.join(", ")}. Source focus: ${excerpt}`;
}

function isImageResource(resource) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(resource || "");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function toCsv(rows) {
  const headers = ["Title", "Submission Type", "Heritage Focus", "Originated Culture Or Region", "Member", "Webinar Sharing Consent", "Source", "Original Mode", "Original Status", "Original AI Connections", "Current Mode", "Current Status", "Current AI Connections", "Converted From Needs AI", "Converted At", "Updated At", "AI Text", "How To Speak It", "Resource", "Has Image", "Applause", "Featured", "Created At"];
  const values = rows.map((result) => [
    result.title,
    result.category,
    result.heritage,
    result.originCulture,
    result.author,
    result.webinarConsent,
    result.source,
    result.originalAiMode || result.aiMode,
    result.originalResultType || result.resultType,
    (result.originalConnections || result.connections || []).join(" + "),
    result.aiMode,
    result.resultType,
    result.connections.join(" + "),
    result.convertedFromNeedsAi ? "Yes" : "No",
    result.convertedAt || "",
    result.updatedAt || "",
    result.aiText,
    result.readingGuide,
    result.resource,
    result.imageData || isImageResource(result.resource) ? "Yes" : "No",
    result.applause,
    result.featured ? "Yes" : "No",
    result.createdAt
  ]);

  return [headers, ...values]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

updateModePanels();
render();
