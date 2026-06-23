/**
 * ============================================================================
 * help.js — Пользовательская инструкция и приветственное окно
 * ============================================================================
 *
 * Роль: отдельный модуль помощи. Создаёт модальные окна, переключает разделы
 * инструкции и хранит состояние первого запуска в LocalStorage.
 * ============================================================================
 */

'use strict';

class HelpModule {
    constructor() {
        this.WELCOME_KEY = 'dijkstra_welcome_seen';
        this.sections = this._createSections();
        this.activeSectionId = this.sections[0].id;
        this.helpOverlay = null;
        this.welcomeOverlay = null;
        this.lastFocusedElement = null;
        this.focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        this.miniDemoStep = 0;
        this.miniDemoSteps = [
            {
                title: 'Стартовая вершина',
                text: 'Алгоритм начинает с вершины A: расстояние до неё равно 0, остальные расстояния считаются бесконечными.',
                active: ['a'],
                path: []
            },
            {
                title: 'Обновление расстояний',
                text: 'Из A проверяются рёбра к B и C. Получаем предварительные расстояния: B = 4, C = 2.',
                active: ['b', 'c'],
                path: ['ab', 'ac']
            },
            {
                title: 'Минимальная вершина',
                text: 'Среди непосещённых вершин минимальное расстояние у C. Алгоритм выбирает C и релаксирует ребро C → B.',
                active: ['c'],
                path: ['ac', 'cb']
            },
            {
                title: 'Кратчайший путь',
                text: 'После обновлений лучший путь до D: A → C → B → D, стоимость 6.',
                active: ['a', 'c', 'b', 'd'],
                path: ['ac', 'cb', 'bd']
            }
        ];
    }

    init() {
        this._renderHelpModal();
        this._renderWelcomeModal();
        this._bindEvents();

        if (!this._isWelcomeSeen()) {
            setTimeout(() => this.openWelcome(), 350);
        }
    }

    openHelp(sectionId) {
        if (sectionId) this.activeSectionId = sectionId;
        this.lastFocusedElement = document.activeElement;
        this._renderActiveSection();
        this.helpOverlay.classList.add('active');
        this.helpOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open-custom');
        this._focusFirstElement(this.helpOverlay);
    }

    closeHelp() {
        this.helpOverlay.classList.remove('active');
        this.helpOverlay.setAttribute('aria-hidden', 'true');
        this._releaseBodyLockIfIdle();
        this._restoreFocus();
    }

    openWelcome() {
        this.lastFocusedElement = document.activeElement;
        this.welcomeOverlay.classList.add('active');
        this.welcomeOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open-custom');
        this._focusFirstElement(this.welcomeOverlay);
    }

    closeWelcome(markSeen = true) {
        if (markSeen) this._markWelcomeSeen();
        this.welcomeOverlay.classList.remove('active');
        this.welcomeOverlay.setAttribute('aria-hidden', 'true');
        this._releaseBodyLockIfIdle();
        this._restoreFocus();
    }

    resetWelcome() {
        localStorage.removeItem(this.WELCOME_KEY);
        this.openWelcome();
    }

    _bindEvents() {
        const helpButton = document.getElementById('btn-help');
        const resetWelcomeButton = document.getElementById('btn-show-welcome-again');

        if (helpButton) {
            helpButton.addEventListener('click', () => this.openHelp());
        }

        if (resetWelcomeButton) {
            resetWelcomeButton.addEventListener('click', () => this.resetWelcome());
        }

        document.addEventListener('keydown', (event) => {
            const activeOverlay = this._getActiveOverlay();
            if (!activeOverlay) return;

            if (event.key === 'Escape') {
                if (activeOverlay === this.helpOverlay) this.closeHelp();
                if (activeOverlay === this.welcomeOverlay) this.closeWelcome();
                return;
            }

            if (event.key === 'Tab') {
                this._trapFocus(event, activeOverlay);
            }
        });
    }

