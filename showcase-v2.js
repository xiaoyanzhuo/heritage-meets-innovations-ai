const FAVORITES_KEY = "aapi-ai-heritage-showcase-favorites";
const CLIENT_KEY = "aapi-ai-contributor-id";
const API_BASE = window.location.protocol === "file:" ? "" : "/api";
const AI_CONNECTIONS = ["Translate", "Explain", "AI Image"];
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const GALLERY_TEXT_LIMIT = 300;
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
let activeFilters = {
  type: ["All"],
  culture: ["All"],
  mode: ["All"]
};
let editingId = null;
let favoriteIds = loadFavorites();
let currentViewerImages = [];
let currentViewerIndex = 0;
let adminPreviewTargetId = "";

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
const showcaseWorkspace = document.querySelector("#showcaseWorkspace");
const showcaseFullViewButton = document.querySelector("#showcaseFullViewButton");
const showcaseGalleryOnlyButton = document.querySelector("#showcaseGalleryOnlyButton");
const resultViewer = document.querySelector("#resultViewer");
const viewerCloseButton = document.querySelector("#viewerCloseButton");
const viewerImage = document.querySelector("#viewerImage");
const viewerType = document.querySelector("#viewerType");
const viewerCategory = document.querySelector("#viewerCategory");
const viewerTitle = document.querySelector("#viewerTitle");
const viewerMeta = document.querySelector("#viewerMeta");
const viewerAiText = document.querySelector("#viewerAiText");
const viewerReading = document.querySelector("#viewerReading");
const viewerSource = document.querySelector("#viewerSource");
const viewerResource = document.querySelector("#viewerResource");
const viewerPrevButton = document.querySelector("#viewerPrevButton");
const viewerNextButton = document.querySelector("#viewerNextButton");
const viewerThumbs = document.querySelector("#viewerThumbs");
const coverPicker = document.querySelector("#coverPicker");
const coverPickerGrid = document.querySelector("#coverPickerGrid");
const aiTextDetails = document.querySelector("#aiTextDetails");
const showcaseSuccess = document.querySelector("#showcaseSuccess");
const showcaseReturnButton = document.querySelector("#showcaseReturnButton");
const showcaseNewButton = document.querySelector("#showcaseNewButton");
const showcaseGallery = document.querySelector(".results-board");
const submitterNameInput = form.elements.namedItem("submitterName");
const displayNameInput = form.elements.namedItem("displayName");
let lastSyncedDisplayName = "";

form.addEventListener("change", (event) => {
  if (event.target.name === "aiMode") updateModePanels();
  if (event.target.name === "aiStatus" || event.target.name === "connections") updateOptionalFieldState();
  if (event.target.name === "imageFile" && validateImageUploads()) renderCoverPicker();
});

submitterNameInput.addEventListener("input", () => {
  const nextName = submitterNameInput.value;
  if (!displayNameInput.value.trim() || displayNameInput.value === lastSyncedDisplayName) {
    displayNameInput.value = nextName;
    lastSyncedDisplayName = nextName;
  }
});

displayNameInput.addEventListener("input", () => {
  lastSyncedDisplayName = displayNameInput.value === submitterNameInput.value ? displayNameInput.value : "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateImageUploads()) return;
  const updatedId = editingId;
  const payload = buildSubmissionPayload();
  const method = editingId ? "PATCH" : "POST";
  const path = editingId ? `/showcase/${editingId}` : "/showcase";

  try {
    await apiRequest(path, { method, body: payload });
    results = await loadResults();
    resetFormState();
    resetFilters();
    render();
    showShowcaseSuccess();
    if (updatedId) returnToUpdatedSubmission(updatedId);
  } catch (error) {
    window.alert(error.message);
  }
});

form.addEventListener("input", hideShowcaseSuccess);
form.addEventListener("change", hideShowcaseSuccess);
cancelEditButton.addEventListener("click", resetFormState);

