#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw

def generate_assets():
    workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_candidates = [
        '/home/al/.gemini/antigravity/brain/08d7f087-f708-43b1-abc3-70799d41109f/fitly_glassmorphic_icon_1785155443874.jpg',
        os.path.join(workspace, 'android/app/src/main/ic_launcher-web.png'),
        os.path.join(workspace, 'public/icon-512.png'),
        os.path.join(workspace, 'app/icon.png'),
    ]
    
    source_path = None
    for cand in source_candidates:
        if os.path.exists(cand):
            source_path = cand
            break

    if not source_path:
        print("Error: No source image found!")
        return

    print(f"Using source: {source_path}")
    source_img = Image.open(source_path).convert('RGBA')

    # If source is 1024x1024 artwork:
    # squircle crop is (128, 128, 896, 896) (768x768)
    if source_img.size == (1024, 1024):
        squircle_crop = source_img.crop((128, 128, 896, 896))
        master_img = source_img
    else:
        squircle_crop = source_img
        # If source is already squircle crop, embed in 1024x1024 canvas with dark border
        master_img = Image.new('RGBA', (1024, 1024), (7, 8, 10, 255))
        resized_sc = squircle_crop.resize((768, 768), Image.Resampling.LANCZOS)
        master_img.paste(resized_sc, (128, 128))

    # 1. Web Target Files
    web_targets = {
        'app/icon.png': (512, 512),
        'public/icon-192.png': (192, 192),
        'public/icon-512.png': (512, 512),
    }
    
    for rel_path, size in web_targets.items():
        out_path = os.path.join(workspace, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        resized = squircle_crop.resize(size, Image.Resampling.LANCZOS)
        resized.save(out_path, 'PNG')
        print(f"Generated web asset: {out_path} ({size[0]}x{size[1]} px)")
        
    # Generate favicon.ico (multi-resolution ICO)
    favicon_path = os.path.join(workspace, 'app/favicon.ico')
    os.makedirs(os.path.dirname(favicon_path), exist_ok=True)
    squircle_crop.save(
        favicon_path, 
        format='ICO', 
        sizes=[(16, 16), (32, 32), (48, 48), (256, 256)]
    )
    print(f"Generated favicon: {favicon_path}")

    # 2. Android Assets
    android_res = os.path.join(workspace, 'android/app/src/main/res')
    
    # Store / Web icon
    store_icon_path = os.path.join(workspace, 'android/app/src/main/ic_launcher-web.png')
    squircle_crop.resize((512, 512), Image.Resampling.LANCZOS).save(store_icon_path, 'PNG')
    print(f"Generated Android store asset: {store_icon_path}")

    # Background color XML
    values_dir = os.path.join(android_res, 'values')
    os.makedirs(values_dir, exist_ok=True)
    bg_xml_path = os.path.join(values_dir, 'ic_launcher_background.xml')
    with open(bg_xml_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <color name="ic_launcher_background">#07080A</color>\n')
        f.write('</resources>\n')
    print(f"Generated {bg_xml_path}")

    # Adaptive icon XMLs (anydpi-v26)
    anydpi_dir = os.path.join(android_res, 'mipmap-anydpi-v26')
    os.makedirs(anydpi_dir, exist_ok=True)

    adaptive_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
    for xml_name in ['ic_launcher.xml', 'ic_launcher_round.xml']:
        target_xml = os.path.join(anydpi_dir, xml_name)
        with open(target_xml, 'w', encoding='utf-8') as f:
            f.write(adaptive_xml)
        print(f"Generated {target_xml}")

    # Density buckets: (legacy_size, foreground_size)
    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432),
    }

    # Circular safe crop for legacy round icon
    circle_source = master_img.crop((512 - 410, 512 - 410, 512 + 410, 512 + 410))

    for folder, (legacy_size, fg_size) in densities.items():
        folder_path = os.path.join(android_res, folder)
        os.makedirs(folder_path, exist_ok=True)

        # 1. ic_launcher.png (legacy with squircle rounded corners)
        legacy_path = os.path.join(folder_path, 'ic_launcher.png')
        resized_legacy = squircle_crop.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)
        mask_legacy = Image.new('L', (legacy_size, legacy_size), 0)
        draw_legacy = ImageDraw.Draw(mask_legacy)
        draw_legacy.rounded_rectangle((0, 0, legacy_size, legacy_size), radius=int(legacy_size * 0.22), fill=255)
        legacy_icon = Image.new('RGBA', (legacy_size, legacy_size), (0, 0, 0, 0))
        legacy_icon.paste(resized_legacy, (0, 0), mask_legacy)
        legacy_icon.save(legacy_path, 'PNG')

        # 2. ic_launcher_round.png (legacy circular)
        round_path = os.path.join(folder_path, 'ic_launcher_round.png')
        resized_round = circle_source.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)
        mask_round = Image.new('L', (legacy_size, legacy_size), 0)
        draw_round = ImageDraw.Draw(mask_round)
        draw_round.ellipse((0, 0, legacy_size, legacy_size), fill=255)
        round_icon = Image.new('RGBA', (legacy_size, legacy_size), (0, 0, 0, 0))
        round_icon.paste(resized_round, (0, 0), mask_round)
        round_icon.save(round_path, 'PNG')

        # 3. ic_launcher_foreground.png (108dp canvas for adaptive icon)
        fg_path = os.path.join(folder_path, 'ic_launcher_foreground.png')
        resized_fg = master_img.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
        resized_fg.save(fg_path, 'PNG')

        print(f"Generated {folder}: ic_launcher ({legacy_size}px), ic_launcher_round ({legacy_size}px), ic_launcher_foreground ({fg_size}px)")

    print("\nAll Android & Web icon assets generated successfully!")

if __name__ == '__main__':
    generate_assets()
