import os
import json

ROOT = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

DOWNLOADS = os.path.join(ROOT, "downloaded_files")
SFX = os.path.join(ROOT, "anime_sfx")
WEBSITE = os.path.join(ROOT, "website")

DATA_FILE = os.path.join(WEBSITE, "data.json")

# ---- CONFIGURE THIS ----
# Base public URL for your R2 bucket (custom domain or r2.dev public URL).
# Example: "https://files.yourdomain.com" or
#          "https://pub-xxxxxxxx.r2.dev"
BASE_URL = "https://pub-5fbe92d8d61f481abbdda188a5106d8a.r2.dev"
# -------------------------

resources = []

for folder, _, files in os.walk(DOWNLOADS):
    for file in files:
        if file.startswith("."):
            continue

        path = os.path.join(folder, file)

        # relative path inside downloaded_files, e.g. "Presets/glitch_pack.zip"
        rel_path = os.path.relpath(path, DOWNLOADS).replace("\\", "/")

        # category = first folder under downloaded_files (Assets, Presets, etc.)
        category = rel_path.split("/")[0] if "/" in rel_path else "Misc"

        resources.append({
            "name": os.path.splitext(file)[0],
            "category": category,
            "file": f"{BASE_URL}/{rel_path}"
        })

# ----------------------------
# anime_sfx (sound effects, separate category)
# ----------------------------
for folder, _, files in os.walk(SFX):
    for file in files:
        if file.startswith("."):
            continue

        path = os.path.join(folder, file)
        rel_path = os.path.relpath(path, SFX).replace("\\", "/")

        resources.append({
            "name": os.path.splitext(file)[0],
            "category": "Anime SFX",
            "file": f"{BASE_URL}/anime_sfx/{rel_path}"
        })

os.makedirs(WEBSITE, exist_ok=True)

with open(DATA_FILE, "w", encoding="utf-8") as f:
    json.dump(resources, f, indent=2)

print(f"Built {len(resources)} total files")
