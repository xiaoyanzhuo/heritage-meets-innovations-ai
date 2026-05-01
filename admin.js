const adminForm = document.querySelector("#adminForm");
const adminList = document.querySelector("#adminList");
const adminEmpty = document.querySelector("#adminEmpty");
const template = document.querySelector("#adminItemTemplate");

let adminKey = "";

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminKey = new FormData(adminForm).get("adminKey").trim();
  if (!adminKey) return;
  await loadDeletedItems();
});

async function loadDeletedItems() {
  try {
    const deleted = await apiRequest("/api/admin/deleted");
    renderDeletedItems(deleted);
  } catch (error) {
    window.alert(error.message);
  }
}

function renderDeletedItems(deleted) {
  adminList.innerHTML = "";
  const rows = [
    ...(deleted.ideas || []).map((item) => ({ ...item, table: "ideas", type: "Idea Wall" })),
    ...(deleted.showcase || []).map((item) => ({ ...item, table: "showcase", type: "Heritage Showcase" }))
  ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

  adminEmpty.classList.toggle("is-visible", rows.length === 0);

  rows.forEach((item) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".tag").textContent = item.type;
    card.querySelector(".stage").textContent = item.category || item.stage || "Deleted";
    card.querySelector("h3").textContent = item.title;
    card.querySelector(".idea-copy").textContent = item.description || item.source || "";
    card.querySelector(".author").textContent = item.author || "Anonymous";
    card.querySelector(".deleted-at").textContent = item.deletedAt ? `Deleted ${new Date(item.deletedAt).toLocaleString()}` : "Deleted";
    card.querySelector(".recover-button").addEventListener("click", () => recoverItem(item.table, item.id));
    adminList.append(card);
  });
}

async function recoverItem(table, id) {
  try {
    await apiRequest(`/api/admin/${table}/${id}/recover`, { method: "POST" });
    await loadDeletedItems();
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