showcaseFullViewButton.addEventListener("click", () => setShowcaseView("full"));
showcaseGalleryOnlyButton.addEventListener("click", () => setShowcaseView("gallery"));
showcaseReturnButton.addEventListener("click", () => {
  setShowcaseView("gallery");
  showcaseGallery.scrollIntoView({ behavior: "smooth", block: "start" });
});
showcaseNewButton.addEventListener("click", () => {
  setShowcaseView("full");
  hideShowcaseSuccess();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  form.elements.namedItem("title").focus();
});
viewerCloseButton.addEventListener("click", closeResultViewer);
viewerPrevButton.addEventListener("click", () => showViewerImage(currentViewerIndex - 1));
viewerNextButton.addEventListener("click", () => showViewerImage(currentViewerIndex + 1));
resultViewer.addEventListener("click", (event) => {
  if (event.target === resultViewer) closeResultViewer();
});

filters.addEventListener("change", (event) => {
  const fieldControl = event.target.closest("[data-filter-field]");
  if (!fieldControl) return;
  if (event.target.matches('input[type="checkbox"]')) syncFilterGroupSelection(fieldControl, event.target);
  activeFilters[fieldControl.dataset.filterField] = fieldControl.tagName === "SELECT"
    ? [fieldControl.value || "All"]
    : getSelectedCheckboxValues(fieldControl);
  render();
});

document.addEventListener("click", (event) => {
  document.querySelectorAll(".filter-dropdown[open]").forEach((dropdown) => {
    if (!dropdown.contains(event.target)) dropdown.removeAttribute("open");
  });
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
    resetFilters();
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
  formData.set("heritage", formData.get("category"));
  formData.set("submitterName", String(formData.get("submitterName") || "").trim());
  formData.set("displayName", String(formData.get("displayName") || "").trim() || formData.get("submitterName"));
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
    (existingResult.imagePaths || []).forEach((imagePath) => formData.append("imagePaths", imagePath));
    formData.set("coverImagePath", existingResult.coverImagePath || existingResult.imagePath || "");
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
    clientId = createId();
    localStorage.setItem(CLIENT_KEY, clientId);
  }
  return clientId;
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

function setShowcaseView(view) {
  const isGalleryOnly = view === "gallery";
  showcaseWorkspace.classList.toggle("is-gallery-only", isGalleryOnly);
  showcaseFullViewButton.classList.toggle("is-active", !isGalleryOnly);
  showcaseGalleryOnlyButton.classList.toggle("is-active", isGalleryOnly);
  showcaseFullViewButton.setAttribute("aria-pressed", String(!isGalleryOnly));
  showcaseGalleryOnlyButton.setAttribute("aria-pressed", String(isGalleryOnly));
  localStorage.setItem("aapi-ai-showcase-view", view);
}

function showShowcaseSuccess() {
  showcaseSuccess.classList.remove("is-hidden");
}

function hideShowcaseSuccess() {
  showcaseSuccess.classList.add("is-hidden");
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
      imagePaths: normalizeImagePaths(entry),
      coverImagePath: entry.coverImagePath || entry.imagePath || "",
      imagePath: entry.coverImagePath || entry.imagePath || normalizeImagePaths(entry)[0] || "",
      imageData: entry.imageData || ""
    };
  });
}

