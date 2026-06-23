/**
 * ============================================================================
 * segmented-tabs.js — Плавный скользящий индикатор активной вкладки
 * ============================================================================
 *
 * Создаёт подвижную «подсветку», которая плавно переезжает от одной кнопки
 * к другой при переключении вкладок верхнего меню, вместо мгновенной смены
 * цвета. Чисто визуальное улучшение: при отсутствии нужных элементов модуль
 * молча ничего не делает и не ломает приложение.
 * ============================================================================
 */
(function () {
    'use strict';

    function initSegmentedIndicator() {
        const bar = document.getElementById('mainTabs');
        if (!bar || !bar.classList.contains('segmented-tabs')) return;
        if (bar.dataset.indicatorReady === 'true') return;
        bar.dataset.indicatorReady = 'true';

        // Создаём индикатор (если его ещё нет)
        let indicator = bar.querySelector('.seg-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'seg-indicator no-anim';
            indicator.setAttribute('aria-hidden', 'true');
            bar.insertBefore(indicator, bar.firstChild);
        }

        const getActive = () =>
            bar.querySelector('.nav-link.active') || bar.querySelector('.nav-link');

        const move = (animate) => {
            const active = getActive();
            if (!active) return;

            if (!animate) indicator.classList.add('no-anim');
            else indicator.classList.remove('no-anim');

            const left = active.offsetLeft;
            const top = active.offsetTop;
            const width = active.offsetWidth;
            const height = active.offsetHeight;

            indicator.style.width = width + 'px';
            indicator.style.height = height + 'px';
            indicator.style.transform = `translate(${left}px, ${top}px)`;

            if (!animate) {
                // Включаем анимацию на следующий кадр, чтобы стартовая
                // установка позиции не «проезжала» с нуля.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => indicator.classList.remove('no-anim'));
                });
            }
        };

        // Bootstrap бросает это событие на активированной кнопке (всплывает)
        bar.addEventListener('shown.bs.tab', () => move(true));

        // Подстраховка: реагируем на клик и сразу после смены классов
        bar.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link')) {
                requestAnimationFrame(() => move(true));
                setTimeout(() => move(true), 60);
            }
        });

        // Пересчёт при изменении размеров/ориентации (мобильные иконки, скролл)
        let resizeRaf = null;
        const onResize = () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => move(false));
        };
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        bar.addEventListener('scroll', () => move(false));

        // Первичная установка + повтор после загрузки шрифтов/иконок
        move(false);
        setTimeout(() => move(false), 120);
        setTimeout(() => move(false), 400);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => move(false));
        }
        window.addEventListener('load', () => move(false));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSegmentedIndicator);
    } else {
        initSegmentedIndicator();
    }
})();
