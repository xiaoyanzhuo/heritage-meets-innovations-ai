const ADMIN_SESSION_KEY = "aapin-admin-key";
const adminForm = document.querySelector("#adminForm");
const liveAdminList = document.querySelector("#liveAdminList");
const liveAdminEmpty = document.querySelector("#liveAdminEmpty");
const adminList = document.querySelector("#adminList");
const adminEmpty = document.querySelector("#adminEmpty");
const template = document.querySelector("#adminItemTemplate");
const adminEditForm = document.querySelector("#adminEditForm");
const adminEditTitle = document.querySelector("#adminEditTitle");
const adminCancelEditButton = document.querySelector("#adminCancelEditButton");
const adminLogoutButton = document.querySelector("#adminLogoutButton");

let adminKey = sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
let liveRows = [];

if (adminKey) {
  adminForm.elements.namedItem("adminKey").value = adminKey;
  loadAdminData()
    .then(() => adminLogoutButton.classList.remove("is-hidden"))
    .catch(() => logoutAdmin());
}

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nextAdminKey = new FormData(adminForm).get("adminKey").trim();
  if (!nextAdminKey) return;
  clearAdminContent();
  adminLogoutButton.classList.add("is-hidden");
  adminKey = nextAdminKey;
  try {
    await loadAdminData();
    sessionStorage.setItem(ADMIN_SESSION_KEY, adminKey);
    adminLogoutButton.classList.remove("is-hidden");
  } catch (error) {
    adminKey = "";
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    clearAdminContent();
    window.alert(error.message);
  }
});

adminEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveAdminEdit();
});

adminCancelEditButton.addEventListener("click", closeAdminEdit);
adminLogoutButton.addEventListener("click", logoutAdmin);

async function loadAdminData() {
  const deleted = await fetchDeletedItems();
  const liveItems = await fetchLiveItems();
  renderDeletedItems(deleted);
  renderLiveItems(liveItems);
}

async function fetchLiveItems() {
  const [ideas, showcase] = await Promise.all([
    apiRequest("/api/ideas"),
    apiRequest("/api/showcase")
  ]);
  return { ideas, showcase };
}

async function fetchDeletedItems() {
  return apiRequest("/api/admin/deleted");
}

