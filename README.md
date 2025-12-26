# BrainChem

An interactive, static “chemical storyboard” that showcases related molecules and the structural tweaks that connect them. The project includes two pieces:

* A GitHub Pages experience (served from `docs/`) that lists molecules, supports search, and opens a detailed flow chart where each node is a SMILES-drawn structure connected by labeled arrows that describe how one structure differs from the next.
* A companion CLI utility (`draw_smiles.py`) that turns any SMILES string into a 2D PNG using RDKit.

## Setup
Install RDKit from the Ubuntu repositories (already installed in this environment):

```bash
apt-get update
apt-get install -y python3-rdkit
```

## CLI usage
Render a SMILES string to PNG. The default output is `molecule.png` at 400×400 px.

```bash
python draw_smiles.py "CCO"          # Saves molecule.png in the current directory
python draw_smiles.py "c1ccccc1" -o benzene.png -s 500
```

If the SMILES string is invalid, the script exits with an error message.

## GitHub Pages experience
The static site reads molecules from `docs/chemicals/chemicals.json` and offers:

- A searchable gallery that matches name, formula, or SMILES.
- Clickable cards that open a dedicated flow-chart page for each molecule.
- SMILES-drawn canvases for every node, with graceful fallbacks when parsing fails.

### Editing the dataset
Each entry in `docs/chemicals/chemicals.json` follows this rough shape:

```json
{
  "id": "unique-id",
  "name": "Display name",
  "formula": "C2H6O",
  "smiles": "CCO",
  "description": "Short overview.",
  "notes": "Optional footnote under the card.",
  "flowchart": {
    "title": "Optional heading for the flow view",
    "subtitle": "Optional subheading",
    "nodes": [
      {
        "id": "start",
        "title": "Base",
        "smiles": "CCO",
        "detail": "Optional text",
        "profile": "Pharmacology or behavior badge"
      }
    ],
    "edges": [
      { "from": "start", "to": "variant", "label": "methylated" }
    ]
  }
}
```

- Nodes are automatically organized into flow lanes using the directed edges; each edge label becomes the "difference" chip between two molecules.
- `profile` surfaces the pharmacological or chemical behavior badge shown on each node and in the transformation callouts.
- Add, edit, or remove objects to expand the gallery or tweak a specific storyboard.

### Preview locally
Serve the static files from `docs/` and open the site in your browser:

```bash
python -m http.server --directory docs 8000
```

Visit http://localhost:8000 for the gallery, and click any card to view its flow chart.
