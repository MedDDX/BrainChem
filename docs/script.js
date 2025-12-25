const cardsContainer = document.getElementById("cards");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");

const CHEMICALS_PATH = "chemicals/chemicals.json";
let chemicals = [];
const drawer = new SmilesDrawer.Drawer({ width: 260, height: 180, padding: 8 });

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
    `;

    const canvas = document.createElement("canvas");
    canvas.width = 260;
    canvas.height = 180;
    canvas.className = "molecule";
    canvas.setAttribute("aria-label", `Structure of ${item.name}`);
    card.appendChild(canvas);

    if (item.notes) {
      const notes = document.createElement("small");
      notes.textContent = item.notes;
      card.appendChild(notes);
    }

    drawMolecule(canvas, item.smiles, item.name);
    cardsContainer.appendChild(card);
  });
}

function drawMolecule(canvas, smiles, label) {
  SmilesDrawer.parse(
    smiles,
    (tree) => drawer.draw(tree, canvas, "light"),
    () => {
      const fallback = document.createElement("p");
      fallback.className = "empty";
      fallback.textContent = `Unable to render ${label}.`;
      canvas.replaceWith(fallback);
    }
  );
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
