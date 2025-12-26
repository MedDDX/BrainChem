const params = new URLSearchParams(window.location.search);
const chemicalId = params.get("id");
const statusEl = document.getElementById("status");
const flowContent = document.getElementById("flow-content");
const flowSequence = document.getElementById("flow-sequence");
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
  flowchart.nodes.forEach((node) => nodeMap.set(node.id, node));

  const edges = flowchart.edges || [];
  const orderedEdges = buildTopology(flowchart.nodes, edges);

  flowSequence.innerHTML = "";

  if (!orderedEdges.length) {
    flowSequence.innerHTML = '<p class="empty">No transformations provided for this molecule.</p>';
    renderRelationships([], nodeMap);
    return;
  }

  orderedEdges.forEach((edge) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) return;

    const lane = document.createElement("div");
    lane.className = "flow-lane";

    lane.appendChild(createNodeCard(fromNode, "from"));
    lane.appendChild(createArrow());
    lane.appendChild(createChangeCard(edge, fromNode, toNode));
    lane.appendChild(createArrow());
    lane.appendChild(createNodeCard(toNode, "to"));
    lane.appendChild(createProfileCallout(toNode));

    flowSequence.appendChild(lane);
  });

  renderRelationships(orderedEdges, nodeMap);
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

function createNodeCard(node, role) {
  const card = document.createElement("article");
  card.className = `node-card node-card--${role}`;
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
  return card;
}

function createArrow() {
  const arrow = document.createElement("div");
  arrow.className = "flow-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  return arrow;
}

function createChangeCard(edge, fromNode, toNode) {
  const change = document.createElement("article");
  change.className = "change-card";

  const label = document.createElement("p");
  label.className = "change-label";
  label.textContent = edge.label || "Structural change";

  const detail = document.createElement("p");
  detail.className = "change-detail";
  detail.textContent = `Difference between ${fromNode.title} and ${toNode.title}`;

  change.appendChild(label);
  change.appendChild(detail);
  return change;
}

function createProfileCallout(node) {
  const profile = document.createElement("div");
  profile.className = "profile-callout";

  const heading = document.createElement("h4");
  heading.textContent = "Pharmacological profile";
  const description = document.createElement("p");
  description.textContent = node.profile || node.detail || "Profile not provided.";

  profile.appendChild(heading);
  profile.appendChild(description);
  return profile;
}

function buildTopology(nodes, edges) {
  const incoming = new Map();
  nodes.forEach((node) => incoming.set(node.id, 0));

  edges.forEach((edge) => {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  });

  const adjacency = new Map();
  edges.forEach((edge) => {
    const next = adjacency.get(edge.from) || [];
    next.push(edge);
    adjacency.set(edge.from, next);
  });

  const queue = [];
  incoming.forEach((count, id) => {
    if (count === 0) queue.push(id);
  });

  const ordered = [];
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();
    const outgoing = adjacency.get(current) || [];

    outgoing.forEach((edge) => {
      const key = `${edge.from}->${edge.to}-${edge.label || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      ordered.push(edge);

      const nextCount = (incoming.get(edge.to) || 0) - 1;
      incoming.set(edge.to, nextCount);
      if (nextCount === 0) queue.push(edge.to);
    });
  }

  edges.forEach((edge) => {
    const key = `${edge.from}->${edge.to}-${edge.label || ""}`;
    if (!seen.has(key)) ordered.push(edge);
  });

  return ordered;
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