function normalizeImagePaths(entry) {
  const paths = Array.isArray(entry.imagePaths) ? [...entry.imagePaths] : [];
  if (entry.imagePath && !paths.includes(entry.imagePath)) paths.unshift(entry.imagePath);
  if (entry.coverImagePath && !paths.includes(entry.coverImagePath)) paths.unshift(entry.coverImagePath);
  return [...new Set(paths.filter(Boolean))];
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

function previewText(text) {
  const clean = text || "";
  if (clean.length <= GALLERY_TEXT_LIMIT) return clean;
  return `${clean.slice(0, GALLERY_TEXT_LIMIT).trimEnd()} >>`;
}

function render() {
  grid.innerHTML = "";
  updateFilterControls();
  const visibleResults = results
    .filter(matchesFilter)
    .sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)) || b.applause - a.applause || new Date(b.createdAt) - new Date(a.createdAt));

  visibleResults.forEach((result) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const isNoAi = result.resultType === "No AI Please";
    const imageSources = getImageSources(result);
    const imageSource = result.coverImagePath || result.imagePath || imageSources[0] || "";
    const output = card.querySelector(".ai-output");

    card.classList.toggle("is-pinned", favoriteIds.has(result.id));
    card.dataset.resultId = result.id;
    card.querySelector(".result-type").textContent = SHARE_LABELS[result.resultType] || result.resultType;
    card.querySelector(".result-type").dataset.type = result.resultType;
    card.querySelector(".source-type").textContent = result.category;
    card.querySelector("h3").textContent = result.title;
    card.querySelector(".source-copy").textContent = result.source;
    card.querySelector(".author").textContent = `${result.displayName || result.author} · ${result.originCulture || result.heritage}`;
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
      const isTruncated = !isNoAi && result.aiText.length > GALLERY_TEXT_LIMIT;
      output.textContent = isNoAi ? "No-AI share: source preserved without AI transformation." : previewText(result.aiText);
      output.classList.toggle("is-source-only", isNoAi);
      output.classList.toggle("is-truncated", isTruncated);
      if (isTruncated) output.title = "Open the submission to view the full AI text result.";
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

    const cardAdminReturn = card.querySelector(".admin-card-return");
    cardAdminReturn.classList.toggle("is-hidden", result.id !== adminPreviewTargetId);

    voteButton.addEventListener("click", () => applaudResult(result.id));
    const editButton = card.querySelector(".edit-button");
    const deleteButton = card.querySelector(".delete-button");
    editButton.classList.toggle("is-hidden", !result.canEdit);
    deleteButton.classList.toggle("is-hidden", !result.canEdit);
    editButton.addEventListener("click", () => startEdit(result.id));
    deleteButton.addEventListener("click", () => deleteResult(result.id));
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, a, details, summary")) return;
      openResultViewer(result.id);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button, a, details, summary")) return;
      event.preventDefault();
      openResultViewer(result.id);
    });
    card.tabIndex = 0;

    grid.append(card);
  });

  emptyState.classList.toggle("is-visible", visibleResults.length === 0);
  updateStats();
  renderFavorites();
}