    _renderHelpModal() {
        this.helpOverlay = document.createElement('div');
        this.helpOverlay.className = 'help-overlay';
        this.helpOverlay.setAttribute('aria-hidden', 'true');
        this.helpOverlay.innerHTML = `
            <div class="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
                <div class="help-header">
                    <div>
                        <h2 id="help-title"><i data-lucide="book-open"></i> Как пользоваться визуализатором алгоритмов на графах</h2>
                        <p>Пошаговая инструкция для построения графов, выбора алгоритма и подготовки демонстрации.</p>
                    </div>
                    <button class="help-close" type="button" title="Закрыть инструкцию" aria-label="Закрыть инструкцию"><i data-lucide="x"></i></button>
                </div>
                <div class="help-layout">
                    <nav class="help-nav" aria-label="Разделы инструкции"></nav>
                    <main class="help-content" id="help-content"></main>
                </div>
            </div>
        `;

        document.body.appendChild(this.helpOverlay);

        const nav = this.helpOverlay.querySelector('.help-nav');
        nav.innerHTML = this.sections.map(section => `
            <button class="help-nav-item" type="button" data-section="${section.id}">
                <i class="${section.icon}"></i>
                <span>${section.title}</span>
            </button>
        `).join('');

        this.helpOverlay.querySelector('.help-close').addEventListener('click', () => this.closeHelp());
        this.helpOverlay.addEventListener('click', (event) => {
            if (event.target === this.helpOverlay) this.closeHelp();
        });

        this.helpOverlay.querySelectorAll('.help-nav-item').forEach(button => {
            button.addEventListener('click', () => {
                this.activeSectionId = button.dataset.section;
                this._renderActiveSection();
            });
        });

        this._renderActiveSection();
    }

