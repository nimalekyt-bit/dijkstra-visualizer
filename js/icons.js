'use strict';

(function () {
    const iconClasses = {
        'alert-triangle': 'fas fa-exclamation-triangle',
        'arrow-right': 'fas fa-arrow-right',
        'bar-chart-2': 'fas fa-chart-bar',
        'bolt': 'fas fa-bolt',
        'book': 'fas fa-book',
        'book-open': 'fas fa-book-open',
        'bootstrap': 'fab fa-bootstrap',
        'bot': 'fas fa-robot',
        'bullseye': 'fas fa-bullseye',
        'calculator': 'fas fa-calculator',
        'calendar': 'fas fa-calendar',
        'camera': 'fas fa-camera',
        'check': 'fas fa-check',
        'check-circle': 'fas fa-check-circle',
        'circle': 'far fa-circle',
        'circle-dot': 'far fa-dot-circle',
        'clock-rotate-left': 'fas fa-history',
        'code': 'fas fa-code',
        'crosshair': 'fas fa-crosshairs',
        'css3-alt': 'fab fa-css3-alt',
        'cubes': 'fas fa-cubes',
        'database': 'fas fa-database',
        'download': 'fas fa-download',
        'eraser': 'fas fa-eraser',
        'expand-arrows-alt': 'fas fa-expand-arrows-alt',
        'fast-forward': 'fas fa-forward',
        'file-alt': 'fas fa-file-alt',
        'file-code': 'fas fa-file-code',
        'file-export': 'fas fa-file-export',
        'file-import': 'fas fa-file-import',
        'file-pdf': 'fas fa-file-pdf',
        'folder-open': 'fas fa-folder-open',
        'gamepad-2': 'fas fa-gamepad',
        'git-branch': 'fas fa-code-branch',
        'graduation-cap': 'fas fa-graduation-cap',
        'grid': 'fas fa-border-all',
        'help-circle': 'fas fa-question-circle',
        'history': 'fas fa-history',
        'html5': 'fab fa-html5',
        'icons': 'fas fa-icons',
        'info': 'fas fa-info-circle',
        'js-square': 'fab fa-js',
        'landmark': 'fas fa-landmark',
        'laptop': 'fas fa-laptop',
        'layers': 'fas fa-layer-group',
        'layout-grid': 'fas fa-th-large',
        'lightbulb': 'fas fa-lightbulb',
        'line-chart': 'fas fa-chart-line',
        'map': 'fas fa-map',
        'map-pin': 'fas fa-map-marker-alt',
        'maximize': 'fas fa-expand',
        'minus': 'fas fa-minus',
        'moon': 'fas fa-moon',
        'mouse-pointer-2': 'fas fa-mouse-pointer',
        'move-horizontal': 'fas fa-arrows-alt-h',
        'network': 'fas fa-project-diagram',
        'palette': 'fas fa-palette',
        'pause': 'fas fa-pause',
        'pen-tool': 'fas fa-pen-nib',
        'phone': 'fas fa-phone',
        'play': 'fas fa-play',
        'play-circle': 'fas fa-play-circle',
        'plus': 'fas fa-plus',
        'quote': 'fas fa-quote-left',
        'redo-2': 'fas fa-redo-alt',
        'rocket': 'fas fa-rocket',
        'rotate-left': 'fas fa-undo-alt',
        'route': 'fas fa-route',
        'save': 'fas fa-save',
        'scale': 'fas fa-balance-scale',
        'search': 'fas fa-search',
        'settings': 'fas fa-cog',
        'share-nodes': 'fas fa-share-alt',
        'shuffle': 'fas fa-random',
        'sitemap': 'fas fa-sitemap',
        'sort': 'fas fa-sort',
        'step-backward': 'fas fa-step-backward',
        'step-forward': 'fas fa-step-forward',
        'table': 'fas fa-table',
        'tachometer-alt': 'fas fa-tachometer-alt',
        'tag': 'fas fa-tag',
        'thumbs-down': 'fas fa-thumbs-down',
        'thumbs-up': 'fas fa-thumbs-up',
        'tools': 'fas fa-tools',
        'trash': 'fas fa-trash',
        'trash-2': 'fas fa-trash-alt',
        'trophy': 'fas fa-trophy',
        'truck': 'fas fa-truck',
        'undo-2': 'fas fa-undo-alt',
        'wand-2': 'fas fa-magic',
        'weight': 'fas fa-weight-hanging',
        'x': 'fas fa-times'
    };

    function renderIcon(element) {
        const iconName = element.getAttribute('data-lucide');
        const fallbackClass = iconClasses[iconName] || 'far fa-circle';

        element.className = `${fallbackClass} fa-fw app-icon`;
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('data-app-icon', 'true');
        element.textContent = '';
    }

    function createFallbackIcons(options = {}) {
        const root = options.root || document;
        root.querySelectorAll('[data-lucide]').forEach(renderIcon);
    }

    window.lucide = {
        ...(window.lucide || {}),
        createIcons: createFallbackIcons
    };

    // Первичный рендер всех иконок после загрузки разметки.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => createFallbackIcons());
    } else {
        createFallbackIcons();
    }

    // Авто-рендер иконок, добавленных в DOM динамически
    // (очередь приоритетов, список сохранённых графов, теория и т. д.).
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue; // только элементы
                if (node.hasAttribute && node.hasAttribute('data-lucide')) {
                    renderIcon(node);
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('[data-lucide]').forEach(renderIcon);
                }
            }
        }
    });

    function startObserver() {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.body) {
        startObserver();
    } else {
        document.addEventListener('DOMContentLoaded', startObserver);
    }
})();