function matchesFilter(result) {
  const matchesType = filterIncludes(activeFilters.type, result.category);
  const matchesCulture = filterIncludes(activeFilters.culture, result.originCulture);
  const matchesMode = filterIncludes(activeFilters.mode, result.aiMode);
  return matchesType && matchesCulture && matchesMode;
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

function getImageSources(result) {
  const sources = Array.isArray(result.imagePaths) ? [...result.imagePaths] : [];
  if (result.imagePath) sources.unshift(result.imagePath);
  if (result.coverImagePath) sources.unshift(result.coverImagePath);
  if (result.imageData) sources.push(result.imageData);
  if (isImageResource(result.resource)) sources.push(result.resource);
  return [...new Set(sources.filter(Boolean))];
}

function openResultViewer(id) {
  const result = results.find((entry) => entry.id === id);
  if (!result) return;

  const isNoAi = result.resultType === "No AI Please";
  currentViewerImages = getImageSources(result);
  currentViewerIndex = Math.max(0, currentViewerImages.indexOf(result.coverImagePath || result.imagePath));
  const media = resultViewer.querySelector(".result-viewer__media");

  viewerType.textContent = SHARE_LABELS[result.resultType] || result.resultType;
  viewerType.dataset.type = result.resultType;
  viewerCategory.textContent = result.category;
  viewerTitle.textContent = result.title;
  viewerMeta.textContent = `${result.displayName || result.author} · ${result.originCulture || result.heritage} · ${result.connections.length ? result.connections.join(" + ") : "Source only"}`;
  viewerSource.textContent = result.source;

  if (currentViewerImages.length) {
    media.classList.remove("is-hidden");
    showViewerImage(currentViewerIndex, result.title, isNoAi);
  } else {
    viewerImage.removeAttribute("src");
    viewerImage.alt = "";
    media.classList.add("is-hidden");
    viewerThumbs.classList.add("is-hidden");
  }

  viewerAiText.textContent = isNoAi ? "No-AI share: source preserved without AI transformation." : result.aiText;
  viewerAiText.classList.toggle("is-source-only", isNoAi);

  if (result.readingGuide) {
    viewerReading.textContent = `How to speak it: ${result.readingGuide}`;
    viewerReading.classList.add("is-visible");
  } else {
    viewerReading.textContent = "";
    viewerReading.classList.remove("is-visible");
  }

  if (result.resource) {
    viewerResource.href = result.resource;
    viewerResource.classList.add("is-visible");
  } else {
    viewerResource.removeAttribute("href");
    viewerResource.classList.remove("is-visible");
  }

  if (typeof resultViewer.showModal === "function") {
    resultViewer.showModal();
  } else {
    resultViewer.setAttribute("open", "");
  }
}

function showViewerImage(index, title = viewerTitle.textContent, isNoAi = viewerType.dataset.type === "No AI Please") {
  if (!currentViewerImages.length) return;
  currentViewerIndex = (index + currentViewerImages.length) % currentViewerImages.length;
  viewerImage.src = currentViewerImages[currentViewerIndex];
  viewerImage.alt = isNoAi ? `${title} source image ${currentViewerIndex + 1}` : `${title} shared image ${currentViewerIndex + 1}`;
  const hasMultiple = currentViewerImages.length > 1;
  viewerPrevButton.classList.toggle("is-hidden", !hasMultiple);
  viewerNextButton.classList.toggle("is-hidden", !hasMultiple);
  viewerThumbs.classList.toggle("is-hidden", !hasMultiple);
  viewerThumbs.innerHTML = "";
  currentViewerImages.forEach((imageSource, imageIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = imageIndex === currentViewerIndex ? "is-active" : "";
    button.setAttribute("aria-label", `Show image ${imageIndex + 1}`);
    const image = document.createElement("img");
    image.src = imageSource;
    image.alt = "";
    button.append(image);
    button.addEventListener("click", () => showViewerImage(imageIndex, title, isNoAi));
    viewerThumbs.append(button);
  });
}

function closeResultViewer() {
  currentViewerImages = [];
  currentViewerIndex = 0;
  if (typeof resultViewer.close === "function") {
    resultViewer.close();
  } else {
    resultViewer.removeAttribute("open");
  }
}

function startEdit(id) {
  const result = results.find((entry) => entry.id === id);
  if (!result) return;

  setShowcaseView("full");
  hideShowcaseSuccess();
  editingId = id;
  form.elements.namedItem("title").value = result.title;
  form.elements.namedItem("source").value = result.source;
  form.elements.namedItem("category").value = result.category;
  form.elements.namedItem("originCulture").value = result.originCulture || "";
  form.elements.namedItem("submitterName").value = result.submitterName || "";
  form.elements.namedItem("displayName").value = result.displayName || result.author || "";
  lastSyncedDisplayName = form.elements.namedItem("displayName").value === form.elements.namedItem("submitterName").value
    ? form.elements.namedItem("displayName").value
    : "";
  form.elements.namedItem("webinarConsent").value = result.webinarConsent || "Maybe";
  form.elements.namedItem("resource").value = result.resource;
  form.elements.namedItem("aiText").value = result.aiText;
  form.elements.namedItem("readingGuide").value = result.readingGuide;
  form.elements.namedItem("imageFile").value = "";
  renderCoverPicker();
  form.querySelector(`input[name="aiMode"][value="${result.aiMode}"]`).checked = true;

  if (result.aiMode === "With AI") {
    form.querySelector(`input[name="aiStatus"][value="${result.resultType}"]`).checked = true;
  }

  form.querySelectorAll('input[name="connections"]').forEach((input) => {
    input.checked = result.connections.includes(input.value);
  });

  updateModePanels();
  updateOptionalFieldState();
  submitLabel.textContent = "Update submission";
  cancelEditButton.classList.remove("is-hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function returnToUpdatedSubmission(id) {
  setShowcaseView("gallery");
  window.requestAnimationFrame(() => {
    const card = grid.querySelector(`[data-result-id="${CSS.escape(id)}"]`);
    if (!card) return;
    card.classList.add("is-updated");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.focus({ preventScroll: true });
    window.setTimeout(() => card.classList.remove("is-updated"), 2200);
  });
}

function resetFormState() {
  editingId = null;
  form.reset();
  lastSyncedDisplayName = "";
  renderCoverPicker();
  form.querySelector('input[name="aiMode"][value="With AI"]').checked = true;
  form.querySelector('input[name="aiStatus"][value="AI-Assisted Result"]').checked = true;
  form.querySelectorAll('input[name="connections"]').forEach((input) => {
    input.checked = input.value === "AI Image";
  });
  updateModePanels();
  updateOptionalFieldState();
  submitLabel.textContent = "Add submission";
  cancelEditButton.classList.add("is-hidden");
}

function renderCoverPicker() {
  const files = [...form.elements.namedItem("imageFile").files || []].filter((file) => file.type.startsWith("image/"));
  coverPickerGrid.innerHTML = "";
  coverPicker.classList.toggle("is-hidden", files.length < 2);

  files.forEach((file, index) => {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    const image = document.createElement("img");
    const name = document.createElement("span");
    radio.type = "radio";
    radio.name = "coverImageName";
    radio.value = file.name;
    radio.checked = index === 0;
    image.src = URL.createObjectURL(file);
    image.alt = `${file.name} preview`;
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });
    name.textContent = file.name;
    label.append(radio, image, name);
    coverPickerGrid.append(label);
  });
}