    _renderWelcomeModal() {
        this.welcomeOverlay = document.createElement('div');
        this.welcomeOverlay.className = 'welcome-overlay';
        this.welcomeOverlay.setAttribute('aria-hidden', 'true');
        this.welcomeOverlay.innerHTML = `
            <div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
                <button class="welcome-close" type="button" title="Закрыть приветствие" aria-label="Закрыть приветствие"><i data-lucide="x"></i></button>
                <div class="welcome-icon"><i data-lucide="network"></i></div>
                <h2 id="welcome-title">Добро пожаловать в визуализатор алгоритмов на графах</h2>
                <p>Это приложение позволяет создавать графы, сравнивать Дейкстру, Беллмана-Форда и Флойда-Уоршелла и наблюдать поиск кратчайшего пути. Начните с генерации графа или откройте инструкцию.</p>
                <div class="welcome-actions">
                    <button class="btn-primary-custom" id="btn-welcome-help" type="button"><i data-lucide="book-open"></i> Открыть инструкцию</button>
                    <button class="btn-outline-custom" id="btn-welcome-start" type="button"><i data-lucide="check"></i> Начать работу</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.welcomeOverlay);

        this.welcomeOverlay.querySelector('.welcome-close').addEventListener('click', () => this.closeWelcome());
        this.welcomeOverlay.querySelector('#btn-welcome-start').addEventListener('click', () => this.closeWelcome());
        this.welcomeOverlay.querySelector('#btn-welcome-help').addEventListener('click', () => {
            this.closeWelcome();
            this.openHelp();
        });
        this.welcomeOverlay.addEventListener('click', (event) => {
            if (event.target === this.welcomeOverlay) this.closeWelcome();
        });
    }

    _renderActiveSection() {
        const activeSection = this.sections.find(section => section.id === this.activeSectionId) || this.sections[0];
        const content = this.helpOverlay.querySelector('#help-content');

        this.helpOverlay.querySelectorAll('.help-nav-item').forEach(button => {
            button.classList.toggle('active', button.dataset.section === activeSection.id);
        });

        content.innerHTML = `
            <article class="help-section">
                <div class="help-section-title">
                    <i class="${activeSection.icon}"></i>
                    <h3>${activeSection.title}</h3>
                </div>
                ${activeSection.content}
            </article>
        `;
        content.scrollTop = 0;
        this._setupMiniDemo();
    }

    _setupMiniDemo() {
        const nextButton = this.helpOverlay.querySelector('#btn-mini-next');
        const resetButton = this.helpOverlay.querySelector('#btn-mini-reset');
        if (!nextButton || !resetButton) return;

        const update = () => this._renderMiniDemoStep();
        nextButton.addEventListener('click', () => {
            this.miniDemoStep = Math.min(this.miniDemoStep + 1, this.miniDemoSteps.length - 1);
            update();
        });
        resetButton.addEventListener('click', () => {
            this.miniDemoStep = 0;
            update();
        });
        update();
    }

    _renderMiniDemoStep() {
        const step = this.miniDemoSteps[this.miniDemoStep];
        const title = this.helpOverlay.querySelector('#mini-demo-title');
        const text = this.helpOverlay.querySelector('#mini-demo-text');
        if (!step || !title || !text) return;

        title.textContent = `${this.miniDemoStep + 1}. ${step.title}`;
        text.textContent = step.text;

        this.helpOverlay.querySelectorAll('.mini-node').forEach(node => {
            node.classList.toggle('active', step.active.includes(node.dataset.node));
        });

        this.helpOverlay.querySelectorAll('.mini-edge').forEach(edge => {
            edge.classList.toggle('active', step.path.includes(edge.dataset.edge));
        });
    }

    _isWelcomeSeen() {
        return localStorage.getItem(this.WELCOME_KEY) === 'true';
    }

    _markWelcomeSeen() {
        localStorage.setItem(this.WELCOME_KEY, 'true');
    }

    _releaseBodyLockIfIdle() {
        if (!this.helpOverlay.classList.contains('active') && !this.welcomeOverlay.classList.contains('active')) {
            document.body.classList.remove('modal-open-custom');
        }
    }

    _getActiveOverlay() {
        if (this.helpOverlay.classList.contains('active')) return this.helpOverlay;
        if (this.welcomeOverlay.classList.contains('active')) return this.welcomeOverlay;
        return null;
    }

    _focusFirstElement(overlay) {
        const focusable = this._getFocusableElements(overlay);
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }

    _restoreFocus() {
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
            this.lastFocusedElement.focus();
        }
        this.lastFocusedElement = null;
    }

    _trapFocus(event, overlay) {
        const focusable = this._getFocusableElements(overlay);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    _getFocusableElements(overlay) {
        return Array.from(overlay.querySelectorAll(this.focusableSelector))
            .filter(element => !element.disabled && element.getClientRects().length > 0);
    }

    _createSections() {
        return [
            {
                id: 'quick-start',
                title: 'Быстрый старт',
                icon: 'fas fa-rocket',
                content: `
                    <ol class="help-steps">
                        <li>Откройте вкладку «Конструктор».</li>
                        <li>Создайте граф вручную или нажмите «Сгенерировать».</li>
                        <li>Перейдите во вкладку «Алгоритм».</li>
                        <li>Выберите начальную и конечную вершины.</li>
                        <li>Нажмите кнопку запуска.</li>
                        <li>Наблюдайте за пошаговой визуализацией.</li>
                        <li>После завершения изучите найденный путь, стоимость, таблицу расстояний и очередь приоритетов.</li>
                    </ol>
                `
            },
            {
                id: 'mini-demo',
                title: 'Мини-демо алгоритма',
                icon: 'fas fa-wand-magic-sparkles',
                content: `
                    <div class="mini-demo">
                        <div class="mini-demo-graph" aria-label="Мини-демо алгоритма Дейкстры">
                            <svg class="mini-demo-svg" viewBox="0 0 480 260" role="img" aria-label="Граф A, B, C, D с весами рёбер">
                                <g class="mini-demo-edges">
                                    <line class="mini-edge" data-edge="ab" x1="72" y1="130" x2="330" y2="62"></line>
                                    <line class="mini-edge" data-edge="ac" x1="72" y1="130" x2="210" y2="190"></line>
                                    <line class="mini-edge" data-edge="cb" x1="210" y1="190" x2="330" y2="62"></line>
                                    <line class="mini-edge" data-edge="bd" x1="330" y1="62" x2="410" y2="138"></line>
                                    <line class="mini-edge" data-edge="cd" x1="210" y1="190" x2="410" y2="138"></line>
                                </g>
                                <g class="mini-demo-labels">
                                    <text class="mini-edge-label" x="198" y="87">4</text>
                                    <text class="mini-edge-label" x="137" y="173">2</text>
                                    <text class="mini-edge-label" x="264" y="132">1</text>
                                    <text class="mini-edge-label" x="374" y="89">3</text>
                                    <text class="mini-edge-label" x="306" y="181">7</text>
                                </g>
                                <g class="mini-node" data-node="a" transform="translate(72 130)">
                                    <circle r="22"></circle>
                                    <text y="6">A</text>
                                </g>
                                <g class="mini-node" data-node="b" transform="translate(330 62)">
                                    <circle r="22"></circle>
                                    <text y="6">B</text>
                                </g>
                                <g class="mini-node" data-node="c" transform="translate(210 190)">
                                    <circle r="22"></circle>
                                    <text y="6">C</text>
                                </g>
                                <g class="mini-node" data-node="d" transform="translate(410 138)">
                                    <circle r="22"></circle>
                                    <text y="6">D</text>
                                </g>
                            </svg>
                        </div>
                        <div class="mini-demo-panel">
                            <h4 id="mini-demo-title">Стартовая вершина</h4>
                            <p id="mini-demo-text">Алгоритм начинает с вершины A: расстояние до неё равно 0, остальные расстояния считаются бесконечными.</p>
                            <div class="mini-demo-controls">
                                <button class="btn-primary-custom btn-sm-custom" id="btn-mini-next" type="button"><i data-lucide="fast-forward"></i> Следующий шаг</button>
                                <button class="btn-outline-custom btn-sm-custom" id="btn-mini-reset" type="button"><i data-lucide="undo-2"></i> Сброс</button>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                id: 'manual-graph',
                title: 'Создание графа вручную',
                icon: 'fas fa-pen-ruler',
                content: `
                    <ol class="help-steps">
                        <li>Нажмите кнопку «Вершина».</li>
                        <li>Кликните по рабочей области, чтобы добавить вершину.</li>
                        <li>Повторите действие для создания нескольких вершин.</li>
                        <li>Нажмите кнопку «Ребро».</li>
                        <li>Выберите первую вершину.</li>
                        <li>Выберите вторую вершину.</li>
                        <li>Введите вес ребра.</li>
                        <li>Нажмите «Сохранить».</li>
                    </ol>
                    <div class="help-note">
                        <p>Вес ребра показывает стоимость перехода между вершинами.</p>
                        <p>Отрицательные веса можно вводить для Беллмана-Форда и Флойда-Уоршелла. Дейкстра при таких рёбрах будет недоступна.</p>
                        <p>В неориентированном графе ребро работает в обе стороны, а в ориентированном — только по направлению стрелки.</p>
                    </div>
                `
            },
            {
                id: 'random-graph',
                title: 'Генерация случайного графа',
                icon: 'fas fa-random',
                content: `
                    <ol class="help-steps">
                        <li>В правой панели задайте количество вершин.</li>
                        <li>Укажите минимальный и максимальный вес ребра.</li>
                        <li>Настройте плотность графа.</li>
                        <li>Нажмите «Сгенерировать».</li>
                    </ol>
                    <div class="help-note">
                        <p>Чем выше плотность, тем больше рёбер будет создано.</p>
                        <p>Для демонстрации лучше использовать 6–10 вершин.</p>
                        <p>Для анализа производительности можно использовать большие графы.</p>
                    </div>
                `
            },
            {
                id: 'run-algorithm',
                title: 'Запуск алгоритма',
                icon: 'fas fa-play-circle',
                content: `
                    <ol class="help-steps">
                        <li>Перейдите во вкладку «Алгоритм».</li>
                        <li>В поле «Алгоритм» выберите Дейкстру, Беллмана-Форда или Флойда-Уоршелла.</li>
                        <li>В поле «Начало» выберите стартовую вершину.</li>
                        <li>В поле «Конец» выберите конечную вершину.</li>
                        <li>Нажмите кнопку запуска.</li>
                    </ol>
                    <p>После запуска приложение показывает найденный кратчайший путь, стоимость пути, количество шагов, время выполнения, таблицу расстояний и служебное состояние выбранного алгоритма.</p>
                    <div class="help-note">
                        <p>Если граф содержит больше 100 вершин, используйте кнопку «Рассчитать без визуализации»: алгоритм выполнится быстро и сразу покажет итог.</p>
                        <p>Для Флойда-Уоршелла дополнительно отображается матрица расстояний между всеми парами вершин.</p>
                    </div>
                `
            },
            {
                id: 'algorithm-choice',
                title: 'Выбор алгоритма',
                icon: 'fas fa-code-branch',
                content: `
                    <div class="help-grid">
                        <div><strong>Дейкстра</strong><span>Быстрый вариант для графов без отрицательных весов. Сложность O((V + E) log V).</span></div>
                        <div><strong>Беллман-Форд</strong><span>Поддерживает отрицательные веса и обнаруживает отрицательные циклы. Сложность O(V·E).</span></div>
                        <div><strong>Флойд-Уоршелл</strong><span>Находит кратчайшие пути между всеми парами вершин и показывает итоговую матрицу. Сложность O(V³).</span></div>
                    </div>
                    <div class="help-note">
                        <p>Если в графе есть отрицательный вес, выберите Беллмана-Форда или Флойда-Уоршелла.</p>
                        <p>Если алгоритм обнаружит отрицательный цикл, кратчайший путь не определён: стоимость можно уменьшать бесконечно.</p>
                    </div>
                `
            },
            {
                id: 'new-features',
                title: 'Дополнительные функции',
                icon: 'fas fa-layer-group',
                content: `
                    <ul class="help-list">
                        <li><strong>Подсветка соседей:</strong> в режиме выделения кликните по вершине, чтобы увидеть соседние вершины, рёбра и веса. В ориентированном графе отдельно показаны входящие и исходящие соседи.</li>
                        <li><strong>Undo/Redo:</strong> кнопки со стрелками и горячие клавиши Ctrl+Z / Ctrl+Y отменяют и повторяют действия конструктора.</li>
                        <li><strong>Имена вершин:</strong> дважды кликните по вершине в режиме выделения, чтобы задать короткую пользовательскую подпись.</li>
                        <li><strong>Вес ребра:</strong> дважды кликните по ребру, чтобы изменить его вес.</li>
                        <li><strong>Масштаб:</strong> плавающие кнопки +, − и Fit помогают быстро приблизить, отдалить или вписать граф.</li>
                        <li><strong>Упорядочить граф:</strong> кнопка с волшебной палочкой автоматически раскладывает вершины так, чтобы граф было удобнее читать и показывать на защите.</li>
                        <li><strong>Автосохранение:</strong> последний граф, тип графа, позиции вершин, тема и скорость визуализации сохраняются автоматически.</li>
                        <li><strong>Мини-демо:</strong> отдельный раздел справки показывает ход алгоритма на маленьком примере.</li>
                        <li><strong>Только расчёт:</strong> быстрый запуск без подробной истории шагов для больших графов.</li>
                        <li><strong>История действий:</strong> последние операции отображаются в боковой панели конструктора.</li>
                        <li><strong>Сортировка таблицы:</strong> нажмите на заголовки таблицы расстояний, чтобы отсортировать строки.</li>
                        <li><strong>PDF-отчёт:</strong> после запуска алгоритма нажмите PDF в блоке экспорта результата. В отчёт попадут параметры графа, список рёбер, итоговый путь и таблица расстояний.</li>
                    </ul>
                `
            },
            {
                id: 'step-visualization',
                title: 'Пошаговая визуализация',
                icon: 'fas fa-forward-step',
                content: `
                    <div class="help-grid">
                        <div><strong>Старт</strong><span>Запускает алгоритм.</span></div>
                        <div><strong>Пауза</strong><span>Временно останавливает визуализацию.</span></div>
                        <div><strong>Продолжить</strong><span>Возобновляет выполнение.</span></div>
                        <div><strong>Следующий шаг</strong><span>Показывает следующий этап алгоритма.</span></div>
                        <div><strong>Предыдущий шаг</strong><span>Возвращает предыдущий этап.</span></div>
                        <div><strong>Сброс</strong><span>Очищает результат и возвращает граф в исходное состояние.</span></div>
                        <div><strong>Ползунок скорости</strong><span>Меняет скорость анимации.</span></div>
                    </div>
                    <div class="help-note">
                        <p>Во время работы выбирается вершина с минимальным текущим расстоянием.</p>
                        <p>Затем проверяются соседние вершины. Если найден более короткий путь, расстояние обновляется.</p>
                        <p>После завершения кратчайший путь выделяется красным.</p>
                    </div>
                `
            },
            {
                id: 'results',
                title: 'Анализ результатов',
                icon: 'fas fa-table',
                content: `
                    <p>После завершения алгоритма пользователь видит путь в виде последовательности вершин, например 0 → 3 → 7, стоимость пути, количество шагов, время выполнения, таблицу расстояний и предшественников вершин.</p>
                    <ul class="help-list">
                        <li><strong>Расстояние</strong> — минимальная найденная стоимость пути от стартовой вершины.</li>
                        <li><strong>Предшественник</strong> — вершина, через которую был найден лучший путь.</li>
                        <li><strong>∞</strong> — вершина недостижима из стартовой.</li>
                    </ul>
                `
            },
            {
                id: 'performance',
                title: 'Анализ производительности',
                icon: 'fas fa-chart-line',
                content: `
                    <ol class="help-steps">
                        <li>Перейдите во вкладку «Анализ».</li>
                        <li>Нажмите «Запустить бенчмарк».</li>
                        <li>Дождитесь окончания тестирования.</li>
                        <li>Изучите таблицу и график.</li>
                    </ol>
                    <div class="help-note">
                        <p>Тестируются графы разных размеров.</p>
                        <p>Измеряется время работы алгоритма и количество операций.</p>
                        <p>Результаты помогают сравнить практическую работу алгоритмов с теоретической сложностью: O((V + E) log V), O(V·E) и O(V³).</p>
                    </div>
                `
            },
            {
                id: 'storage',
                title: 'Сохранение и загрузка',
                icon: 'fas fa-save',
                content: `
                    <ul class="help-list">
                        <li><strong>Сохранить</strong> — сохраняет текущий граф в браузере.</li>
                        <li><strong>JSON</strong> — экспортирует граф в файл.</li>
                        <li><strong>Импорт</strong> — загружает граф из JSON-файла.</li>
                        <li><strong>TXT</strong> — экспортирует результат поиска.</li>
                        <li><strong>PDF</strong> — формирует отчёт по последнему запуску алгоритма со списком рёбер и таблицей расстояний.</li>
                        <li><strong>PNG</strong> — сохраняет изображение графа.</li>
                        <li><strong>Автосохранение</strong> — предлагает восстановить последний граф при повторном открытии сайта.</li>
                    </ul>
                `
            },
            {
                id: 'legend',
                title: 'Легенда цветов',
                icon: 'fas fa-palette',
                content: `
                    <div class="help-legend-list">
                        <div><span class="legend-dot legend-blue"></span><strong>Синий</strong><span>вершина ещё не обработана</span></div>
                        <div><span class="legend-dot legend-yellow"></span><strong>Жёлтый</strong><span>вершина находится в очереди приоритетов</span></div>
                        <div><span class="legend-dot legend-green"></span><strong>Зелёный</strong><span>вершина обработана</span></div>
                        <div><span class="legend-dot legend-red"></span><strong>Красный</strong><span>вершина входит в найденный кратчайший путь</span></div>
                        <div><span class="legend-line legend-gray"></span><strong>Серое ребро</strong><span>обычное ребро графа</span></div>
                        <div><span class="legend-line legend-red-line"></span><strong>Красное ребро</strong><span>ребро найденного кратчайшего пути</span></div>
                    </div>
                `
            },
            {
                id: 'mistakes',
                title: 'Частые ошибки',
                icon: 'fas fa-triangle-exclamation',
                content: `
                    <div class="help-errors">
                        <div><strong>Не выбраны начальная и конечная вершины.</strong><span>Выберите обе вершины во вкладке «Алгоритм».</span></div>
                        <div><strong>Граф пустой.</strong><span>Создайте граф вручную или нажмите «Сгенерировать».</span></div>
                        <div><strong>Между вершинами нет пути.</strong><span>Добавьте рёбра или выберите другую пару вершин.</span></div>
                        <div><strong>Дейкстра не запускается при отрицательном весе.</strong><span>Выберите Беллмана-Форда или Флойда-Уоршелла либо замените вес на неотрицательный.</span></div>
                        <div><strong>Обнаружен отрицательный цикл.</strong><span>Удалите цикл или измените веса: кратчайший путь в таком графе не определён.</span></div>
                        <div><strong>Граф слишком большой для пошаговой визуализации.</strong><span>Используйте кнопку «Рассчитать без визуализации» или уменьшите количество вершин.</span></div>
                    </div>
                `
            },
            {
                id: 'demo',
                title: 'Демо-сценарий для защиты',
                icon: 'fas fa-chalkboard-user',
                content: `
                    <ol class="help-steps">
                        <li>Открыть вкладку «Конструктор».</li>
                        <li>Нажать «Сгенерировать» с параметрами: 8 вершин, минимальный вес 1, максимальный вес 20, плотность 0.4.</li>
                        <li>Перейти во вкладку «Алгоритм».</li>
                        <li>Выбрать стартовую вершину 0.</li>
                        <li>Выбрать конечную вершину 7.</li>
                        <li>Нажать запуск.</li>
                        <li>Показать найденный путь.</li>
                        <li>Объяснить таблицу расстояний.</li>
                        <li>Показать очередь приоритетов.</li>
                        <li>Перейти во вкладку «Производительность».</li>
                        <li>Запустить бенчмарк.</li>
                        <li>Перейти во вкладку «Теория» и показать псевдокод и сложность.</li>
                    </ol>
                `
            }
        ];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const helpModule = new HelpModule();
    helpModule.init();
    window.helpModule = helpModule;
});
