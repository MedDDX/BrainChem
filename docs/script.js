const statusEl = document.getElementById("status");
const gridEl = document.getElementById("chemical-grid");

function renderCard(chemical) {
  const card = document.createElement("article");
  card.className = "card";

  const heading = document.createElement("h2");
  heading.textContent = chemical.name;
  card.appendChild(heading);

  const formula = document.createElement("p");
  formula.className = "formula";
  formula.textContent = chemical.formula;
  card.appendChild(formula);

  const list = document.createElement("dl");

  const addRow = (title, content) => {
    const dt = document.createElement("dt");
    dt.textContent = title;
    const dd = document.createElement("dd");
    dd.innerHTML = content;
    list.append(dt, dd);
  };

  addRow("SMILES", `<span class="code-pill" title="${chemical.smiles}">${chemical.smiles}</span>`);
  addRow("Common use", chemical.use);
  addRow("Hazards", chemical.hazards);

  card.appendChild(list);
  gridEl.appendChild(card);
}

async function loadChemicals() {
  const dataUrl = "../chemicals/chemicals.json";
  statusEl.textContent = "Fetching chemicals…";

  try {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const chemicals = await response.json();
    gridEl.innerHTML = "";

    if (!Array.isArray(chemicals) || chemicals.length === 0) {
      statusEl.textContent = "No chemicals found. Add entries to chemicals/chemicals.json.";
      statusEl.classList.add("error");
      return;
    }

    chemicals.forEach(renderCard);
    statusEl.textContent = `Showing ${chemicals.length} chemicals from /chemicals/chemicals.json.`;
    statusEl.classList.remove("error");
  } catch (err) {
    statusEl.textContent = `Error loading chemicals: ${err.message}`;
    statusEl.classList.add("error");
  }
}

document.addEventListener("DOMContentLoaded", loadChemicals);
