#!/usr/bin/env python3
import os
from PIL import Image

def generate_assets():
    source_path = '/home/al/.gemini/antigravity/brain/08d7f087-f708-43b1-abc3-70799d41109f/fitly_glassmorphic_icon_1785155443874.jpg'
    workspace = '/home/al/Projects/fitly'
    
    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    img = Image.open(source_path).convert('RGBA')
    # Crop squircle area (768x768 centered in 1024x1024)
    squircle_crop = img.crop((128, 128, 896, 896))
    
    # Target files
    targets = {
        'app/icon.png': (512, 512),
        'public/icon-192.png': (192, 192),
        'public/icon-512.png': (512, 512),
    }
    
    for rel_path, size in targets.items():
        out_path = os.path.join(workspace, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        resized = squircle_crop.resize(size, Image.Resampling.LANCZOS)
        resized.save(out_path, 'PNG')
        print(f"Generated asset: {out_path} ({size[0]}x{size[1]} px)")
        
    # Generate favicon.ico (multi-resolution ICO)
    favicon_path = os.path.join(workspace, 'app/favicon.ico')
    os.makedirs(os.path.dirname(favicon_path), exist_ok=True)
    squircle_crop.save(
        favicon_path, 
        format='ICO', 
        sizes=[(16, 16), (32, 32), (48, 48), (256, 256)]
    )
    print(f"Generated favicon: {favicon_path}")

if __name__ == '__main__':
    generate_assets()
