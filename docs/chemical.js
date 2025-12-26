const params = new URLSearchParams(window.location.search);
const chemicalId = params.get("id");
const statusEl = document.getElementById("status");
const flowContent = document.getElementById("flow-content");
const flowTrack = document.getElementById("flow-track");
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

  const nodeMap = new Map(flowchart.nodes.map((node) => [node.id, node]));
  const paths = buildTopology(flowchart.nodes, flowchart.edges || []);

  flowTrack.innerHTML = "";

  paths.forEach((path) => {
    const lane = document.createElement("div");
    lane.className = "flow-lane";

    path.forEach((entry, index) => {
      const cell = document.createElement("div");
      cell.className = "flow-cell";
      const card = createNodeCard(entry.node);
      cell.appendChild(card);
      lane.appendChild(cell);

      if (index < path.length - 1) {
        const connector = document.createElement("div");
        connector.className = "flow-connector";
        connector.innerHTML = `
          <span aria-hidden="true" class="arrow-icon">→</span>
          <span class="change-chip">${entry.nextLabel || "Structural tweak"}</span>
          <span aria-hidden="true" class="arrow-icon">→</span>
        `;
        connector.setAttribute(
          "aria-label",
          `Change from ${entry.node.title} to ${path[index + 1].node.title}: ${entry.nextLabel}`
        );
        lane.appendChild(connector);
      } else {
        const profile = document.createElement("p");
        profile.className = "profile-summary profile-summary--inline";
        const summary =
          entry.node.profile || entry.node.detail || "Pharmacological profile not provided.";
        profile.textContent = `Pharmacological profile: ${summary}`;
        lane.appendChild(profile);
      }
    });

    flowTrack.appendChild(lane);
  });

  renderRelationships(flowchart.edges || [], nodeMap);
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

function createNodeCard(node) {
  const card = document.createElement("article");
  card.className = "node-card node-card--compact";
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

function buildTopology(nodes, edges) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map();
  const indegree = new Map();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    indegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    if (adjacency.has(edge.from)) {
      adjacency.get(edge.from).push(edge);
    }
    if (indegree.has(edge.to)) {
      indegree.set(edge.to, indegree.get(edge.to) + 1);
    }
  });

  const roots = nodes.filter((node) => (indegree.get(node.id) || 0) === 0);
  const startingNodes = roots.length ? roots : [nodes[0]];

  const paths = [];
  const visited = new Set();

  function walk(node, trail) {
    const outgoing = adjacency.get(node.id) || [];
    if (!outgoing.length) {
      paths.push(trail);
      return;
    }

    outgoing.forEach((edge) => {
      const nextNode = nodeMap.get(edge.to);
      if (!nextNode || visited.has(`${node.id}-${edge.to}`)) return;
      const nextTrail = [...trail];
      nextTrail[nextTrail.length - 1].nextLabel = edge.label || "Structural tweak";
      nextTrail.push({ node: nextNode, nextLabel: null });
      visited.add(`${node.id}-${edge.to}`);
      walk(nextNode, nextTrail);
    });
  }

  startingNodes.forEach((start) => {
    if (!start) return;
    walk(start, [{ node: start, nextLabel: null }]);
  });

  return paths.length ? paths : [[{ node: nodes[0], nextLabel: null }]];
}