function validateImageUploads() {
  const input = form.elements.namedItem("imageFile");
  const oversizedFiles = [...input.files || []].filter((file) => file.size > MAX_IMAGE_UPLOAD_BYTES);
  if (!oversizedFiles.length) return true;
  const fileList = oversizedFiles.map((file) => file.name).join(", ");
  window.alert(`Please keep each image size within 5 MB. Please replace: ${fileList}`);
  input.value = "";
  renderCoverPicker();
  return false;
}

function updateStats() {
  submissionCount.textContent = results.length;
  resultCount.textContent = results.filter((result) => result.aiMode === "With AI").length;
  imageCount.textContent = results.filter((result) => getImageSources(result).length).length;
}

function resetFilters() {
  activeFilters = {
    type: ["All"],
    culture: ["All"],
    mode: ["All"]
  };
}

function updateFilterControls() {
  updateFilterGroup("type", "All types", uniqueValues(results.map((result) => result.category)));
  updateFilterGroup("culture", "All cultures/regions", uniqueValues(results.map((result) => result.originCulture)));
  updateFilterSelect("mode", "All modes", ["With AI", "No AI Please"]);
}

function updateFilterGroup(field, allLabel, values) {
  const group = filters.querySelector(`[data-filter-field="${field}"]`);
  if (!group) return;
  const optionBox = group.querySelector(".filter-option-box");
  const summary = group.querySelector("[data-filter-summary]");
  const selectedValues = normalizeFilterValues(activeFilters[field], values);
  activeFilters[field] = selectedValues;
  optionBox.innerHTML = "";
  [{ label: allLabel, value: "All" }, ...values.map((value) => ({ label: value, value }))].forEach((option) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const text = document.createElement("span");
    input.type = "checkbox";
    input.value = option.value;
    input.checked = option.value === "All"
      ? selectedValues.length === values.length
      : selectedValues.includes(option.value);
    text.textContent = option.label;
    label.append(input, text);
    optionBox.append(label);
  });
  summary.textContent = getFilterSummary(allLabel, selectedValues, values.length);
}

