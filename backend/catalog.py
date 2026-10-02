import json
from pathlib import Path
CATALOG = json.loads((Path(__file__).resolve().parents[1] / 'shared/catalog.json').read_text())
CATEGORIES = list(dict.fromkeys(t['category'] for t in CATALOG))