function renderLiveItems(liveItems) {
  liveAdminList.innerHTML = "";
  const rows = [
    ...(liveItems.ideas || []).map((item) => ({ ...item, table: "ideas", type: "Idea Wall" })),
    ...(liveItems.showcase || []).map((item) => ({ ...item, table: "showcase", type: "Heritage Showcase" }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  liveRows = rows;

  liveAdminEmpty.classList.toggle("is-visible", rows.length === 0);

  rows.forEach((item) => {
    const card = buildAdminCard(item, "live");
    card.querySelector(".edit-live-button").addEventListener("click", () => openAdminEdit(item.table, item.id));
    card.querySelector(".remove-button").addEventListener("click", () => removeLiveItem(item.table, item.id, item.title));
    liveAdminList.append(card);
  });
}

function renderDeletedItems(deleted) {
  adminList.innerHTML = "";
  const rows = [
    ...(deleted.ideas || []).map((item) => ({ ...item, table: "ideas", type: "Idea Wall" })),
    ...(deleted.showcase || []).map((item) => ({ ...item, table: "showcase", type: "Heritage Showcase" }))
  ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

  adminEmpty.classList.toggle("is-visible", rows.length === 0);

  rows.forEach((item) => {
    const card = buildAdminCard(item, "deleted");
    card.querySelector(".recover-button").addEventListener("click", () => recoverItem(item.table, item.id));
    adminList.append(card);
  });
}

function buildAdminCard(item, mode) {
  const card = template.content.firstElementChild.cloneNode(true);
  const isDeleted = mode === "deleted";
  card.dataset.table = item.table;
  card.dataset.itemId = item.id;
  card.querySelector(".tag").textContent = item.type;
  card.querySelector(".stage").textContent = item.category || item.stage || (isDeleted ? "Deleted" : "Live");
  card.querySelector("h3").replaceChildren(buildPreviewLink(item, isDeleted));
  card.querySelector(".idea-copy").textContent = item.description || item.source || "";
  card.querySelector(".author").textContent = `${item.author || "Unknown display"} · admin: ${item.submitterName || "not captured"}`;
  card.querySelector(".deleted-at").textContent = isDeleted && item.deletedAt
    ? `Deleted ${new Date(item.deletedAt).toLocaleString()}`
    : `Created ${new Date(item.createdAt).toLocaleString()}`;
  card.querySelector(".recover-button").classList.toggle("is-hidden", !isDeleted);
  card.querySelector(".edit-live-button").classList.toggle("is-hidden", isDeleted);
  card.querySelector(".remove-button").classList.toggle("is-hidden", isDeleted);
  return card;
}

function buildPreviewLink(item, isDeleted) {
  const link = document.createElement(isDeleted ? "span" : "a");
  link.textContent = item.title;
  if (!isDeleted) {
    const targetPage = item.table === "showcase" ? "heritage-showcase-v2.html" : "index.html";
    const targetParam = item.table === "showcase" ? "showcase" : "idea";
    link.href = `${targetPage}?${targetParam}=${encodeURIComponent(item.id)}&fromAdmin=1`;
    link.title = "Preview this submission on the public page";
  }
  return link;
}

function openAdminEdit(table, id) {
  const item = liveRows.find((row) => row.table === table && row.id === id);
  if (!item) return;

  const isIdea = table === "ideas";
  adminEditForm.classList.remove("is-hidden");
  adminEditTitle.textContent = `Edit ${item.type}`;
  adminEditForm.elements.namedItem("table").value = table;
  adminEditForm.elements.namedItem("id").value = id;
  adminEditForm.elements.namedItem("title").value = item.title || "";
  adminEditForm.elements.namedItem("description").value = item.description || "";
  adminEditForm.elements.namedItem("source").value = item.source || "";
  adminEditForm.elements.namedItem("category").value = item.category || "";
  adminEditForm.elements.namedItem("stage").value = item.stage || "";
  adminEditForm.elements.namedItem("heritage").value = item.heritage || "";
  adminEditForm.elements.namedItem("originCulture").value = item.originCulture || "";
  adminEditForm.elements.namedItem("submitterName").value = item.submitterName || item.author || "";
  adminEditForm.elements.namedItem("displayName").value = item.displayName || item.author || "";
  adminEditForm.elements.namedItem("resultType").value = item.resultType || "Needs AI Help";
  adminEditForm.elements.namedItem("webinarConsent").value = item.webinarConsent || "Maybe";
  adminEditForm.elements.namedItem("aiText").value = item.aiText || "";
  adminEditForm.elements.namedItem("readingGuide").value = item.readingGuide || "";
  adminEditForm.elements.namedItem("resource").value = item.resource || "";

  adminEditForm.querySelectorAll("[data-admin-field]").forEach((field) => {
    const showcaseOnly = ["source", "showcaseMeta", "showcaseStatus", "aiText", "readingGuide", "resource"].includes(field.dataset.adminField);
    const ideaOnly = ["description", "stage"].includes(field.dataset.adminField);
    field.classList.toggle("is-hidden", (showcaseOnly && isIdea) || (ideaOnly && !isIdea));
  });

  adminEditForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeAdminEdit() {
  adminEditForm.reset();
  adminEditForm.classList.add("is-hidden");
}

function logoutAdmin() {
  adminKey = "";
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  adminForm.reset();
  clearAdminContent();
  adminLogoutButton.classList.add("is-hidden");
}

function clearAdminContent() {
  liveRows = [];
  closeAdminEdit();
  liveAdminList.innerHTML = "";
  adminList.innerHTML = "";
  liveAdminEmpty.classList.remove("is-visible");
  adminEmpty.classList.remove("is-visible");
}

async function saveAdminEdit() {
  const formData = new FormData(adminEditForm);
  const table = formData.get("table");
  const id = formData.get("id");
  const item = liveRows.find((row) => row.table === table && row.id === id);
  if (!item) return;

  const payload = table === "ideas"
    ? {
        title: formData.get("title").trim(),
        description: formData.get("description").trim(),
        category: formData.get("category").trim(),
        submitterName: formData.get("submitterName").trim(),
        displayName: formData.get("displayName").trim(),
        stage: formData.get("stage").trim() || "Spark"
      }
    : {
        ...item,
        title: formData.get("title").trim(),
        category: formData.get("category").trim() || item.category,
        heritage: formData.get("heritage").trim() || "Shared heritage",
        originCulture: formData.get("originCulture").trim() || "Not specified",
        submitterName: formData.get("submitterName").trim(),
        displayName: formData.get("displayName").trim(),
        webinarConsent: formData.get("webinarConsent"),
        source: formData.get("source").trim(),
        resultType: formData.get("resultType"),
        aiMode: formData.get("resultType") === "No AI Please" ? "No AI Please" : "With AI",
        connections: item.connections || [],
        aiText: formData.get("resultType") === "No AI Please" ? "" : formData.get("aiText").trim(),
        readingGuide: formData.get("readingGuide").trim(),
        resource: formData.get("resource").trim()
      };

  try {
    await apiRequest(`/api/${table}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    closeAdminEdit();
    await loadAdminData();
    returnToEditedAdminItem(table, id);
  } catch (error) {
    window.alert(error.message);
  }
}

function returnToEditedAdminItem(table, id) {
  window.requestAnimationFrame(() => {
    const card = liveAdminList.querySelector(`[data-table="${CSS.escape(table)}"][data-item-id="${CSS.escape(id)}"]`);
    if (!card) return;
    card.classList.add("is-updated");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.focus({ preventScroll: true });
    window.setTimeout(() => card.classList.remove("is-updated"), 2200);
  });
}

async function removeLiveItem(table, id, title) {
  const confirmed = window.confirm(`Remove "${title}" from the public site? Admin can recover it later.`);
  if (!confirmed) return;
  try {
    await apiRequest(`/api/${table}/${id}`, { method: "DELETE" });
    await loadAdminData();
  } catch (error) {
    window.alert(error.message);
  }
}

async function recoverItem(table, id) {
  try {
    await apiRequest(`/api/admin/${table}/${id}/recover`, { method: "POST" });
    await loadAdminData();
  } catch (error) {
    window.alert(error.message);
  }
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("X-AAPIN-Admin-Key", adminKey);
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    let message = "Admin request failed.";
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}
