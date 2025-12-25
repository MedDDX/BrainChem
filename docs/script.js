const cardsContainer = document.getElementById("cards");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");

const CHEMICALS_PATH = "chemicals/chemicals.json";
let chemicals = [];

async function loadChemicals() {
  statusEl.textContent = "Loading chemicals...";
  try {
    const response = await fetch(CHEMICALS_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load data (${response.status})`);
    }
    chemicals = await response.json();
    statusEl.textContent = `Loaded ${chemicals.length} chemicals.`;
    renderCards(chemicals);
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}. Ensure ${CHEMICALS_PATH} is present.`;
  }
}

function renderCards(list) {
  cardsContainer.innerHTML = "";
  if (!list.length) {
    cardsContainer.innerHTML = '<p class="empty">No chemicals match your search.</p>';
    return;
  }

  list.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${item.name}</h3>
      <small>${item.formula || "Unknown formula"}</small>
      <p>${item.description || "No description provided."}</p>
      <div class="smiles">
        <span>SMILES:</span>
        <a href="https://smilesdrawer.surge.sh?smiles=${encodeURIComponent(item.smiles)}" target="_blank" rel="noreferrer">${item.smiles}</a>
      </div>
      ${item.notes ? `<small>${item.notes}</small>` : ""}
    `;
    cardsContainer.appendChild(card);
  });
}

function filterChemicals(event) {
  const value = event.target.value.trim().toLowerCase();
  if (!value) {
    renderCards(chemicals);
    return;
  }

  const filtered = chemicals.filter((item) => {
    return [item.name, item.formula, item.smiles]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(value));
  });
  renderCards(filtered);
}

searchInput.addEventListener("input", filterChemicals);
loadChemicals();
