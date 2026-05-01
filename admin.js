const adminForm = document.querySelector("#adminForm");
const liveAdminList = document.querySelector("#liveAdminList");
const liveAdminEmpty = document.querySelector("#liveAdminEmpty");
const adminList = document.querySelector("#adminList");
const adminEmpty = document.querySelector("#adminEmpty");
const template = document.querySelector("#adminItemTemplate");

let adminKey = "";

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminKey = new FormData(adminForm).get("adminKey").trim();
  if (!adminKey) return;
  await loadAdminData();
});

async function loadAdminData() {
  await Promise.all([loadLiveItems(), loadDeletedItems()]);
}

async function loadLiveItems() {
  try {
    const [ideas, showcase] = await Promise.all([
      apiRequest("/api/ideas"),
      apiRequest("/api/showcase")
    ]);
    renderLiveItems({ ideas, showcase });
  } catch (error) {
    window.alert(error.message);
  }
}

async function loadDeletedItems() {
  try {
    const deleted = await apiRequest("/api/admin/deleted");
    renderDeletedItems(deleted);
  } catch (error) {
    window.alert(error.message);
  }
}

function renderLiveItems(liveItems) {
  liveAdminList.innerHTML = "";
  const rows = [
    ...(liveItems.ideas || []).map((item) => ({ ...item, table: "ideas", type: "Idea Wall" })),
    ...(liveItems.showcase || []).map((item) => ({ ...item, table: "showcase", type: "Heritage Showcase" }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  liveAdminEmpty.classList.toggle("is-visible", rows.length === 0);

  rows.forEach((item) => {
    const card = buildAdminCard(item, "live");
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
  card.querySelector(".tag").textContent = item.type;
  card.querySelector(".stage").textContent = item.category || item.stage || (isDeleted ? "Deleted" : "Live");
  card.querySelector("h3").textContent = item.title;
  card.querySelector(".idea-copy").textContent = item.description || item.source || "";
  card.querySelector(".author").textContent = item.author || "Anonymous";
  card.querySelector(".deleted-at").textContent = isDeleted && item.deletedAt
    ? `Deleted ${new Date(item.deletedAt).toLocaleString()}`
    : `Created ${new Date(item.createdAt).toLocaleString()}`;
  card.querySelector(".recover-button").classList.toggle("is-hidden", !isDeleted);
  card.querySelector(".remove-button").classList.toggle("is-hidden", isDeleted);
  return card;
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
  return response.json();
}