function updateFilterSelect(field, allLabel, values) {
  const select = filters.querySelector(`[data-filter-field="${field}"]`);
  if (!select) return;
  const selectedValues = normalizeFilterValues(activeFilters[field], values);
  activeFilters[field] = selectedValues;
  select.innerHTML = "";
  select.append(new Option(allLabel, "All"));
  values.forEach((value) => select.append(new Option(value, value)));
  [...select.options].forEach((option) => {
    option.selected = selectedValues.includes(option.value);
  });
}

function getSelectedCheckboxValues(group) {
  const availableValues = [...group.querySelectorAll('input[type="checkbox"]')]
    .map((input) => input.value)
    .filter((value) => value !== "All");
  const selectedValues = [...group.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  if (selectedValues.includes("All")) return availableValues;
  return normalizeFilterValues(selectedValues, availableValues);
}

function syncFilterGroupSelection(group, changedInput) {
  const allInput = group.querySelector('input[value="All"]');
  const specificInputs = [...group.querySelectorAll('input[type="checkbox"]:not([value="All"])')];
  if (changedInput.value === "All") {
    specificInputs.forEach((input) => {
      input.checked = changedInput.checked;
    });
    return;
  }
  allInput.checked = specificInputs.length > 0 && specificInputs.every((input) => input.checked);
}

function getFilterSummary(allLabel, selectedValues, availableCount) {
  if (!selectedValues.length || selectedValues.includes("All")) return allLabel;
  if (availableCount > 0 && selectedValues.length === availableCount) return allLabel;
  if (selectedValues.length === 1) return selectedValues[0];
  return `${selectedValues.length} selected`;
}

function normalizeFilterValues(selectedValues, availableValues) {
  const values = Array.isArray(selectedValues) ? selectedValues : [selectedValues];
  const selected = values.filter((value) => value === "All" || availableValues.includes(value));
  const specificValues = selected.filter((value) => value !== "All");
  if (selected.includes("All")) return [...availableValues];
  return specificValues;
}

function filterIncludes(selectedValues, value) {
  return !selectedValues.length || selectedValues.includes("All") || selectedValues.includes(value);
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
}

function updateModePanels() {
  const mode = form.querySelector('input[name="aiMode"]:checked').value;
  document.querySelectorAll("[data-mode-panel]").forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.modePanel !== mode);
  });
  updateOptionalFieldState();
}

function updateOptionalFieldState() {
  const aiMode = form.querySelector('input[name="aiMode"]:checked').value;
  const aiStatus = form.querySelector('input[name="aiStatus"]:checked')?.value;
  const shouldOpenAiText = aiMode === "With AI"
    && aiStatus === "AI-Assisted Result"
    && ["Translate", "Explain"].some((connection) => form.querySelector(`input[name="connections"][value="${connection}"]`)?.checked);
  aiTextDetails.open = shouldOpenAiText;
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
  const headers = ["Title", "Submission Type", "Heritage Focus", "Originated Culture Or Region", "Public Display Name", "Webinar Sharing Consent", "Source", "Original Mode", "Original Status", "Original AI Connections", "Current Mode", "Current Status", "Current AI Connections", "Converted From Needs AI", "Converted At", "Updated At", "AI Text", "How To Speak It", "Resource", "Cover Image", "All Images", "Has Image", "Applause", "Featured", "Created At"];
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
    result.coverImagePath || result.imagePath || "",
    getImageSources(result).join(" | "),
    getImageSources(result).length ? "Yes" : "No",
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
  updateOptionalFieldState();
  setShowcaseView(localStorage.getItem("aapi-ai-showcase-view") === "gallery" ? "gallery" : "full");
  results = await loadResults();
  render();
  openPreviewTarget();
}

initialize();

function openPreviewTarget() {
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get("showcase");
  showAdminReturnLink(params);
  if (!targetId) return;
  adminPreviewTargetId = targetId;
  resetFilters();
  setShowcaseView("gallery");
  render();
  returnToUpdatedSubmission(targetId);
}

function showAdminReturnLink(params) {
  if (params.get("fromAdmin") !== "1" && !sessionStorage.getItem("aapin-admin-key")) return;
  document.querySelector(".admin-return-link")?.classList.remove("is-hidden");
}
