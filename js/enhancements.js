'use strict';

/**
 * enhancements.js — необязательный визуальный слой «живости».
 *
 * Все эффекты подключаются ЗАЩИТНО: если соответствующая библиотека
 * (CountUp / AOS / particles.js / anime.js) не загрузилась, код тихо
 * деградирует и базовый функционал приложения не страдает. Это согласуется
 * с офлайн-first архитектурой проекта.
 */
(function () {
    const reduceMotion = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const FX = {};

    /**
     * Анимированный числовой счётчик. При отсутствии CountUp или при
     * включённом prefers-reduced-motion просто проставляет значение.
     */
    FX.count = function (el, value) {
        if (!el) return;
        const num = Number(value);
        const CountUpCtor = window.countUp && window.countUp.CountUp;
        if (reduceMotion || !CountUpCtor || !isFinite(num)) {
            el.textContent = value;
            return;
        }
        const from = Number(String(el.textContent).replace(/[^\d.-]/g, '')) || 0;
        if (from === num) { el.textContent = value; return; }
        try {
            const counter = new CountUpCtor(el, num, {
                startVal: from,
                duration: 0.8,
                separator: ' '
            });
            if (counter.error) { el.textContent = value; return; }
            counter.start();
        } catch (e) {
            el.textContent = value;
        }
    };

    window.GraphLabFX = FX;

    function initAOS() {
        if (!window.AOS) return;
        try {
            window.AOS.init({
                duration: 600,
                easing: 'ease-out-cubic',
                once: true,
                offset: 50,
                disable: reduceMotion
            });
        } catch (e) { /* no-op */ }
    }

    // Пересчёт позиций AOS при переключении вкладок (контент Теории/Анализа
    // появляется в скрытых панелях и должен «проявиться» при показе).
    function wireAOSRefresh() {
        if (!window.AOS) return;
        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(btn => {
            btn.addEventListener('shown.bs.tab', () => {
                try { window.AOS.refreshHard(); } catch (e) { /* no-op */ }
            });
        });
    }

    function initParticles() {
        const el = document.getElementById('about-particles');
        if (!el || reduceMotion || !window.particlesJS || el.dataset.inited) return;
        el.dataset.inited = '1';
        try {
            window.particlesJS('about-particles', {
                particles: {
                    number: { value: 46, density: { enable: true, value_area: 800 } },
                    color: { value: '#3b82f6' },
                    shape: { type: 'circle' },
                    opacity: { value: 0.5, random: true },
                    size: { value: 3, random: true },
                    line_linked: { enable: true, distance: 150, color: '#6366f1', opacity: 0.35, width: 1 },
                    move: { enable: true, speed: 1.4, direction: 'none', out_mode: 'out' }
                },
                interactivity: {
                    detect_on: 'canvas',
                    events: {
                        onhover: { enable: true, mode: 'grab' },
                        onclick: { enable: true, mode: 'push' },
                        resize: true
                    },
                    modes: {
                        grab: { distance: 160, line_linked: { opacity: 0.6 } },
                        push: { particles_nb: 3 }
                    }
                },
                retina_detect: true
            });
        } catch (e) { /* no-op */ }
    }

    // Лёгкая stagger-анимация появления вкладок навигации на первом рендере.
    function animateNav() {
        if (reduceMotion || !window.anime) return;
        const items = document.querySelectorAll('.segmented-tabs .nav-link');
        if (!items.length) return;
        try {
            window.anime({
                targets: items,
                translateY: [-8, 0],
                opacity: [0, 1],
                delay: window.anime.stagger(60, { start: 120 }),
                duration: 520,
                easing: 'easeOutCubic'
            });
        } catch (e) { /* no-op */ }
    }

    function init() {
        initAOS();
        wireAOSRefresh();
        initParticles();
        animateNav();
        // particles инициализируем и при первом открытии вкладки «О проекте»
        const aboutTab = document.getElementById('nav-about');
        if (aboutTab) aboutTab.addEventListener('shown.bs.tab', initParticles);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
