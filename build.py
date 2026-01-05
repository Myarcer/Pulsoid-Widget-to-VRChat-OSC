#!/usr/bin/env python3
"""
Build script for PulsoidWidget to OSC releases.
Creates a clean zip excluding dev files, node_modules, and personal config.

Usage:
    python build.py 1.1.1
    python build.py  # reads version from package.json
"""

import sys
import os
import json
import shutil
import tempfile
from pathlib import Path

# Files/folders to include in the release
INCLUDE = [
    "code",
    "LICENSE",
    "README.md",
    "OSC_CONFIG_README.md",
    "osc_parameters.json",
    "package.json",
    "package-lock.json",
    "pulsoid_widget_osc.vrmanifest",
    "run.bat",
    "widget_id.txt.template",
]

def get_version_from_package():
    """Read version from package.json"""
    package_path = Path(__file__).parent / "package.json"
    with open(package_path, 'r') as f:
        data = json.load(f)
    return data.get("version", "0.0.0")

def build_release(version: str):
    """Build the release zip"""
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent  # Z:\Hearttrate
    zip_name = f"PulsoidWidget-to-OSC-v{version}"
    zip_path = output_dir / f"{zip_name}.zip"
    
    print(f"[BUILD] Creating release v{version}")
    print(f"[BUILD] Output: {zip_path}")
    
    # Create temp directory
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / zip_name
        temp_path.mkdir()
        
        # Copy included files
        for item in INCLUDE:
            src = script_dir / item
            dst = temp_path / item
            
            if not src.exists():
                print(f"[WARN] Missing: {item}")
                continue
            
            if src.is_dir():
                shutil.copytree(src, dst)
                print(f"[OK] Copied directory: {item}")
            else:
                shutil.copy2(src, dst)
                print(f"[OK] Copied file: {item}")
        
        # Create zip
        if zip_path.exists():
            zip_path.unlink()
        
        shutil.make_archive(
            str(output_dir / zip_name),
            'zip',
            temp_dir,
            zip_name
        )
    
    print(f"[BUILD] Done! Created: {zip_path}")
    print(f"[BUILD] Size: {zip_path.stat().st_size / 1024:.1f} KB")
    return zip_path

def main():
    if len(sys.argv) > 1:
        version = sys.argv[1]
    else:
        version = get_version_from_package()
        print(f"[INFO] No version specified, using package.json: v{version}")
    
    build_release(version)

if __name__ == "__main__":
    main()
