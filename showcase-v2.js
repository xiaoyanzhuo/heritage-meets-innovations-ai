const FAVORITES_KEY = "aapi-ai-heritage-showcase-favorites";
const CLIENT_KEY = "aapi-ai-contributor-id";
const API_BASE = window.location.protocol === "file:" ? "" : "/api";
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
    originalAiMode: "No AI Please",
    originalResultType: "No AI Please",
    originalConnections: [],
    convertedFromNeedsAi: false,
    convertedAt: "",
    updatedAt: "",
    aiText: "",
    readingGuide: "",
    resource: "",
    imagePath: "",
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
    originalAiMode: "With AI",
    originalResultType: "Needs AI Help",
    originalConnections: ["Translate", "Explain"],
    convertedFromNeedsAi: false,
    convertedAt: "",
    updatedAt: "",
    aiText: "Requested AI help: translate the proverb, preserve key cultural terms, explain the meaning, and suggest a reflection prompt for younger family members.",
    readingGuide: "Speaking guide: say the key phrase slowly first, then repeat it in two natural rhythm groups.",
    resource: "",
    imagePath: "",
    imageData: "",
    applause: 16,
    featured: true,
    createdAt: "2026-05-01T05:10:00.000Z"
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
    originalAiMode: "With AI",
    originalResultType: "AI-Assisted Result",
    originalConnections: ["AI Image", "Explain"],
    convertedFromNeedsAi: false,
    convertedAt: "",
    updatedAt: "",
    aiText: "AI-assisted result: an image prompt using member-approved symbols, layered textile borders, warm family portrait composition, and respectful cultural guardrails.",
    readingGuide: "",
    resource: "assets/aapi-ai-showcase.png",
    imagePath: "",
    imageData: "",
    applause: 12,
    featured: false,
    createdAt: "2026-05-01T05:22:00.000Z"
  }
];

let results = [];
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
  const payload = buildSubmissionPayload();
  const method = editingId ? "PATCH" : "POST";
  const path = editingId ? `/showcase/${editingId}` : "/showcase";

  try {
    await apiRequest(path, { method, body: payload });
    results = await loadResults();
    resetFormState();
    activeFilter = "All";
    updateFilterButtons();
    render();
  } catch (error) {
    window.alert(error.message);
  }
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

clearButton.addEventListener("click", async () => {
  const adminKey = window.prompt("Admin key required to restore the shared showcase.");
  if (!adminKey) return;
  try {
    results = await apiRequest("/showcase/reset", { method: "POST", adminKey });
    activeFilter = "All";
    updateFilterButtons();
    render();
  } catch (error) {
    window.alert(error.message);
  }
});

function buildSubmissionPayload() {
  const formData = new FormData(form);
  const aiMode = formData.get("aiMode");
  const isNoAi = aiMode === "No AI Please";
  const resultType = isNoAi ? "No AI Please" : formData.get("aiStatus");
  const connections = isNoAi ? [] : normalizeConnections(formData.getAll("connections"));
  const existingResult = editingId ? results.find((entry) => entry.id === editingId) : null;

  formData.set("aiMode", aiMode);
  formData.set("resultType", resultType);
  formData.delete("aiStatus");
  formData.delete("connections");
  connections.forEach((connection) => formData.append("connections", connection));

  if (isNoAi) {
    formData.set("aiText", "");
  } else if (!formData.get("aiText").trim()) {
    formData.set("aiText", buildOutput(resultType, connections, formData.get("source").trim()));
  }

  if (existingResult) {
    formData.set("originalAiMode", existingResult.originalAiMode || existingResult.aiMode || aiMode);
    formData.set("originalResultType", existingResult.originalResultType || existingResult.resultType || resultType);
    (existingResult.originalConnections || existingResult.connections || connections).forEach((connection) => {
      formData.append("originalConnections", connection);
    });
    formData.set("convertedFromNeedsAi", String(Boolean(existingResult.convertedFromNeedsAi || ((existingResult.originalResultType || existingResult.resultType) === "Needs AI Help" && resultType === "AI-Assisted Result"))));
    formData.set("convertedAt", existingResult.convertedAt || "");
    formData.set("createdAt", existingResult.createdAt);
    formData.set("applause", String(existingResult.applause || 0));
    formData.set("featured", String(Boolean(existingResult.featured)));
    formData.set("imagePath", existingResult.imagePath || "");
  }

  return formData;
}

async function loadResults() {
  if (!API_BASE) return [...seedResults];
  try {
    const loadedResults = await apiRequest("/showcase");
    return Array.isArray(loadedResults) ? normalizeResults(loadedResults) : [...seedResults];
  } catch (error) {
    console.warn(error);
    return [...seedResults];
  }
}

async function apiRequest(path, options = {}) {
  const { adminKey, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  headers.set("X-AAPIN-Client", getClientId());
  if (adminKey) headers.set("X-AAPIN-Admin-Key", adminKey);
  const response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  if (!response.ok) {
    let message = "The live showcase could not complete that request.";
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

function getClientId() {
  let clientId = localStorage.getItem(CLIENT_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, clientId);
  }
  return clientId;
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
  return storedResults.map((entry) => {
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
      imagePath: entry.imagePath || "",
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

function render() {
  grid.innerHTML = "";
  const visibleResults = results
    .filter(matchesFilter)
    .sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)) || b.applause - a.applause || new Date(b.createdAt) - new Date(a.createdAt));

  visibleResults.forEach((result) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const isNoAi = result.resultType === "No AI Please";
    const imageSource = result.imagePath || result.imageData || (isImageResource(result.resource) ? result.resource : "");
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

    voteButton.addEventListener("click", () => applaudResult(result.id));
    const editButton = card.querySelector(".edit-button");
    const deleteButton = card.querySelector(".delete-button");
    editButton.classList.toggle("is-hidden", !result.canEdit);
    deleteButton.classList.toggle("is-hidden", !result.canEdit);
    editButton.addEventListener("click", () => startEdit(result.id));
    deleteButton.addEventListener("click", () => deleteResult(result.id));

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

async function applaudResult(id) {
  try {
    const updatedResult = await apiRequest(`/showcase/${id}/applause`, { method: "POST" });
    results = results.map((result) => result.id === id ? normalizeResults([updatedResult])[0] : result);
    render();
  } catch (error) {
    window.alert(error.message);
  }
}

async function deleteResult(id) {
  const shouldDelete = window.confirm("Move this submission out of the shared showcase? An admin can recover it if needed.");
  if (!shouldDelete) return;
  try {
    await apiRequest(`/showcase/${id}`, { method: "DELETE" });
    results = results.filter((result) => result.id !== id);
    favoriteIds.delete(id);
    saveFavorites();
    if (editingId === id) resetFormState();
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
  imageCount.textContent = results.filter((result) => result.imagePath || result.imageData || isImageResource(result.resource)).length;
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

function toCsv(rows) {
  const headers = ["Title", "Submission Type", "Heritage Focus", "Originated Culture Or Region", "Member", "Webinar Sharing Consent", "Source", "Original Mode", "Original Status", "Original AI Connections", "Current Mode", "Current Status", "Current AI Connections", "Converted From Needs AI", "Converted At", "Updated At", "AI Text", "How To Speak It", "Resource", "Image Path", "Has Image", "Applause", "Featured", "Created At"];
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
    result.imagePath || "",
    result.imagePath || result.imageData || isImageResource(result.resource) ? "Yes" : "No",
    result.applause,
    result.featured ? "Yes" : "No",
    result.createdAt
  ]);

  return [headers, ...values]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

async function initialize() {
  updateModePanels();
  results = await loadResults();
  render();
}

initialize();
