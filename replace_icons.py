import os
import re

# Mapping from FontAwesome to Lucide
icon_map = {
    'fa-project-diagram': 'network',
    'fa-circle-question': 'help-circle',
    'fa-moon': 'moon',
    'fa-expand': 'maximize',
    'fa-drafting-compass': 'pen-tool',
    'fa-play-circle': 'play-circle',
    'fa-chart-bar': 'bar-chart-2',
    'fa-book-open': 'book-open',
    'fa-info-circle': 'info',
    'fa-mouse-pointer': 'mouse-pointer-2',
    'fa-plus-circle': 'circle-dot',
    'fa-arrows-alt-h': 'move-horizontal',
    'fa-eraser': 'eraser',
    'fa-undo': 'undo-2',
    'fa-redo': 'redo-2',
    'fa-arrows-alt': 'arrow-right-left',
    'fa-random': 'shuffle',
    'fa-camera': 'camera',
    'fa-trash': 'trash',
    'fa-trash-alt': 'trash-2',
    'fa-crosshairs': 'crosshair',
    'fa-compress': 'minimize',
    'fa-download': 'download',
    'fa-save': 'save',
    'fa-upload': 'upload',
    'fa-book': 'book',
    'fa-route': 'route',
    'fa-history': 'history',
    'fa-user-graduate': 'graduation-cap',
    'fa-cogs': 'settings',
    'fa-code-branch': 'git-branch',
    'fa-border-all': 'layout-grid',
    'fa-code': 'code',
    'fa-chart-line': 'line-chart',
    'fa-balance-scale': 'scale',
    'fa-laptop-code': 'laptop',
    'fa-long-arrow-alt-right': 'arrow-right',
    'fa-weight-hanging': 'weight',
    'fa-circle': 'circle',
    'fa-calendar-alt': 'calendar',
    'fa-map-marker-alt': 'map-pin',
    'fa-trophy': 'trophy',
    'fa-university': 'landmark',
    'fa-quote-left': 'quote',
    'fa-lightbulb': 'lightbulb',
    'fa-check-circle': 'check-circle',
    'fa-exclamation-triangle': 'alert-triangle',
    'fa-table-cells': 'grid',
    'fa-file-code': 'file-code',
    'fa-calculator': 'calculator',
    'fa-thumbs-up': 'thumbs-up',
    'fa-check': 'check',
    'fa-times': 'x',
    'fa-map-marked-alt': 'map',
    'fa-network-wired': 'network',
    'fa-truck': 'truck',
    'fa-gamepad': 'gamepad-2',
    'fa-phone-alt': 'phone',
    'fa-robot': 'bot',
    'fa-rocket': 'rocket',
    'fa-wand-magic-sparkles': 'wand-2',
    'fa-pen-ruler': 'pen-tool',
    'fa-layer-group': 'layers',
    'fa-forward-step': 'step-forward',
    'fa-table': 'table',
    'fa-palette': 'palette',
    'fa-chalkboard-user': 'presentation',
    'fa-forward': 'fast-forward'
}

def replace_icons(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Regex to find <i class="fas fa-something"></i> or similar
    def replacer(match):
        classes = match.group(1).split()
        icon_name = next((c for c in classes if c.startswith('fa-')), None)
        
        if icon_name and icon_name in icon_map:
            lucide_icon = icon_map[icon_name]
            return f'<i data-lucide="{lucide_icon}"></i>'
        else:
            # If not found in map, strip fa- and use as fallback
            if icon_name:
                fallback = icon_name.replace('fa-', '')
                return f'<i data-lucide="{fallback}"></i>'
            return match.group(0)

    # Replaces <i class="fas fa-xxx"></i>
    content = re.sub(r'<i\s+class="[^"]*?(fa-[a-zA-Z0-9\-]+)[^"]*?">\s*</i>', replacer, content)

    # Replaces <i class='fas fa-xxx'></i>
    content = re.sub(r"<i\s+class='[^']*?(fa-[a-zA-Z0-9\-]+)[^']*?'>\s*</i>", replacer, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

def main():
    base_dir = r"e:\kursovaya\project"
    
    # Process HTML
    replace_icons(os.path.join(base_dir, 'index.html'))
    
    # Process JS
    js_dir = os.path.join(base_dir, 'js')
    for filename in os.listdir(js_dir):
        if filename.endswith('.js'):
            replace_icons(os.path.join(js_dir, filename))

if __name__ == "__main__":
    main()
