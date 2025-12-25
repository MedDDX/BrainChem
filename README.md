# Chemistry-draw

Small helper script to render SMILES input into a 2D PNG molecule drawing using RDKit.

## Setup
Install RDKit from the Ubuntu repositories (already installed in this environment):

```bash
apt-get update
apt-get install -y python3-rdkit
```

## Usage
Run the script with a SMILES string. The default output file is `molecule.png` at 400×400 px.

```bash
python draw_smiles.py "CCO"          # Saves molecule.png in the current directory
python draw_smiles.py "c1ccccc1" -o benzene.png -s 500
```

If the SMILES string is invalid, the script exits with an error message.

## GitHub Pages site
A static gallery hosted from `docs/` lists example chemicals pulled from `docs/chemicals/chemicals.json`.

- Add or edit entries in the JSON file to change the gallery content.
- Push changes to `main` or `work` to trigger the GitHub Actions workflow that deploys the site.
- Preview locally with:

```bash
python -m http.server --directory docs 8000
```

Then open http://localhost:8000 in your browser.
