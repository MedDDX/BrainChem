"""Command-line utility to render a SMILES string as a 2D molecule image."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure RDKit installed from the system packages is importable even when a
# pyenv/virtualenv Python is active.
DIST_PACKAGES = Path("/usr/lib/python3/dist-packages")
if str(DIST_PACKAGES) not in sys.path:
    sys.path.append(str(DIST_PACKAGES))

from rdkit import Chem
from rdkit.Chem import AllChem, Draw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a 2D molecule drawing from a SMILES string.",
    )
    parser.add_argument(
        "smiles",
        help="Input SMILES string to draw.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("molecule.png"),
        help="Output image file (PNG). Defaults to molecule.png.",
    )
    parser.add_argument(
        "-s",
        "--size",
        type=int,
        default=400,
        help="Width and height (in pixels) of the output image. Defaults to 400.",
    )
    return parser.parse_args()


def smiles_to_image(smiles: str, output_path: Path, size: int = 400) -> Path:
    """Convert a SMILES string to a 2D PNG image using RDKit."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError("Invalid SMILES string")

    Chem.Kekulize(mol, clearAromaticFlags=True)
    AllChem.Compute2DCoords(mol)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    Draw.MolToFile(mol, str(output_path), size=(size, size))
    return output_path


def main() -> None:
    args = parse_args()
    try:
        path = smiles_to_image(args.smiles, args.output, args.size)
    except ValueError as exc:
        raise SystemExit(f"Error: {exc}")

    print(f"Saved 2D structure to {path}")


if __name__ == "__main__":
    main()
