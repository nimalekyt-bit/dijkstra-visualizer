'use strict';

(function () {
    const dependencies = [
        { name: 'Cytoscape.js', isReady: () => typeof window.cytoscape === 'function' },
        { name: 'Chart.js', isReady: () => typeof window.Chart === 'function' },
        { name: 'jsPDF', isReady: () => !!(window.jspdf && window.jspdf.jsPDF) },
        { name: 'Bootstrap', isReady: () => !!(window.bootstrap && window.bootstrap.Modal) }
    ];

    // Необязательные библиотеки визуального слоя (js/enhancements.js).
    // Их отсутствие НЕ блокирует приложение — эффекты просто отключаются.
    const optionalDependencies = [
        { name: 'CountUp.js', isReady: () => !!(window.countUp && window.countUp.CountUp) },
        { name: 'AOS', isReady: () => !!window.AOS },
        { name: 'anime.js', isReady: () => typeof window.anime === 'function' },
        { name: 'particles.js', isReady: () => typeof window.particlesJS === 'function' }
    ];

    function reportOptional() {
        const missing = optionalDependencies
            .filter(dep => { try { return !dep.isReady(); } catch (e) { return true; } })
            .map(dep => dep.name);
        if (missing.length > 0 && window.console && console.info) {
            console.info('[GraphLab] Визуальные улучшения отключены (нет библиотек): ' + missing.join(', '));
        }
    }

    function getMissingDependencies() {
        return dependencies
            .filter(dependency => {
                try {
                    return !dependency.isReady();
                } catch (err) {
                    return true;
                }
            })
            .map(dependency => dependency.name);
    }

    function showDependencyError(missing) {
        const existing = document.getElementById('dependency-error');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'dependency-error';
        overlay.className = 'dependency-error';
        overlay.innerHTML = `
            <div class="dependency-error-card" role="alert">
                <h1>Не удалось загрузить библиотеки приложения</h1>
                <p>Проверьте, что папка <strong>vendor</strong> находится рядом с <strong>index.html</strong> и содержит локальные копии библиотек.</p>
                <div class="dependency-error-list">${missing.map(name => `<span>${name}</span>`).join('')}</div>
                <p class="dependency-error-hint">После восстановления файлов обновите страницу.</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    window.DependencyCheck = {
        getMissingDependencies,
        reportOptional,
        ensureReady() {
            const missing = getMissingDependencies();
            if (missing.length > 0) {
                showDependencyError(missing);
                return false;
            }
            reportOptional();
            return true;
        }
    };
})();
