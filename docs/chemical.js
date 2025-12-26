const params = new URLSearchParams(window.location.search);
const chemicalId = params.get("id");
const statusEl = document.getElementById("status");
const flowContent = document.getElementById("flow-content");
const flowGrid = document.getElementById("flow-grid");
const flowEdges = document.getElementById("flow-edges");
const titleEl = document.getElementById("page-title");
const subtitleEl = document.getElementById("page-subtitle");
const flowTitleEl = document.getElementById("flow-title");
const flowSubtitleEl = document.getElementById("flow-subtitle");
const mainStructure = document.getElementById("main-structure");

const CHEMICALS_PATH = "chemicals/chemicals.json";
const nodeDrawer = new SmilesDrawer.Drawer({ width: 180, height: 140, padding: 6 });
const heroDrawer = new SmilesDrawer.Drawer({ width: 260, height: 180, padding: 10 });

if (!chemicalId) {
  statusEl.textContent = "No chemical selected. Return to the gallery and pick one.";
} else {
  loadChemical();
}

async function loadChemical() {
  statusEl.textContent = "Loading chemical details...";
  try {
    const response = await fetch(CHEMICALS_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load data (${response.status})`);
    }
    const chemicals = await response.json();
    const chemical = chemicals.find((item) => item.id === chemicalId);
    if (!chemical) {
      statusEl.textContent = "Chemical not found in the dataset.";
      return;
    }

    renderHero(chemical);
    flowContent.hidden = false;
    renderFlowchart(chemical.flowchart);
    statusEl.textContent = "";
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}. Ensure ${CHEMICALS_PATH} is present.`;
  }
}

function renderHero(chemical) {
  titleEl.textContent = chemical.name;
  subtitleEl.textContent = chemical.description || "";
  flowTitleEl.textContent = chemical.flowchart?.title || "Flow chart";
  flowSubtitleEl.textContent = chemical.flowchart?.subtitle || "";
  mainStructure.setAttribute(
    "aria-label",
    `Main structure rendering for ${chemical.name}`
  );
  drawMolecule(heroDrawer, mainStructure, chemical.smiles, chemical.name);
}

function renderFlowchart(flowchart) {
  if (!flowchart || !flowchart.nodes?.length) {
    statusEl.textContent = "No flow chart available for this chemical.";
    return;
  }

  const maxCol = Math.max(...flowchart.nodes.map((node) => node.col || 1));
  flowGrid.style.gridTemplateColumns = `repeat(${maxCol}, minmax(180px, 1fr))`;
  flowGrid.innerHTML = "";

  flowchart.nodes.forEach((node) => {
    const card = document.createElement("article");
    card.className = "node-card";
    card.style.gridColumn = node.col;
    card.style.gridRow = node.row;
    card.dataset.nodeId = node.id;
    card.title = `${node.title} — ${node.smiles}`;

    const heading = document.createElement("h3");
    heading.textContent = node.title;
    card.appendChild(heading);

    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 140;
    canvas.className = "molecule";
    canvas.setAttribute("aria-label", `Structure of ${node.title}`);
    drawMolecule(nodeDrawer, canvas, node.smiles, node.title);
    card.appendChild(canvas);

    if (node.detail) {
      const detail = document.createElement("p");
      detail.textContent = node.detail;
      card.appendChild(detail);
    }

    flowGrid.appendChild(card);
  });

  requestAnimationFrame(() => drawEdges(flowchart.edges || []));
  window.addEventListener("resize", () => drawEdges(flowchart.edges || []));
}

function drawMolecule(drawer, canvas, smiles, label) {
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

function drawEdges(edges) {
  const bounds = flowGrid.getBoundingClientRect();
  flowEdges.innerHTML = "";
  flowEdges.setAttribute("width", flowGrid.clientWidth);
  flowEdges.setAttribute("height", flowGrid.clientHeight);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "3.5");
  marker.setAttribute("orient", "auto");
  const markerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  markerPath.setAttribute("d", "M0,0 L10,3.5 L0,7 Z");
  markerPath.setAttribute("fill", "#2563eb");
  marker.appendChild(markerPath);
  defs.appendChild(marker);
  flowEdges.appendChild(defs);

  edges.forEach((edge) => {
    const from = flowGrid.querySelector(`[data-node-id="${edge.from}"]`);
    const to = flowGrid.querySelector(`[data-node-id="${edge.to}"]`);
    if (!from || !to) return;

    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const start = {
      x: fromRect.left - bounds.left + fromRect.width / 2,
      y: fromRect.top - bounds.top + fromRect.height / 2,
    };
    const end = {
      x: toRect.left - bounds.left + toRect.width / 2,
      y: toRect.top - bounds.top + toRect.height / 2,
    };

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("stroke", "#2563eb");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.setAttribute("stroke-linecap", "round");
    flowEdges.appendChild(line);

    if (edge.label) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      label.setAttribute("x", midX);
      label.setAttribute("y", midY - 6);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "#0f172a");
      label.setAttribute("font-size", "12");
      label.textContent = edge.label;
      flowEdges.appendChild(label);
    }
  });
}
