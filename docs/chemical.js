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
const relationshipList = document.getElementById("relationship-list");

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

  const nodeMap = new Map();

  const maxCol = Math.max(...flowchart.nodes.map((node) => node.col || 1));
  flowGrid.style.gridTemplateColumns = `repeat(${maxCol}, minmax(180px, 1fr))`;
  flowGrid.innerHTML = "";

  flowchart.nodes.forEach((node) => {
    nodeMap.set(node.id, node);

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

    const meta = document.createElement("div");
    meta.className = "node-meta";

    if (node.profile) {
      const badge = document.createElement("span");
      badge.className = "profile-pill";
      badge.textContent = node.profile;
      meta.appendChild(badge);
    }

    if (node.detail) {
      const detail = document.createElement("p");
      detail.className = "node-detail";
      detail.textContent = node.detail;
      meta.appendChild(detail);
    }

    card.appendChild(meta);

    flowGrid.appendChild(card);
  });

  const edges = flowchart.edges || [];
  requestAnimationFrame(() => {
    drawEdges(edges);
    renderRelationships(edges, nodeMap);
  });

  window.addEventListener("resize", () => drawEdges(edges));
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
  markerPath.setAttribute("fill", "#4f46e5");
  marker.appendChild(markerPath);
  defs.appendChild(marker);

  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", "text-shadow");
  const dropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
  dropShadow.setAttribute("dx", "0");
  dropShadow.setAttribute("dy", "0");
  dropShadow.setAttribute("stdDeviation", "2");
  dropShadow.setAttribute("flood-color", "#e2e8f0");
  dropShadow.setAttribute("flood-opacity", "0.9");
  filter.appendChild(dropShadow);
  defs.appendChild(filter);
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

    const curvature = Math.max(40, Math.abs(end.x - start.x) / 2);
    const control1 = {
      x: start.x + (end.x - start.x) / 2,
      y: start.y - curvature,
    };
    const control2 = {
      x: start.x + (end.x - start.x) / 2,
      y: end.y - curvature,
    };

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#0ea5e9");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("marker-end", "url(#arrowhead)");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-opacity", "0.9");
    flowEdges.appendChild(path);

    const pathLength = path.getTotalLength();
    const midpoint = path.getPointAtLength(pathLength / 2);

    if (edge.label) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", midpoint.x);
      label.setAttribute("y", midpoint.y - 6);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("fill", "#0f172a");
      label.setAttribute("font-size", "12");
      label.textContent = edge.label;
      label.setAttribute("filter", "url(#text-shadow)");
      flowEdges.appendChild(label);
    }
  });
}

function renderRelationships(edges, nodeMap) {
  relationshipList.innerHTML = "";

  if (!edges.length) {
    relationshipList.innerHTML = '<p class="empty">No transformations provided.</p>';
    return;
  }

  edges.forEach((edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) return;

    const item = document.createElement("article");
    item.className = "relationship-card";

    const headline = document.createElement("div");
    headline.className = "relationship-line";
    headline.innerHTML = `
      <div class="node-chip">
        <span class="node-name">${fromNode.title}</span>
        <small>${fromNode.smiles}</small>
      </div>
      <div class="arrow-chip">${edge.label || "Change"}</div>
      <div class="node-chip">
        <span class="node-name">${toNode.title}</span>
        <small>${toNode.smiles}</small>
      </div>
    `;

    const profile = document.createElement("p");
    profile.className = "profile-summary";
    const profileText = toNode.profile || toNode.detail || "Profile not provided.";
    profile.textContent = `Pharmacological profile: ${profileText}`;

    item.appendChild(headline);
    item.appendChild(profile);
    relationshipList.appendChild(item);
  });
}
