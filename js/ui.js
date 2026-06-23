/**
 * ============================================================================
 * ui.js — Главный контроллер приложения
 * ============================================================================
 * 
 * Роль: инициализация всех модулей, управление интерфейсом,
 * обработка пользовательских событий, связывание компонентов.
 * 
 * Это «точка входа» приложения. При загрузке страницы создаётся
 * экземпляр AppController, который инициализирует Cytoscape,
 * подключает обработчики событий и запускает все подсистемы.
 * 
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

class AppController {
    constructor() {
        // === Модули ===
        this.graphManager = new GraphManager();
        this.storageManager = new StorageManager();
        this.performanceAnalyzer = new PerformanceAnalyzer();
        this.undoRedoManager = new UndoRedoManager();
        this.theoryModule = null;
        this.visualizer = null;

        // === Cytoscape экземпляры ===
        this.cy = null;           // Конструктор графов
        this.cyAlgorithm = null;  // Визуализация алгоритма
        this.cyMinimap = null;    // Миникарта

        // === Состояние редактора ===
        this.currentMode = 'select'; // select | add | edge | delete
        this.edgeSourceNode = null;  // Первая вершина при создании ребра
        this._pendingEdgeSource = null;
        this._pendingEdgeTarget = null;
        this.selectedNeighborNodeId = null;
        this.renamingNodeId = null;
        this._dragStartPositions = new Map();

        // === Состояние алгоритма ===
        this.currentAlgorithm = 'dijkstra';
        this.lastAlgorithmResult = null;
        this.editingEdgeId = null; // ID ребра, редактируемого в модале
        this.distanceSort = { key: 'node', direction: 'asc' };
        this.currentDistanceView = null;

        // Подробная пошаговая визуализация хранит снимки состояния и подходит
        // только для учебных графов небольшого размера.
        this.visualizationNodeLimit = 200;
        this.maxDetailedSteps = 10000;

        // === История и автосохранение ===
        this.actionHistory = [];
        this.maxActionHistory = 20;
        this.autosaveTimer = null;
        this.autosaveRestoreState = null;
        this.suppressAutosave = false;
    }

    // ========================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ========================================================================

    /**
     * Главная точка инициализации. Вызывается при DOMContentLoaded.
     */
    init() {
        this.initCytoscape();
        this.initEventListeners();
        this.initSidebarAccordions();
        this.loadSettings();
        this.loadExamples();
        this.updateSavedGraphsList();
        this.loadActionHistory();
        this.renderActionHistory();
        this.updateUndoRedoButtons();
        this.updateFastModeRecommendation();
        this.updateAlgorithmUI();
        this.promptAutosaveRestore();

        // Инициализируем теоретический модуль
        this.theoryModule = new TheoryModule('theory-container');
        this.theoryModule.render();

        this.showToast('Приложение загружено', 'success');
    }

    // ========================================================================
    // CYTOSCAPE — ИНИЦИАЛИЗАЦИЯ
    // ========================================================================

    /**
     * Получить конфигурацию стилей Cytoscape.
     * Используется для обоих инстансов (конструктор + алгоритм).
     */
    _getCytoscapeStyles() {
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const edgeLabelBg = isDarkTheme ? '#131b2e' : '#e2e8f0';
        const edgeLabelColor = isDarkTheme ? '#e2e8f0' : '#334155';
        // Aurora glow: вершины светятся ярче в тёмной теме
        const nodeGlow = isDarkTheme ? 0.55 : 0.4;
        const nodeColor = isDarkTheme ? '#3b82f6' : '#2f6df6';

        return [
            // --- Базовый стиль вершин ---
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'width': 46,
                    'height': 46,
                    'background-color': nodeColor,
                    'color': '#fff',
                    'font-size': '15px',
                    'font-weight': '800',
                    'border-width': 4,
                    'border-color': '#1d4ed8',
                    'text-outline-width': 2,
                    'text-outline-color': '#1d4ed8',
                    'shadow-blur': 26,
                    'shadow-color': isDarkTheme ? '#60a5fa' : '#2563eb',
                    'shadow-opacity': nodeGlow,
                    'shadow-offset-x': 0,
                    'shadow-offset-y': 4,
                    'overlay-color': '#60a5fa',
                    'overlay-opacity': 0.05,
                    'z-index': 20,
                    'transition-property': 'background-color, border-color, width, height, shadow-opacity',
                    'transition-duration': '0.3s'
                }
            },
            // --- Вершины с меткой расстояния ---
            {
                selector: 'node[distLabel]',
                style: {
                    'label': function(ele) {
                        const dl = ele.data('distLabel');
                        return dl ? ele.data('label') + '\n' + dl : ele.data('label');
                    },
                    'text-wrap': 'wrap',
                    'font-size': '11px'
                }
            },
            // --- Базовый стиль рёбер ---
            {
                selector: 'edge',
                style: {
                    'label': 'data(weight)',
                    'width': 2.5,
                    'line-color': '#8fa2ba',
                    'target-arrow-color': '#8fa2ba',
                    'opacity': 0.82,
                    'arrow-scale': 1.05,
                    'target-arrow-fill': 'filled',
                    'curve-style': 'unbundled-bezier',
                    'control-point-step-size': 36,
                    'font-size': '11px',
                    'font-weight': '800',
                    'color': edgeLabelColor,
                    'text-background-color': edgeLabelBg,
                    'text-background-opacity': 0.92,
                    'text-background-padding': '4px',
                    'text-background-shape': 'roundrectangle',
                    'text-border-color': '#cbd5e1',
                    'text-border-width': 1,
                    'text-border-opacity': 0.9,
                    'text-margin-y': -7,
                    'z-index': 1,
                    'transition-property': 'line-color, target-arrow-color, width, opacity',
                    'transition-duration': '0.3s'
                }
            },
            // --- Ориентированные рёбра (стрелки) ---
            {
                selector: 'edge[?directed]',
                style: {
                    'target-arrow-shape': 'triangle',
                    'target-distance-from-node': 3
                }
            },
            // --- Выделенное ребро ---
            {
                selector: 'edge:selected',
                style: {
                    'line-color': '#2563eb',
                    'target-arrow-color': '#2563eb',
                    'width': 4,
                    'opacity': 1,
                    'z-index': 10
                }
            },
            // --- Состояния визуализации ---
            {
                selector: '.visited-node',
                style: { 'background-color': '#22c55e', 'border-color': '#16a34a', 'text-outline-color': '#15803d', 'shadow-color': '#22c55e', 'shadow-opacity': 0.34 }
            },
            {
                selector: '.current-node',
                style: { 
                    'background-color': '#f59e0b', 
                    'width': 54, 
                    'height': 54, 
                    'border-color': '#d97706',
                    'underlay-color': '#f59e0b',
                    'underlay-padding': 10,
                    'underlay-opacity': 0.6
                }
            },
            {
                selector: '.queued-node',
                style: { 'background-color': '#fbbf24', 'border-color': '#f59e0b', 'text-outline-color': '#d97706' }
            },
            {
                selector: '.path-node',
                style: { 
                    'background-color': '#ef4444', 
                    'width': 54, 
                    'height': 54, 
                    'border-color': '#b91c1c', 
                    'color': '#ffffff',
                    'underlay-color': '#ef4444',
                    'underlay-padding': 12,
                    'underlay-opacity': 0.7
                }
            },
            {
                selector: '.path-edge',
                style: { 'line-color': '#ef4444', 'target-arrow-color': '#ef4444', 'width': 6, 'opacity': 1, 'z-index': 12 }
            },
            {
                selector: '.relaxed-edge',
                style: { 
                    'line-color': '#22c55e', 
                    'target-arrow-color': '#22c55e', 
                    'width': 4.5, 
                    'opacity': 1, 
                    'z-index': 9,
                    'underlay-color': '#22c55e',
                    'underlay-padding': 4,
                    'underlay-opacity': 0.4
                }
            },
            {
                selector: '.examining-edge',
                style: { 
                    'line-color': '#f59e0b', 
                    'target-arrow-color': '#f59e0b', 
                    'width': 4.5, 
                    'opacity': 1, 
                    'z-index': 9,
                    'line-style': 'dashed',
                    'line-dash-pattern': [8, 4],
                    'underlay-color': '#f59e0b',
                    'underlay-padding': 5,
                    'underlay-opacity': 0.5
                }
            },
            {
                selector: '.skipped-edge',
                style: { 'line-color': '#94a3b8', 'width': 2, 'opacity': 0.45 }
            },
            {
                selector: '.highlighted-neighbor',
                style: { 'background-color': '#7c3aed', 'border-color': '#6d28d9', 'text-outline-color': '#5b21b6', 'shadow-opacity': 0.35 }
            },
            {
                selector: '.selected-neighbor-source',
                style: { 'background-color': '#0f766e', 'border-color': '#0d9488', 'text-outline-color': '#115e59', 'width': 54, 'height': 54, 'shadow-opacity': 0.38 }
            },
            {
                selector: '.highlighted-edge',
                style: { 'line-color': '#7c3aed', 'target-arrow-color': '#7c3aed', 'width': 5.5, 'opacity': 1, 'z-index': 11 }
            },
            {
                selector: '.negative-cycle-node',
                style: { 'background-color': '#ef4444', 'border-color': '#f87171', 'text-outline-color': '#991b1b', 'shadow-color': '#ef4444', 'shadow-opacity': 0.6, 'overlay-color': '#ef4444', 'overlay-opacity': 0.32 }
            },
            {
                selector: '.matrix-pivot-node',
                style: { 'background-color': '#06b6d4', 'border-color': '#0891b2', 'text-outline-color': '#0e7490', 'shadow-color': '#06b6d4', 'shadow-opacity': 0.45 }
            }
        ];
    }

    /**
     * Инициализировать два экземпляра Cytoscape:
     * 1. #cy — для конструктора графов
     * 2. #cy-algorithm — для визуализации алгоритма
     */
    initCytoscape() {
        const styles = this._getCytoscapeStyles();
        const commonOpts = {
            style: styles,
            layout: { name: 'preset' },
            minZoom: 0.3,
            maxZoom: 3,
            wheelSensitivity: 0.3
        };

        // --- Конструктор ---
        this.cy = cytoscape({
            container: document.getElementById('cy'),
            ...commonOpts
        });

        // --- Алгоритм ---
        this.cyAlgorithm = cytoscape({
            container: document.getElementById('cy-algorithm'),
            ...commonOpts
        });

        // --- Обработчики событий на конструкторе ---
        this._setupConstructorEvents();

        // --- Миникарта ---
        this._setupMinimap();
    }

    /**
     * Настроить события конструктора (клики, перетаскивание).
     */
    _setupConstructorEvents() {
        const self = this;

        // Клик по пустому пространству — добавление вершины
        this.cy.on('tap', function(e) {
            if (e.target === self.cy && self.currentMode === 'add') {
                const pos = e.position;
                const command = new AddNodeCommand(self.graphManager, self.cy, pos.x, pos.y);
                const nodeId = self.undoRedoManager.execute(command);
                if (!nodeId) return;
                self.afterGraphCommand();
                self.showToast(`Вершина ${self.formatNodeLabel(nodeId)} добавлена`, 'success');
                self.recordAction(`Создана вершина ${self.formatNodeLabel(nodeId)}`);
            } else if (e.target === self.cy && self.currentMode === 'select') {
                self.clearNeighborHighlight();
            }
        });

        // Клик по вершине
        this.cy.on('tap', 'node', function(e) {
            const node = e.target;
            const nodeId = node.id();

            if (self.currentMode === 'delete') {
                // Удаление вершины
                const nodeLabel = self.formatNodeLabel(nodeId);
                const command = new RemoveNodeCommand(self.graphManager, self.cy, nodeId);
                self.undoRedoManager.execute(command);
                self.afterGraphCommand();
                self.showToast(`Вершина ${nodeLabel} удалена`, 'warning');
                self.recordAction(`Удалена вершина ${nodeLabel}`);

            } else if (self.currentMode === 'edge') {
                // Создание ребра: первый клик — выбор источника, второй — цели
                if (!self.edgeSourceNode) {
                    self.edgeSourceNode = nodeId;
                    node.addClass('highlighted-neighbor');
                    self.showToast(`Выберите вторую вершину для ребра`, 'info');
                } else {
                    if (self.edgeSourceNode !== nodeId) {
                        // Сохраняем пару вершин и показываем модал ввода веса
                        self._pendingEdgeSource = self.edgeSourceNode;
                        self._pendingEdgeTarget = nodeId;
                        document.getElementById('input-edge-weight').value = '1';
                        self.editingEdgeId = null; // Это новое ребро, а не редактирование
                        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-edge-weight'));
                        modal.show();
                    }
                    // Сбрасываем выделение
                    self.cy.nodes().removeClass('highlighted-neighbor');
                    self.edgeSourceNode = null;
                }

            } else if (self.currentMode === 'select') {
                // Подсветка соседей
                self.highlightNeighbors(nodeId);
            }
        });

        // Клик по ребру
        this.cy.on('tap', 'edge', function(e) {
            const edge = e.target;
            const edgeId = edge.id();

            if (self.currentMode === 'delete') {
                const command = new RemoveEdgeCommand(self.graphManager, self.cy, edgeId);
                self.undoRedoManager.execute(command);
                self.afterGraphCommand();
                self.showToast('Ребро удалено', 'warning');
                self.recordAction(`Удалено ребро ${edgeId}`);
            } else {
                // Редактирование веса доступно также по двойному клику.
                self.openEdgeWeightModal(edgeId);
            }
        });

        this.cy.on('dbltap', 'node', function(e) {
            if (self.currentMode === 'select') {
                self.openRenameNodeModal(e.target.id());
            }
        });

        this.cy.on('dbltap', 'edge', function(e) {
            if (self.currentMode !== 'delete') {
                self.openEdgeWeightModal(e.target.id());
            }
        });

        this.cy.on('grab', 'node', function(e) {
            const node = e.target;
            self._dragStartPositions.set(node.id(), { ...node.position() });
        });

        // Обновление позиции вершины после перетаскивания
        this.cy.on('dragfree', 'node', function(e) {
            const node = e.target;
            const pos = node.position();
            const oldPos = self._dragStartPositions.get(node.id());
            self._dragStartPositions.delete(node.id());

            if (oldPos && (Math.round(oldPos.x) !== Math.round(pos.x) || Math.round(oldPos.y) !== Math.round(pos.y))) {
                const command = new MoveNodeCommand(self.graphManager, node.id(), oldPos.x, oldPos.y, pos.x, pos.y, self.cy);
                self.undoRedoManager.execute(command);
                self.afterGraphCommand({ clearSelection: false });
                self.recordAction(`Перемещена вершина ${self.formatNodeLabel(node.id())}`);
            } else {
                self.graphManager.updateNodePosition(node.id(), pos.x, pos.y);
                self._updateMinimap();
                self.scheduleAutosave();
            }
        });

        // Обновление статистики при изменениях
        this.cy.on('add remove', function() {
            self.updateNodeEdgeCount();
            self._updateMinimap();
        });
    }

    // ========================================================================
    // ОБРАБОТЧИКИ СОБЫТИЙ
    // ========================================================================

    initEventListeners() {
        const self = this;

        // --- Режимы редактора ---
        const modeButtons = {
            'btn-select-mode': 'select',
            'btn-add-mode': 'add',
            'btn-edge-mode': 'edge',
            'btn-delete-mode': 'delete'
        };

        Object.keys(modeButtons).forEach(btnId => {
            document.getElementById(btnId).addEventListener('click', () => {
                self.setMode(modeButtons[btnId]);
            });
        });

        document.getElementById('btn-undo').addEventListener('click', () => self.undoGraphAction());
        document.getElementById('btn-redo').addEventListener('click', () => self.redoGraphAction());

        document.addEventListener('keydown', (event) => {
            const active = document.activeElement;
            const isTyping = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
            if (isTyping || active?.isContentEditable) return;

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                self.undoGraphAction();
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                self.redoGraphAction();
            }
        });

        // --- Тип графа (ориентированный / неориентированный) ---
        document.getElementById('btn-undirected').addEventListener('click', () => {
            self.graphManager.setDirected(false);
            document.getElementById('btn-undirected').classList.add('active');
            document.getElementById('btn-directed').classList.remove('active');
            self.syncCytoscapeFromGraph();
            self.showToast('Неориентированный граф', 'info');
            self.recordAction('Включён неориентированный граф');
            self.scheduleAutosave();
        });

        document.getElementById('btn-directed').addEventListener('click', () => {
            self.graphManager.setDirected(true);
            document.getElementById('btn-directed').classList.add('active');
            document.getElementById('btn-undirected').classList.remove('active');
            self.syncCytoscapeFromGraph();
            self.showToast('Ориентированный граф', 'info');
            self.recordAction('Включён ориентированный граф');
            self.scheduleAutosave();
        });

        // --- Центрирование ---
        document.getElementById('btn-layout-graph').addEventListener('click', () => {
            if (self.graphManager.getNodeCount() === 0) {
                self.showToast('Граф пуст', 'warning');
                return;
            }

            self.applyReadableLayout(self.cy, {
                savePositions: true,
                fit: true,
                animate: self.graphManager.getNodeCount() <= 80
            });
            self.recordAction('Граф автоматически упорядочен');
            self.showToast('Граф упорядочен', 'success');
        });

        document.getElementById('btn-center-graph').addEventListener('click', () => {
            self.cy.fit(undefined, 50);
            self.cy.center();
        });

        // --- Очистка ---
        document.getElementById('btn-clear-graph').addEventListener('click', () => {
            if (self.graphManager.getNodeCount() === 0) return;
            if (confirm('Удалить все вершины и рёбра?')) {
                self.graphManager.clear();
                self.cy.elements().remove();
                self.undoRedoManager.clear();
                self.updateNodeEdgeCount();
                self.updateUndoRedoButtons();
                self.showToast('Граф очищен', 'warning');
                self.recordAction('Граф очищен');
                self.clearNeighborHighlight();
                self.scheduleAutosave();
            }
        });

        // --- Экспорт PNG ---
        document.getElementById('btn-export-png').addEventListener('click', () => {
            self.storageManager.exportPNG(self.cy);
            self.showToast('Изображение сохранено', 'success');
            self.recordAction('Выполнен экспорт PNG');
        });

        // --- Поиск вершины ---
        document.getElementById('btn-search-node').addEventListener('click', () => {
            self.searchNode();
        });
        document.getElementById('input-search-node').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') self.searchNode();
        });

        // --- Генерация случайного графа ---
        document.getElementById('btn-generate-graph').addEventListener('click', () => {
            const nodes = parseInt(document.getElementById('input-gen-nodes').value) || 8;
            const minW = parseInt(document.getElementById('input-gen-min-weight').value) || 1;
            const maxW = parseInt(document.getElementById('input-gen-max-weight').value) || 20;
            const density = parseFloat(document.getElementById('input-gen-density').value) || 0.4;

            const maxEdges = self.graphManager.isDirected()
                ? nodes * (nodes - 1)
                : nodes * (nodes - 1) / 2;
            const estimatedEdges = Math.floor(maxEdges * Math.max(0.1, Math.min(1, density)));

            if (nodes > self.visualizationNodeLimit) {
                const confirmed = confirm(
                    `Граф с ${nodes} вершинами будет запущен без детальной пошаговой визуализации. ` +
                    `Ожидаемое количество рёбер: около ${estimatedEdges}. Продолжить?`
                );
                if (!confirmed) return;
            }

            self.graphManager.generateRandom(nodes, minW, maxW, density);
            self.syncCytoscapeFromGraph();
            self.undoRedoManager.clear();
            self.updateUndoRedoButtons();
            self.applyReadableLayout(self.cy, {
                savePositions: true,
                fit: true,
                animate: nodes <= 80
            });
            self.updateAlgorithmUI();
            self.showToast(`Граф сгенерирован: ${self.graphManager.getNodeCount()} вершин, ${self.graphManager.getEdgeCount()} рёбер`, 'success');
            self.recordAction(`Сгенерирован граф: ${self.graphManager.getNodeCount()} вершин, ${self.graphManager.getEdgeCount()} рёбер`);
            self.scheduleAutosave();
        });

        // Обновление отображения плотности
        document.getElementById('input-gen-density').addEventListener('input', (e) => {
            document.getElementById('density-value').textContent = e.target.value;
        });

        // --- Сохранение ---
        document.getElementById('btn-save-graph').addEventListener('click', () => {
            if (self.graphManager.getNodeCount() === 0) {
                self.showToast('Граф пуст — нечего сохранять', 'warning');
                return;
            }
            document.getElementById('input-graph-name').value = '';
            const modal = new bootstrap.Modal(document.getElementById('modal-save-graph'));
            modal.show();
        });

        document.getElementById('btn-confirm-save').addEventListener('click', () => {
            const name = document.getElementById('input-graph-name').value.trim();
            if (!name) {
                self.showToast('Укажите название графа', 'warning');
                return;
            }
            self.storageManager.saveGraph(name, self.graphManager.toJSON());
            bootstrap.Modal.getInstance(document.getElementById('modal-save-graph')).hide();
            self.updateSavedGraphsList();
            self.showToast(`Граф «${name}» сохранён`, 'success');
            self.recordAction(`Граф «${name}» сохранён`);
            self.scheduleAutosave();
        });

        // --- Экспорт JSON ---
        document.getElementById('btn-export-json').addEventListener('click', () => {
            if (self.graphManager.getNodeCount() === 0) {
                self.showToast('Граф пуст', 'warning');
                return;
            }
            self.storageManager.exportJSON(self.graphManager.toJSON());
            self.showToast('JSON-файл сохранён', 'success');
            self.recordAction('Выполнен экспорт JSON');
        });

        // --- Импорт JSON ---
        document.getElementById('btn-import-json').addEventListener('click', () => {
            document.getElementById('input-import-file').click();
        });

        document.getElementById('input-import-file').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const data = await self.storageManager.importJSON(file);
                if (self.loadGraphFromData(data)) {
                    self.showToast('Граф импортирован', 'success');
                    self.recordAction('Выполнен импорт графа');
                }
            } catch (err) {
                self.showToast(err.message, 'error');
            }
            e.target.value = '';
        });

        // --- Модал веса ребра: сохранение ---
        document.getElementById('btn-save-weight').addEventListener('click', () => {
            const rawWeight = Number(document.getElementById('input-edge-weight').value);
            const modalEl = document.getElementById('modal-edge-weight');

            if (!Number.isFinite(rawWeight)) {
                self.showToast('Вес ребра должен быть конечным числом', 'warning');
                return;
            }

            const weight = Math.round(rawWeight);

            if (self.editingEdgeId) {
                // Редактирование существующего ребра
                const command = new UpdateWeightCommand(self.graphManager, self.cy, self.editingEdgeId, weight);
                const updated = self.undoRedoManager.execute(command);
                if (updated !== false && updated !== null) {
                    self.afterGraphCommand();
                    self.showToast(`Вес ребра обновлён: ${weight}`, 'success');
                    self.recordAction(`Изменён вес ребра ${self.editingEdgeId}: ${weight}`);
                } else {
                    self.showToast('Не удалось обновить вес ребра', 'error');
                }
            } else if (self._pendingEdgeSource && self._pendingEdgeTarget) {
                // Создание нового ребра
                const source = self._pendingEdgeSource;
                const target = self._pendingEdgeTarget;
                if (source && target) {
                    const command = new AddEdgeCommand(
                        self.graphManager,
                        self.cy,
                        source,
                        target,
                        weight,
                        self.graphManager.isDirected()
                    );
                    const edgeId = self.undoRedoManager.execute(command);
                    if (edgeId) {
                        self.afterGraphCommand();
                        self.showToast(`Ребро создано (вес: ${weight})`, 'success');
                        self.recordAction(`Создано ребро ${self.formatNodeLabel(source)} → ${self.formatNodeLabel(target)}, вес ${weight}`);
                    } else {
                        self.showToast('Не удалось создать ребро', 'error');
                    }
                }
            }

            self.editingEdgeId = null;
            self._pendingEdgeSource = null;
            self._pendingEdgeTarget = null;
            self.hideModalSafely(modalEl);
        });

        // При закрытии модала ребра — сбросить состояние
        document.getElementById('modal-edge-weight').addEventListener('hidden.bs.modal', () => {
            self.edgeSourceNode = null;
            self._pendingEdgeSource = null;
            self._pendingEdgeTarget = null;
            self.cy.nodes().removeClass('highlighted-neighbor');
        });

        document.getElementById('btn-save-node-name').addEventListener('click', () => {
            const input = document.getElementById('input-node-name');
            const modalEl = document.getElementById('modal-rename-node');
            const label = input.value.trim();

            if (!self.renamingNodeId) return;
            if (label.length > 10) {
                self.showToast('Имя вершины должно быть не длиннее 10 символов', 'warning');
                return;
            }

            if (self.graphManager.updateNodeLabel(self.renamingNodeId, label)) {
                const nodeData = self.graphManager.getNode(self.renamingNodeId);
                const cyNode = self.cy.getElementById(self.renamingNodeId);
                if (cyNode.length) {
                    cyNode.data('label', nodeData.label);
                }
                self.updateNodeSelectors();
                self.showToast(`Имя вершины обновлено: ${nodeData.label}`, 'success');
                self.recordAction(`Переименована вершина ${self.renamingNodeId}: ${nodeData.label}`);
                self.scheduleAutosave();
            }

            self.renamingNodeId = null;
            self.hideModalSafely(modalEl);
        });

        document.getElementById('modal-rename-node').addEventListener('hidden.bs.modal', () => {
            self.renamingNodeId = null;
        });

        // --- Масштабирование конструктора ---
        document.getElementById('btn-zoom-in').addEventListener('click', () => self.zoomGraph(1.25));
        document.getElementById('btn-zoom-out').addEventListener('click', () => self.zoomGraph(0.8));
        document.getElementById('btn-zoom-fit').addEventListener('click', () => self.fitGraph());

        // --- Алгоритм: управление ---
        document.getElementById('select-algorithm').addEventListener('change', (event) => {
            self.currentAlgorithm = event.target.value;
            self.updateAlgorithmUI();
        });
        document.getElementById('btn-run-algorithm').addEventListener('click', () => self.runAlgorithm());
        document.getElementById('btn-run-fast-algorithm').addEventListener('click', () => self.runAlgorithmFast());
        document.getElementById('btn-pause-algorithm').addEventListener('click', () => {
            if (self.visualizer) {
                self.visualizer.pause();
                self.showToast('Пауза', 'info');
            }
        });
        document.getElementById('btn-resume-algorithm').addEventListener('click', () => {
            if (self.visualizer) {
                self.visualizer.resume();
                self.showToast('Продолжение', 'info');
            }
        });
        document.getElementById('btn-step-forward').addEventListener('click', () => {
            if (self.visualizer) self.visualizer.stepForward();
        });
        document.getElementById('btn-step-back').addEventListener('click', () => {
            if (self.visualizer) self.visualizer.stepBack();
        });
        document.getElementById('btn-reset-algorithm').addEventListener('click', () => {
            if (self.visualizer) {
                self.visualizer.reset();
                document.getElementById('path-result').style.display = 'none';
                document.getElementById('export-results-section').style.display = 'none';
                document.getElementById('floyd-matrix-section').style.display = 'none';
                document.getElementById('floyd-matrix-display').innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Запустите Флойда-Уоршелла</span>';
                document.getElementById('step-description').querySelector('span').textContent = 'Выберите начальную и конечную вершины, затем нажмите «Запустить»';
                document.getElementById('step-counter').textContent = '';
                document.getElementById('distance-table-body').innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center;padding:20px;">Запустите алгоритм</td></tr>';
                self.currentDistanceView = null;
                document.getElementById('queue-display').innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Очередь пуста</span>';
                document.getElementById('current-node-display').textContent = '—';
                self.showToast('Визуализация сброшена', 'info');
            }
        });

        // --- Скорость ---
        document.getElementById('range-speed').addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = speed + 'мс';
            if (self.visualizer) self.visualizer.setSpeed(speed);
            self.storageManager.saveSettings({ speed });
            self.scheduleAutosave();
        });

        // --- Бенчмарк ---
        document.getElementById('btn-run-benchmark').addEventListener('click', () => self.runBenchmark());

        // --- Тема ---
        document.getElementById('btn-theme-toggle').addEventListener('click', () => self.toggleTheme());

        // --- Полноэкранный ---
        document.getElementById('btn-fullscreen').addEventListener('click', () => self.toggleFullscreen());

        // --- Экспорт результатов ---
        document.getElementById('btn-export-txt').addEventListener('click', () => {
            if (self.lastAlgorithmResult) {
                self.storageManager.exportResults(self.lastAlgorithmResult);
                self.showToast('Результаты экспортированы (TXT)', 'success');
                self.recordAction('Выполнен экспорт результата TXT');
            }
        });

        document.getElementById('btn-export-results-json').addEventListener('click', () => {
            if (self.lastAlgorithmResult) {
                self.storageManager.exportResultsJSON(self.lastAlgorithmResult);
                self.showToast('Результаты экспортированы (JSON)', 'success');
                self.recordAction('Выполнен экспорт результата JSON');
            }
        });

        document.getElementById('btn-export-pdf').addEventListener('click', () => self.exportPDFReport());

        document.getElementById('btn-clear-history').addEventListener('click', () => {
            self.actionHistory = [];
            self.storageManager.clearActionHistory();
            self.renderActionHistory();
            self.showToast('История очищена', 'info');
        });

        document.getElementById('btn-restore-autosave').addEventListener('click', () => self.restoreAutosave());
        document.getElementById('btn-discard-autosave').addEventListener('click', () => self.discardAutosave());

        document.querySelectorAll('.distance-table .sortable-th').forEach(th => {
            th.addEventListener('click', () => {
                self.setDistanceSort(th.dataset.sort);
            });
        });

        // --- Переключение вкладок: обновлять данные ---
        const algorithmTab = document.getElementById('nav-algorithm');
        if (algorithmTab) {
            algorithmTab.addEventListener('shown.bs.tab', () => {
                self.updateNodeSelectors();
                self.updateFastModeRecommendation();
                self.updateAlgorithmUI();
                self.syncCytoscapeFromGraph(self.cyAlgorithm);
                setTimeout(() => self.cyAlgorithm.fit(undefined, 50), 100);
            });
        }

        // При переключении на вкладку конструктора — подогнать размер
        const constructorTab = document.getElementById('nav-constructor');
        if (constructorTab) {
            constructorTab.addEventListener('shown.bs.tab', () => {
                setTimeout(() => self.cy.resize(), 100);
            });
        }
    }

    // ========================================================================
    // РЕЖИМЫ РЕДАКТОРА
    // ========================================================================

    /**
     * Установить режим редактора.
     * @param {string} mode — select | add | edge | delete
     */
    setMode(mode) {
        this.currentMode = mode;
        this.edgeSourceNode = null;
        this.clearNeighborHighlight();
        this.cy.nodes().removeClass('highlighted-neighbor');

        // Обновляем кнопки
        ['btn-select-mode', 'btn-add-mode', 'btn-edge-mode', 'btn-delete-mode'].forEach(id => {
            document.getElementById(id).classList.remove('active');
        });

        const modeMap = {
            'select': 'btn-select-mode',
            'add': 'btn-add-mode',
            'edge': 'btn-edge-mode',
            'delete': 'btn-delete-mode'
        };

        document.getElementById(modeMap[mode]).classList.add('active');

        // Настраиваем курсор и поведение Cytoscape
        if (mode === 'select') {
            this.cy.autoungrabify(false);
            this.cy.autounselectify(false);
        } else if (mode === 'add') {
            this.cy.autoungrabify(true);
            this.cy.autounselectify(true);
        } else if (mode === 'edge') {
            this.cy.autoungrabify(true);
            this.cy.autounselectify(true);
        } else if (mode === 'delete') {
            this.cy.autoungrabify(true);
            this.cy.autounselectify(true);
        }
    }

    /**
     * Надёжно закрыть Bootstrap-модалку даже при быстром сохранении во время анимации открытия.
     * @param {HTMLElement} modalEl — DOM-элемент модального окна
     */
    hideModalSafely(modalEl) {
        if (!modalEl) return;

        const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.hide();

        setTimeout(() => {
            if (!modalEl.classList.contains('show')) return;

            instance.hide();
            modalEl.classList.remove('show');
            modalEl.style.display = 'none';
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.removeAttribute('aria-modal');
            modalEl.removeAttribute('role');

            document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
        }, 350);
    }

    openEdgeWeightModal(edgeId) {
        const edge = this.cy.getElementById(edgeId);
        if (!edge.length) return;

        this.editingEdgeId = edgeId;
        this._pendingEdgeTarget = null;
        const currentWeight = edge.data('weight');
        document.getElementById('input-edge-weight').value = Number.isFinite(Number(currentWeight)) ? currentWeight : 1;
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-edge-weight'));
        modal.show();
    }

    openRenameNodeModal(nodeId) {
        const node = this.graphManager.getNode(nodeId);
        if (!node) return;

        this.renamingNodeId = nodeId;
        const input = document.getElementById('input-node-name');
        input.value = node.label || node.id.replace('n', '');
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-rename-node'));
        modal.show();
        setTimeout(() => {
            input.focus();
            input.select();
        }, 120);
    }

    afterGraphCommand(options = {}) {
        this.updateNodeEdgeCount();
        this.updateNodeSelectors();
        this.updateUndoRedoButtons();
        this.updateAlgorithmUI();
        this._updateMinimap();
        if (options.clearSelection !== false) {
            this.clearNeighborHighlight();
        }
        this.scheduleAutosave();
    }

    undoGraphAction() {
        if (!this.undoRedoManager.canUndo()) return;
        if (this.undoRedoManager.undo()) {
            this.afterGraphCommand();
            this.recordAction('Отменено последнее действие');
            this.showToast('Действие отменено', 'info');
        }
    }

    redoGraphAction() {
        if (!this.undoRedoManager.canRedo()) return;
        if (this.undoRedoManager.redo()) {
            this.afterGraphCommand();
            this.recordAction('Повторено действие');
            this.showToast('Действие повторено', 'info');
        }
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        if (undoBtn) undoBtn.disabled = !this.undoRedoManager.canUndo();
        if (redoBtn) redoBtn.disabled = !this.undoRedoManager.canRedo();
    }

    zoomGraph(factor) {
        if (!this.cy) return;
        const nextZoom = Math.max(this.cy.minZoom(), Math.min(this.cy.maxZoom(), this.cy.zoom() * factor));
        this.cy.zoom({
            level: nextZoom,
            renderedPosition: {
                x: this.cy.container().clientWidth / 2,
                y: this.cy.container().clientHeight / 2
            }
        });
    }

    initSidebarAccordions() {
        document.querySelectorAll('.sidebar').forEach(sidebar => {
            const sections = Array.from(sidebar.children)
                .filter(child => child.classList && child.classList.contains('sidebar-section'));

            if (sections.length === 0 || sidebar.dataset.accordionReady === 'true') return;

            sidebar.dataset.accordionReady = 'true';
            sidebar.classList.add('sidebar-accordion');

            sections.forEach(section => {
                const header = section.querySelector(':scope > .section-header');
                const body = section.querySelector(':scope > .section-body');
                if (!header || !body) return;

                // Пропускаем статические заголовки (Поиск, Соседи, Сохранение) — не кликабельны
                if (header.classList.contains('section-header-static')) return;

                header.setAttribute('role', 'button');
                header.setAttribute('tabindex', '0');

                if (!header.querySelector('.sidebar-chevron')) {
                    const chevron = document.createElement('i');
                    chevron.className = 'fa fa-chevron-down sidebar-chevron';
                    chevron.setAttribute('aria-hidden', 'true');
                    // Если есть .section-header-actions — вставляем перед ней, иначе в конец
                    const actions = header.querySelector('.section-header-actions');
                    if (actions) {
                        actions.insertBefore(chevron, actions.firstChild);
                    } else {
                        header.appendChild(chevron);
                    }
                }

                const toggle = event => {
                    if (event.target.closest('button, a, input, select, textarea')) return;
                    section.classList.toggle('is-collapsed');
                    header.setAttribute('aria-expanded',
                        String(!section.classList.contains('is-collapsed')));
                };

                header.addEventListener('click', toggle);
                header.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    toggle(event);
                });
            });
        });
    }

    fitGraph() {
        if (!this.cy) return;
        this.cy.fit(undefined, 50);
        this.cy.center();
    }

    // ========================================================================
    // СИНХРОНИЗАЦИЯ CYTOSCAPE С ГРАФОМ
    // ========================================================================

    /**
     * Синхронизировать Cytoscape-инстанс с данными из GraphManager.
     * @param {object} [targetCy] — целевой Cytoscape (по умолчанию this.cy)
     */
    syncCytoscapeFromGraph(targetCy) {
        const cy = targetCy || this.cy;
        cy.elements().remove();

        const isDirected = this.graphManager.isDirected();

        // Добавляем вершины
        this.graphManager.getNodes().forEach(node => {
            cy.add({
                group: 'nodes',
                data: { id: node.id, label: node.label },
                position: { x: node.x, y: node.y }
            });
        });

        // Добавляем рёбра
        this.graphManager.getEdges().forEach(edge => {
            cy.add({
                group: 'edges',
                data: {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    weight: edge.weight,
                    directed: isDirected
                }
            });
        });

        this.updateNodeEdgeCount();
        this._updateMinimap();
        this.updateFastModeRecommendation();
        this.updateAlgorithmUI();
    }

    /**
     * Разложить граф так, чтобы сгенерированные вершины читались аккуратнее.
     * Для учебных графов используем силовую раскладку, для больших — быстрый круг.
     */
    applyReadableLayout(targetCy, options = {}) {
        const cy = targetCy || this.cy;
        if (!cy || cy.nodes().length === 0) return;

        const nodeCount = cy.nodes().length;
        const useForceLayout = nodeCount <= 120;
        const layoutOptions = useForceLayout
            ? {
                name: 'cose',
                animate: options.animate === true,
                animationDuration: 450,
                refresh: 18,
                fit: options.fit !== false,
                padding: 70,
                randomize: false,
                nodeRepulsion: 8500,
                nodeOverlap: 18,
                idealEdgeLength: 130,
                edgeElasticity: 90,
                nestingFactor: 1.1,
                gravity: 0.22,
                numIter: 900,
                initialTemp: 180,
                coolingFactor: 0.96,
                minTemp: 1
            }
            : {
                name: 'circle',
                animate: false,
                fit: options.fit !== false,
                padding: 70,
                avoidOverlap: true
            };

        cy.one('layoutstop', () => {
            if (options.savePositions) {
                this._saveCytoscapePositions(cy);
                this._updateMinimap();
                this.scheduleAutosave();
            }
            if (options.fit !== false) {
                cy.fit(undefined, 60);
            }
        });

        cy.layout(layoutOptions).run();
    }

    /**
     * Сохранить текущие координаты Cytoscape обратно в модель графа.
     */
    _saveCytoscapePositions(cy) {
        cy.nodes().forEach(node => {
            const position = node.position();
            this.graphManager.updateNodePosition(node.id(), position.x, position.y);
        });
    }

    // ========================================================================
    // ОБНОВЛЕНИЕ UI
    // ========================================================================

    /**
     * Обновить счётчики вершин и рёбер.
     */
    updateNodeEdgeCount() {
        const fx = window.GraphLabFX;
        const nodeEl = document.getElementById('node-count');
        const edgeEl = document.getElementById('edge-count');
        if (fx) {
            fx.count(nodeEl, this.graphManager.getNodeCount());
            fx.count(edgeEl, this.graphManager.getEdgeCount());
        } else {
            nodeEl.textContent = this.graphManager.getNodeCount();
            edgeEl.textContent = this.graphManager.getEdgeCount();
        }
        this.updateFastModeRecommendation();
    }

    /**
     * Заполнить выпадающие списки вершин для алгоритма.
     */
    updateNodeSelectors() {
        const nodes = this.graphManager.getNodes();
        const startSelect = document.getElementById('select-start-node');
        const endSelect = document.getElementById('select-end-node');

        const startVal = startSelect.value;
        const endVal = endSelect.value;

        startSelect.innerHTML = '<option value="">—</option>';
        endSelect.innerHTML = '<option value="">—</option>';

        nodes.forEach(node => {
            const label = node.label || node.id.replace('n', '');
            startSelect.innerHTML += `<option value="${node.id}">${label}</option>`;
            endSelect.innerHTML += `<option value="${node.id}">${label}</option>`;
        });

        // Восстанавливаем выбор, если вершины ещё существуют
        if (startVal && this.graphManager.getNode(startVal)) startSelect.value = startVal;
        if (endVal && this.graphManager.getNode(endVal)) endSelect.value = endVal;
    }

    // ========================================================================
    // АЛГОРИТМЫ — ЗАПУСК И ВИЗУАЛИЗАЦИЯ
    // ========================================================================

    getSelectedAlgorithm() {
        const select = document.getElementById('select-algorithm');
        this.currentAlgorithm = select ? select.value : this.currentAlgorithm;
        return this.currentAlgorithm || 'dijkstra';
    }

    getAlgorithmMeta(algorithmId = this.getSelectedAlgorithm()) {
        const meta = {
            'dijkstra': {
                id: 'dijkstra',
                name: 'Алгоритм Дейкстры',
                shortName: 'Дейкстра',
                className: 'DijkstraAlgorithm',
                allowsNegativeWeights: false,
                queueLabel: 'Очередь приоритетов'
            },
            'bellman-ford': {
                id: 'bellman-ford',
                name: 'Алгоритм Беллмана-Форда',
                shortName: 'Беллман-Форд',
                className: 'BellmanFordAlgorithm',
                allowsNegativeWeights: true,
                queueLabel: 'Релаксации рёбер'
            },
            'floyd-warshall': {
                id: 'floyd-warshall',
                name: 'Алгоритм Флойда-Уоршелла',
                shortName: 'Флойд-Уоршелл',
                className: 'FloydWarshallAlgorithm',
                allowsNegativeWeights: true,
                queueLabel: 'Промежуточные вершины'
            }
        };

        return meta[algorithmId] || meta.dijkstra;
    }

    createAlgorithmInstance(algorithmId, options = {}) {
        const meta = this.getAlgorithmMeta(algorithmId);
        const AlgorithmClass = window[meta.className];

        if (typeof AlgorithmClass !== 'function') {
            throw new Error(`Модуль алгоритма не загружен: ${meta.name}`);
        }

        return new AlgorithmClass(this.graphManager, options);
    }

    validateSelectedAlgorithm(algorithmId) {
        const meta = this.getAlgorithmMeta(algorithmId);
        if (!meta.allowsNegativeWeights && this.graphManager.hasNegativeWeights()) {
            this.updateAlgorithmUI();
            this.showToast('Алгоритм Дейкстры не поддерживает отрицательные веса', 'warning');
            return false;
        }
        return true;
    }

    updateAlgorithmUI() {
        const algorithmId = this.getSelectedAlgorithm();
        const meta = this.getAlgorithmMeta(algorithmId);
        const hasNegative = this.graphManager.hasNegativeWeights();
        const warning = document.getElementById('negative-weight-warning');
        const queueHeader = document.querySelector('#queue-display')?.closest('.sidebar-section')?.querySelector('.section-header');
        const floydSection = document.getElementById('floyd-matrix-section');

        if (warning) {
            warning.style.display = hasNegative && !meta.allowsNegativeWeights ? 'flex' : 'none';
        }

        if (queueHeader) {
            const isExpanded = queueHeader.getAttribute('aria-expanded') === 'true';
            queueHeader.innerHTML = `
                <i data-lucide="layers"></i>
                <span>${meta.queueLabel}</span>
                <i class="fas fa-chevron-down fa-fw app-icon sidebar-chevron" aria-hidden="true"></i>
            `;
            queueHeader.setAttribute('aria-expanded', String(isExpanded));
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons({ root: queueHeader });
            }
        }

        if (floydSection && algorithmId !== 'floyd-warshall') {
            floydSection.style.display = 'none';
        }
    }

    /**
     * Получить и проверить выбранные вершины для запуска алгоритма.
     * @returns {{startNode: string, endNode: string}|null}
     */
    _getAlgorithmEndpoints() {
        const startNode = document.getElementById('select-start-node').value;
        const endNode = document.getElementById('select-end-node').value;

        if (!startNode || !endNode) {
            this.showToast('Выберите начальную и конечную вершины', 'warning');
            return null;
        }

        if (startNode === endNode) {
            this.showToast('Начальная и конечная вершины должны быть разными', 'warning');
            return null;
        }

        if (this.graphManager.getNodeCount() === 0) {
            this.showToast('Граф пуст', 'warning');
            return null;
        }

        return { startNode, endNode };
    }

    /**
     * Запустить выбранный алгоритм.
     */
    runAlgorithm() {
        const endpoints = this._getAlgorithmEndpoints();
        if (!endpoints) return;
        const { startNode, endNode } = endpoints;
        const algorithmId = this.getSelectedAlgorithm();
        const meta = this.getAlgorithmMeta(algorithmId);

        if (!this.validateSelectedAlgorithm(algorithmId)) return;

        // Синхронизируем граф для визуализации
        this.syncCytoscapeFromGraph(this.cyAlgorithm);
        setTimeout(() => this.cyAlgorithm.fit(undefined, 50), 50);

        const nodeCount = this.graphManager.getNodeCount();
        const useDetailedVisualization = nodeCount <= this.visualizationNodeLimit &&
            !(algorithmId === 'floyd-warshall' && nodeCount > 15);

        // Запускаем алгоритм
        let result;
        try {
            const algorithm = this.createAlgorithmInstance(algorithmId, {
                captureSteps: useDetailedVisualization,
                maxDetailedSteps: this.maxDetailedSteps
            });
            result = algorithm.run(startNode, endNode);
        } catch (err) {
            this.showToast(err.message, 'error');
            return;
        }

        this.lastAlgorithmResult = result;
        this._annotateAlgorithmResult(result, startNode, endNode, algorithmId);
        this.recordAction(`Запущен ${meta.shortName}: ${this.formatNodeLabel(startNode)} → ${this.formatNodeLabel(endNode)}`);
        this.recordAlgorithmOutcome(result);
        this.renderFloydMatrix(result);

        // Настраиваем визуализатор
        this.visualizer = new AlgorithmVisualizer(this.cyAlgorithm);
        this.visualizer.setData(result.steps, result.path, startNode, endNode);

        if (useDetailedVisualization && !result.stepsTruncated && result.steps.length > 0) {
            const speed = parseInt(document.getElementById('range-speed').value) || 800;
            this.visualizer.setSpeed(speed);

            // Подписываемся на обновления шагов
            const self = this;
            this.visualizer.onStepChange((stepIndex, step) => {
                self.updateStepUI(stepIndex, step);
            });

            // Запускаем визуализацию
            this.visualizer.play();

            // Активируем кнопки управления
            ['btn-pause-algorithm', 'btn-resume-algorithm', 'btn-step-forward', 'btn-step-back', 'btn-reset-algorithm'].forEach(id => {
                document.getElementById(id).disabled = false;
            });

            this.showToast(`${meta.shortName}: визуализация запущена`, 'success');
            return;
        }

        // Для больших графов показываем только итог, без тяжёлой пошаговой истории.
        this.visualizer.highlightPath(result.path);
        this._showStaticAlgorithmResult(
            result,
            useDetailedVisualization
                ? 'Подробная визуализация отключена: достигнут лимит шагов'
                : this.getStaticModeDescription(algorithmId, nodeCount)
        );

        ['btn-pause-algorithm', 'btn-resume-algorithm', 'btn-step-forward', 'btn-step-back'].forEach(id => {
            document.getElementById(id).disabled = true;
        });
        document.getElementById('btn-reset-algorithm').disabled = false;

        this.showToast(`${meta.shortName}: итог рассчитан`, 'info');
    }

    /**
     * Быстрый запуск выбранного алгоритма без накопления визуальных шагов.
     */
    runAlgorithmFast() {
        const endpoints = this._getAlgorithmEndpoints();
        if (!endpoints) return;
        const { startNode, endNode } = endpoints;
        const algorithmId = this.getSelectedAlgorithm();
        const meta = this.getAlgorithmMeta(algorithmId);

        if (!this.validateSelectedAlgorithm(algorithmId)) return;

        this.syncCytoscapeFromGraph(this.cyAlgorithm);
        setTimeout(() => this.cyAlgorithm.fit(undefined, 50), 50);

        let result;
        try {
            const algorithm = this.createAlgorithmInstance(algorithmId, { captureSteps: false });
            result = algorithm.run(startNode, endNode);
        } catch (err) {
            this.showToast(err.message, 'error');
            return;
        }

        this.lastAlgorithmResult = result;
        this._annotateAlgorithmResult(result, startNode, endNode, algorithmId);
        this.visualizer = new AlgorithmVisualizer(this.cyAlgorithm);
        this.visualizer.setData([], result.path, startNode, endNode);
        this.visualizer.highlightPath(result.path);
        this.renderFloydMatrix(result);

        this._showStaticAlgorithmResult(result, 'Режим «Только расчёт»: итог показан без пошаговой визуализации');

        ['btn-pause-algorithm', 'btn-resume-algorithm', 'btn-step-forward', 'btn-step-back'].forEach(id => {
            document.getElementById(id).disabled = true;
        });
        document.getElementById('btn-reset-algorithm').disabled = false;

        this.recordAction(`Запущен быстрый расчёт (${meta.shortName}): ${this.formatNodeLabel(startNode)} → ${this.formatNodeLabel(endNode)}`);
        this.recordAlgorithmOutcome(result);
        this.showToast('Расчёт выполнен без визуализации', 'success');
    }

    /**
     * Добавить к результату контекст, нужный для экспорта.
     */
    _annotateAlgorithmResult(result, startNode, endNode, algorithmId = this.getSelectedAlgorithm()) {
        const meta = this.getAlgorithmMeta(algorithmId);
        result.startNode = startNode;
        result.endNode = endNode;
        result.graphType = this.graphManager.isDirected() ? 'directed' : 'undirected';
        result.algorithmId = meta.id;
        result.algorithmName = meta.name;
        result.algorithmShortName = meta.shortName;
    }

    getStaticModeDescription(algorithmId, nodeCount) {
        if (algorithmId === 'floyd-warshall' && nodeCount > 15) {
            return 'Флойд-Уоршелл выполнен без пошаговой анимации: для матричного алгоритма показан итог и матрица расстояний';
        }

        return `Граф содержит больше ${this.visualizationNodeLimit} вершин — показан итог без пошаговой визуализации`;
    }

    formatNodeLabel(nodeId) {
        const node = this.graphManager.getNode(nodeId);
        return node && node.label ? node.label : String(nodeId || '').replace('n', '');
    }

    renderDistanceBadge(distance) {
        if (distance === Infinity || distance === 'Infinity') {
            return '<span class="distance-badge infinity">∞</span>';
        }

        const numeric = Number(distance);
        const cls = numeric === 0 ? ' zero' : '';
        return `<span class="distance-badge${cls}">${AppUtils.formatDistance(distance)}</span>`;
    }

    renderFloydMatrix(result) {
        const section = document.getElementById('floyd-matrix-section');
        const container = document.getElementById('floyd-matrix-display');
        if (!section || !container) return;

        if (!result || !result.allPairsDistances) {
            section.style.display = 'none';
            return;
        }

        const nodes = Array.from(result.allPairsDistances.keys());
        section.style.display = 'block';

        if (nodes.length === 0) {
            container.innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Матрица пуста</span>';
            return;
        }

        const headerCells = nodes.map(nodeId => `<th>${this.formatNodeLabel(nodeId)}</th>`).join('');
        const rows = nodes.map(rowId => {
            const row = result.allPairsDistances.get(rowId);
            const cells = nodes.map(colId => {
                const value = row ? row.get(colId) : Infinity;
                const classes = [
                    value === Infinity ? 'infinity' : '',
                    value === 0 ? 'zero' : '',
                    Number(value) < 0 ? 'negative' : ''
                ].filter(Boolean).join(' ');
                const text = value === Infinity ? '∞' : value;
                return `<td class="${classes}">${text}</td>`;
            }).join('');

            return `<tr><td class="row-header">${this.formatNodeLabel(rowId)}</td>${cells}</tr>`;
        }).join('');

        container.innerHTML = `
            <table class="floyd-matrix-table" aria-label="Матрица расстояний Флойда-Уоршелла">
                <thead><tr><th>из/в</th>${headerCells}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    /**
     * Записать итог алгоритма в историю действий.
     */
    recordAlgorithmOutcome(result) {
        if (result.path && result.path.length > 0) {
            this.recordAction(`Найден путь: ${result.path.map(n => this.formatNodeLabel(n)).join(' → ')}, стоимость ${result.distance}`);
        } else {
            this.recordAction('Путь не найден');
        }
    }

    /**
     * Обновить UI при изменении шага визуализации.
     * @param {number} stepIndex — индекс текущего шага
     * @param {object|null} step — данные шага
     */
    updateStepUI(stepIndex, step) {
        const descEl = document.getElementById('step-description');
        const counterEl = document.getElementById('step-counter');
        const queueDisplay = document.getElementById('queue-display');
        const currentNodeDisplay = document.getElementById('current-node-display');

        if (!step) {
            descEl.querySelector('span').textContent = 'Готов к запуску';
            counterEl.textContent = '';
            return;
        }

        // --- Описание шага ---
        descEl.querySelector('span').textContent = step.description;
        counterEl.textContent = `${stepIndex + 1} / ${this.visualizer.getTotalSteps()}`;

        // --- Текущая вершина ---
        if (step.currentNode) {
            currentNodeDisplay.innerHTML = `<strong style="color:var(--primary);font-size:1.5rem;">${this.formatNodeLabel(step.currentNode)}</strong>`;
        } else {
            currentNodeDisplay.textContent = '—';
        }

        if (step.distances) {
            this.renderDistanceTable(step.distances, step.predecessors, {
                currentNode: step.currentNode,
                updatedNode: step.updatedNode,
                updated: step.type === 'relax' || step.type === 'enqueue'
            });
        }

        // --- Очередь ---
        if (step.type === 'visit' || step.type === 'relax' || step.type === 'examine' || step.type === 'enqueue') {
            // Показываем вершины в очереди (непосещённые с конечным расстоянием)
            const queueItems = [];
            if (step.distances) {
                step.distances.forEach((dist, nodeId) => {
                    if (!step.visited.has(nodeId) && dist !== Infinity) {
                        queueItems.push({ nodeId, dist });
                    }
                });
            }
            queueItems.sort((a, b) => a.dist - b.dist);

            if (queueItems.length > 0) {
                queueDisplay.innerHTML = queueItems.map(item =>
                    `<span class="queue-item">${this.formatNodeLabel(item.nodeId)} (${AppUtils.formatDistance(item.dist)})</span>`
                ).join('');
            } else {
                queueDisplay.innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Очередь пуста</span>';
            }
        } else if (step.type === 'complete' || step.type === 'no_path') {
            queueDisplay.innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Очередь пуста</span>';
        }

        // --- Результат пути (на последнем шаге) ---
        if (step.type === 'complete' || step.type === 'no_path') {
            this._showPathResult();
        }
    }

    /**
     * Показать результат найденного пути.
     */
    _showPathResult() {
        const result = this.lastAlgorithmResult;
        if (!result) return;

        const pathResultEl = document.getElementById('path-result');
        const exportSection = document.getElementById('export-results-section');

        pathResultEl.style.display = 'block';
        exportSection.style.display = 'block';
        const algorithmNameEl = document.getElementById('algorithm-result-name');
        if (algorithmNameEl) {
            algorithmNameEl.textContent = result.algorithmName || this.getAlgorithmMeta().name;
        }

        if (result.path && result.path.length > 0) {
            document.getElementById('path-display').textContent =
                result.path.map(n => this.formatNodeLabel(n)).join(' → ');
            const costEl = document.getElementById('path-cost');
            const stepsEl = document.getElementById('path-steps');
            if (result.distance === Infinity) {
                costEl.textContent = '∞';
            } else if (window.GraphLabFX) {
                window.GraphLabFX.count(costEl, result.distance);
            } else {
                costEl.textContent = result.distance;
            }
            if (window.GraphLabFX) {
                window.GraphLabFX.count(stepsEl, result.steps.length);
            } else {
                stepsEl.textContent = result.steps.length;
            }
            document.getElementById('path-time').textContent = result.executionTime.toFixed(2) + ' мс';
        } else {
            document.getElementById('path-display').textContent = 'Путь не найден';
            document.getElementById('path-cost').textContent = '—';
            document.getElementById('path-steps').textContent = result.steps.length;
            document.getElementById('path-time').textContent = result.executionTime.toFixed(2) + ' мс';
        }
    }

    /**
     * Показать итог алгоритма без пошаговой визуализации.
     * Используется для больших графов и обрезанных журналов шагов.
     */
    _showStaticAlgorithmResult(result, description) {
        const descEl = document.getElementById('step-description');
        const counterEl = document.getElementById('step-counter');
        const queueDisplay = document.getElementById('queue-display');
        const currentNodeDisplay = document.getElementById('current-node-display');

        descEl.querySelector('span').textContent = description;
        counterEl.textContent = '';
        currentNodeDisplay.textContent = '—';
        queueDisplay.innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Очередь не отображается в быстром режиме</span>';

        this.renderDistanceTable(result.distances, result.predecessors, {
            pathNodes: new Set(result.path || [])
        });

        this._showPathResult();
    }

    /**
     * Отрисовать таблицу расстояний с текущей сортировкой.
     */
    renderDistanceTable(distances, predecessors, options = {}) {
        const distTableBody = document.getElementById('distance-table-body');
        const rows = AppUtils.buildDistanceRows(distances, predecessors);
        const sortedRows = AppUtils.sortDistanceRows(rows, this.distanceSort);

        this.currentDistanceView = { distances, predecessors, options };
        this.updateDistanceSortHeaders();
        distTableBody.innerHTML = '';

        if (sortedRows.length === 0) {
            distTableBody.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center;padding:20px;">Нет данных</td></tr>';
            return;
        }

        sortedRows.forEach(item => {
            const row = document.createElement('tr');
            if (options.currentNode === item.nodeId) {
                row.classList.add('current');
            } else if (options.updated && options.updatedNode === item.nodeId) {
                row.classList.add('updated');
            } else if (options.pathNodes && options.pathNodes.has(item.nodeId)) {
                row.classList.add('updated');
            }

            row.innerHTML = `
                <td><strong>${this.formatNodeLabel(item.nodeId)}</strong></td>
                <td>${this.renderDistanceBadge(item.distance)}</td>
                <td>${item.predecessor ? this.formatNodeLabel(item.predecessor) : '—'}</td>
            `;
            distTableBody.appendChild(row);
        });
    }

    /**
     * Изменить сортировку таблицы расстояний.
     */
    setDistanceSort(key) {
        if (this.distanceSort.key === key) {
            this.distanceSort.direction = this.distanceSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.distanceSort = { key, direction: 'asc' };
        }

        if (this.currentDistanceView) {
            this.renderDistanceTable(
                this.currentDistanceView.distances,
                this.currentDistanceView.predecessors,
                this.currentDistanceView.options
            );
        } else {
            this.updateDistanceSortHeaders();
        }
    }

    /**
     * Обновить визуальное состояние заголовков сортировки.
     */
    updateDistanceSortHeaders() {
        document.querySelectorAll('.distance-table .sortable-th').forEach(th => {
            const isActive = th.dataset.sort === this.distanceSort.key;
            th.classList.toggle('active', isActive);
            const icon = th.querySelector('i');
            if (!icon) return;
            icon.className = isActive
                ? (this.distanceSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down')
                : 'fas fa-sort';
        });
    }

    // ========================================================================
    // ПОДСВЕТКА СОСЕДЕЙ
    // ========================================================================

    /**
     * Подсветить соседей выбранной вершины.
     * @param {string} nodeId — ID вершины
     */
    highlightNeighbors(nodeId) {
        if (this.selectedNeighborNodeId === nodeId) {
            this.clearNeighborHighlight();
            return;
        }

        this.clearNeighborHighlight(false);
        this.selectedNeighborNodeId = nodeId;

        const selectedNode = this.cy.getElementById(nodeId);
        if (selectedNode.length) {
            selectedNode.addClass('selected-neighbor-source');
        }

        const groups = this.getNeighborGroups(nodeId);
        const allNeighbors = [...groups.outgoing, ...groups.incoming, ...groups.connected];
        const seenNodes = new Set();

        allNeighbors.forEach(item => {
            const node = this.cy.getElementById(item.nodeId);
            const edge = this.cy.getElementById(item.edgeId);
            if (node.length) {
                node.addClass('highlighted-neighbor');
                seenNodes.add(item.nodeId);
            }
            if (edge.length) {
                edge.addClass('highlighted-edge');
            }
        });

        this.renderNeighborsPanel(nodeId, groups);
        this.showToast(`Вершина ${this.formatNodeLabel(nodeId)}: ${seenNodes.size} соседей`, 'info');
    }

    /**
     * Снять подсветку соседей.
     */
    clearNeighborHighlight(updatePanel = true) {
        if (!this.cy) return;
        this.cy.nodes().removeClass('highlighted-neighbor selected-neighbor-source');
        this.cy.edges().removeClass('highlighted-edge');
        this.selectedNeighborNodeId = null;

        if (updatePanel) {
            const panel = document.getElementById('neighbors-display');
            if (panel) {
                panel.innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Кликните по вершине в режиме выделения</span>';
            }
        }
    }

    /**
     * Получить группы соседей для панели.
     */
    getNeighborGroups(nodeId) {
        const groups = { outgoing: [], incoming: [], connected: [] };

        this.graphManager.getEdges().forEach(edge => {
            if (this.graphManager.isDirected()) {
                if (edge.source === nodeId) {
                    groups.outgoing.push({ nodeId: edge.target, weight: edge.weight, edgeId: edge.id });
                }
                if (edge.target === nodeId) {
                    groups.incoming.push({ nodeId: edge.source, weight: edge.weight, edgeId: edge.id });
                }
            } else if (edge.source === nodeId || edge.target === nodeId) {
                groups.connected.push({
                    nodeId: edge.source === nodeId ? edge.target : edge.source,
                    weight: edge.weight,
                    edgeId: edge.id
                });
            }
        });

        return groups;
    }

    /**
     * Отрисовать список соседей выбранной вершины.
     */
    renderNeighborsPanel(nodeId, groups) {
        const panel = document.getElementById('neighbors-display');
        if (!panel) return;

        const makeRows = (items) => {
            if (items.length === 0) {
                return '<div class="neighbor-row"><span class="text-muted">Нет соседей</span><span></span></div>';
            }

            return items.map(item => `
                <div class="neighbor-row">
                    <span><strong>${this.formatNodeLabel(item.nodeId)}</strong></span>
                    <span class="neighbor-weight">вес ${item.weight}</span>
                </div>
            `).join('');
        };

        if (this.graphManager.isDirected()) {
            panel.innerHTML = `
                <div class="neighbor-group">
                    <div class="neighbor-group-title">Вершина ${this.formatNodeLabel(nodeId)}: исходящие</div>
                    ${makeRows(groups.outgoing)}
                </div>
                <div class="neighbor-group">
                    <div class="neighbor-group-title">Входящие</div>
                    ${makeRows(groups.incoming)}
                </div>
            `;
            return;
        }

        panel.innerHTML = `
            <div class="neighbor-group">
                <div class="neighbor-group-title">Вершина ${this.formatNodeLabel(nodeId)}: соседи</div>
                ${makeRows(groups.connected)}
            </div>
        `;
    }

    // ========================================================================
    // ПОИСК ВЕРШИНЫ
    // ========================================================================

    searchNode() {
        const value = document.getElementById('input-search-node').value.trim();
        if (!value) return;

        const nodeId = 'n' + value;
        const node = this.cy.getElementById(nodeId);

        if (node.length) {
            this.cy.animate({
                center: { eles: node },
                zoom: 1.5
            }, { duration: 500 });

            // Подсветка мигание
            node.addClass('current-node');
            setTimeout(() => node.removeClass('current-node'), 1500);
            this.showToast(`Вершина ${value} найдена`, 'success');
        } else {
            this.showToast(`Вершина ${value} не найдена`, 'error');
        }
    }

    // ========================================================================
    // ИСТОРИЯ ДЕЙСТВИЙ И АВТОСОХРАНЕНИЕ
    // ========================================================================

    recordAction(message) {
        const item = {
            message,
            time: new Date().toISOString()
        };

        this.actionHistory.unshift(item);
        this.actionHistory = this.actionHistory.slice(0, this.maxActionHistory);
        this.storageManager.saveActionHistory(this.actionHistory);
        this.renderActionHistory();
    }

    loadActionHistory() {
        const history = this.storageManager.loadActionHistory();
        this.actionHistory = Array.isArray(history) ? history.slice(0, this.maxActionHistory) : [];
    }

    renderActionHistory() {
        const container = document.getElementById('action-history-list');
        if (!container) return;

        if (this.actionHistory.length === 0) {
            container.innerHTML = '<span class="text-muted" style="font-size:0.82rem;">Действий пока нет</span>';
            return;
        }

        container.innerHTML = this.actionHistory.map(item => {
            const date = new Date(item.time);
            const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="history-item">
                    <span class="history-time">${time}</span>
                    <span class="history-text">${item.message}</span>
                </div>
            `;
        }).join('');
    }

    scheduleAutosave() {
        if (this.suppressAutosave) return;
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = setTimeout(() => this.saveCurrentState(), 350);
    }

    saveCurrentState() {
        const speed = parseInt(document.getElementById('range-speed').value, 10) || 800;
        this.storageManager.saveAutosave({
            graph: this.graphManager.toJSON(),
            settings: {
                darkTheme: document.body.classList.contains('dark-theme'),
                speed
            }
        });
    }

    promptAutosaveRestore() {
        const state = this.storageManager.loadAutosave();
        if (!state || !state.graph || !state.graph.nodes || state.graph.nodes.length === 0) return;

        try {
            GraphManager.validateGraphData(state.graph);
        } catch (err) {
            this.storageManager.clearAutosave();
            return;
        }

        this.autosaveRestoreState = state;
        const date = state.savedAt ? new Date(state.savedAt) : null;
        const dateText = date ? date.toLocaleString('ru-RU') : 'неизвестно';
        const summary = document.getElementById('autosave-summary');
        if (summary) {
            summary.textContent = `${state.graph.nodes.length} вершин, ${state.graph.edges.length} рёбер, сохранено: ${dateText}`;
        }

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-autosave-restore'));
        setTimeout(() => modal.show(), 150);
    }

    restoreAutosave() {
        if (!this.autosaveRestoreState) return;

        this.suppressAutosave = true;
        const restored = this.loadGraphFromData(this.autosaveRestoreState.graph, { skipAutosave: true });
        this.applySavedSettings(this.autosaveRestoreState.settings || {});
        this.suppressAutosave = false;

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-autosave-restore')).hide();

        if (restored) {
            this.recordAction('Восстановлено автосохранение');
            this.showToast('Последний граф восстановлен', 'success');
            this.scheduleAutosave();
        }
    }

    discardAutosave() {
        this.storageManager.clearAutosave();
        this.autosaveRestoreState = null;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-autosave-restore')).hide();
        this.showToast('Автосохранение очищено', 'info');
    }

    applySavedSettings(settings) {
        if (!settings) return;

        if (settings.darkTheme) {
            document.body.classList.add('dark-theme');
            document.querySelector('#btn-theme-toggle i').className = 'fas fa-sun fa-fw app-icon';
        } else {
            document.body.classList.remove('dark-theme');
            document.querySelector('#btn-theme-toggle i').className = 'fas fa-moon fa-fw app-icon';
        }

        this.refreshCytoscapeStyles();

        if (settings.speed) {
            const speed = parseInt(settings.speed, 10);
            const range = document.getElementById('range-speed');
            if (Number.isFinite(speed) && range) {
                range.value = speed;
                document.getElementById('speed-value').textContent = speed + 'мс';
                if (this.visualizer) this.visualizer.setSpeed(speed);
            }
        }

        this.storageManager.saveSettings(settings);
    }

    updateFastModeRecommendation() {
        const hint = document.getElementById('fast-mode-hint');
        if (!hint) return;
        hint.style.display = this.graphManager.getNodeCount() > 100 ? 'flex' : 'none';
    }

    exportPDFReport() {
        if (!this.lastAlgorithmResult) {
            this.showToast('Сначала запустите алгоритм', 'warning');
            return;
        }

        let graphImage = null;
        try {
            const targetCy = this.cyAlgorithm && this.cyAlgorithm.elements().length > 0 ? this.cyAlgorithm : this.cy;
            graphImage = targetCy.png({
                output: 'base64uri',
                bg: document.body.classList.contains('dark-theme') ? '#0f172a' : '#ffffff',
                full: true,
                scale: 1
            });
        } catch (err) {
            graphImage = null;
        }

        const reportData = AppUtils.createReportData({
            graphData: this.graphManager.toJSON(),
            isDirected: this.graphManager.isDirected(),
            startNode: this.lastAlgorithmResult.startNode,
            endNode: this.lastAlgorithmResult.endNode,
            result: this.lastAlgorithmResult,
            graphImage
        });

        try {
            this.storageManager.exportReportPDF(reportData);
            this.recordAction('Выполнен экспорт PDF-отчёта');
            this.showToast('PDF-отчёт сформирован', 'success');
        } catch (err) {
            this.showToast('Не удалось сформировать PDF: ' + err.message, 'error');
        }
    }

    // ========================================================================
    // БЕНЧМАРК
    // ========================================================================

    async runBenchmark() {
        const btn = document.getElementById('btn-run-benchmark');
        const progress = document.getElementById('benchmark-progress');
        const progressText = document.getElementById('benchmark-progress-text');
        const algorithms = this.getSelectedBenchmarkAlgorithms();

        if (algorithms.length === 0) {
            this.showToast('Выберите хотя бы один алгоритм для бенчмарка', 'warning');
            return;
        }

        btn.disabled = true;
        progress.classList.add('active');

        const sizes = algorithms.includes('floyd-warshall')
            ? [10, 25, 50, 100]
            : [10, 50, 100, 250, 500, 1000];

        try {
            const results = await this.performanceAnalyzer.runBenchmark(sizes, algorithms, (current, total, message) => {
                progressText.textContent = message;
            });

            this.performanceAnalyzer.renderChart('chart-performance', results);
            this.performanceAnalyzer.renderTable('performance-table-body', results);
            this.showToast('Бенчмарк завершён', 'success');
        } catch (err) {
            this.showToast('Ошибка бенчмарка: ' + err.message, 'error');
        }

        btn.disabled = false;
        progress.classList.remove('active');
    }

    getSelectedBenchmarkAlgorithms() {
        const map = [
            ['bench-dijkstra', 'dijkstra'],
            ['bench-bellman-ford', 'bellman-ford'],
            ['bench-floyd-warshall', 'floyd-warshall']
        ];

        return map
            .filter(([id]) => document.getElementById(id)?.checked)
            .map(([, algorithm]) => algorithm);
    }

    // ========================================================================
    // ТЕМА
    // ========================================================================

    toggleTheme() {
        const body = document.body;
        const icon = document.querySelector('#btn-theme-toggle i');

        body.classList.toggle('dark-theme');

        if (body.classList.contains('dark-theme')) {
            icon.className = 'fas fa-sun fa-fw app-icon';
            this.showToast('Тёмная тема', 'info');
        } else {
            icon.className = 'fas fa-moon fa-fw app-icon';
            this.showToast('Светлая тема', 'info');
        }

        this.refreshCytoscapeStyles();

        this.storageManager.saveSettings({
            darkTheme: body.classList.contains('dark-theme')
        });
        this.scheduleAutosave();
    }

    refreshCytoscapeStyles() {
        const styles = this._getCytoscapeStyles();
        [this.cy, this.cyAlgorithm].forEach(cy => {
            if (cy) cy.style(styles).update();
        });
    }

    // ========================================================================
    // ПОЛНОЭКРАННЫЙ РЕЖИМ
    // ========================================================================

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            document.querySelector('#btn-fullscreen i').className = 'fas fa-compress fa-fw app-icon';
        } else {
            document.exitFullscreen().catch(() => {});
            document.querySelector('#btn-fullscreen i').className = 'fas fa-expand fa-fw app-icon';
        }
    }

    // ========================================================================
    // ЗАГРУЗКА ПРИМЕРОВ
    // ========================================================================

    async loadExamples() {
        const container = document.getElementById('examples-list');

        try {
            const examples = await this.storageManager.getExamples();

            if (examples.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="folder-open" class="empty-state-icon"></i>
                        <p>Примеры не найдены</p>
                    </div>`;
                return;
            }

            container.innerHTML = '';
            examples.forEach(example => {
                const item = document.createElement('div');
                item.className = 'example-item';
                item.innerHTML = `
                    <div class="example-name">${example.name}</div>
                    <div class="example-desc">${example.description}</div>
                `;
                item.addEventListener('click', () => {
                    if (this.loadGraphFromData(example.data)) {
                        this.showToast(`Загружен: ${example.name}`, 'success');
                        this.recordAction(`Загружен пример «${example.name}»`);
                    }
                });
                container.appendChild(item);
            });
        } catch (e) {
            container.innerHTML = '<div class="empty-state"><p>Откройте через Live Server для загрузки примеров</p></div>';
        }
    }

    // ========================================================================
    // ЗАГРУЗКА ГРАФА ИЗ ДАННЫХ
    // ========================================================================

    /**
     * Загрузить граф из объекта данных.
     * @param {object} data — данные графа
     */
    loadGraphFromData(data, options = {}) {
        try {
            this.graphManager.fromJSON(data);
        } catch (err) {
            this.showToast(err.message, 'error');
            return false;
        }

        // Обновляем переключатель типа графа
        if (this.graphManager.isDirected()) {
            document.getElementById('btn-directed').classList.add('active');
            document.getElementById('btn-undirected').classList.remove('active');
        } else {
            document.getElementById('btn-undirected').classList.add('active');
            document.getElementById('btn-directed').classList.remove('active');
        }

        this.syncCytoscapeFromGraph();
        this.undoRedoManager.clear();
        this.updateUndoRedoButtons();
        this.cy.fit(undefined, 50);
        this.clearNeighborHighlight();
        this.updateNodeSelectors();
        this.updateFastModeRecommendation();
        this.updateAlgorithmUI();

        if (!options.skipAutosave) {
            this.scheduleAutosave();
        }

        return true;
    }

    // ========================================================================
    // СПИСОК СОХРАНЁННЫХ ГРАФОВ
    // ========================================================================

    updateSavedGraphsList() {
        const container = document.getElementById('saved-graphs-list');
        const graphs = this.storageManager.getSavedGraphs();

        if (graphs.length === 0) {
            container.innerHTML = '<div class="text-muted" style="font-size:0.82rem;text-align:center;padding:8px;">Нет сохранённых графов</div>';
            return;
        }

        container.innerHTML = '';
        graphs.forEach(g => {
            const item = document.createElement('div');
            item.className = 'saved-graph-item';

            const date = new Date(g.date);
            const dateStr = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="saved-graph-info">
                    <div class="saved-graph-name">${g.name}</div>
                    <div class="saved-graph-meta">${g.nodeCount} верш. · ${g.edgeCount} рёб. · ${dateStr}</div>
                </div>
                <div class="saved-graph-actions">
                    <button class="btn-tool btn-sm-custom load-btn" title="Загрузить"><i data-lucide="download"></i></button>
                    <button class="btn-tool btn-sm-custom btn-danger-tool delete-btn" title="Удалить"><i data-lucide="trash"></i></button>
                </div>
            `;

            // Загрузить
            item.querySelector('.load-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const data = this.storageManager.loadGraph(g.name);
                if (data) {
                    if (this.loadGraphFromData(data)) {
                        this.showToast(`Граф «${g.name}» загружен`, 'success');
                        this.recordAction(`Граф «${g.name}» загружен`);
                    }
                }
            });

            // Удалить
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Удалить граф «${g.name}»?`)) {
                    this.storageManager.deleteGraph(g.name);
                    this.updateSavedGraphsList();
                    this.showToast(`Граф «${g.name}» удалён`, 'warning');
                }
            });

            container.appendChild(item);
        });
    }

    // ========================================================================
    // НАСТРОЙКИ
    // ========================================================================

    loadSettings() {
        const settings = this.storageManager.loadSettings();
        this.applySavedSettings(settings);
    }

    // ========================================================================
    // МИНИКАРТА
    // ========================================================================

    _setupMinimap() {
        // Создаём мини-версию графа в контейнере #minimap
        this.cyMinimap = cytoscape({
            container: document.getElementById('minimap'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'width': 6, 'height': 6,
                        'background-color': '#2563eb',
                        'label': ''
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1, 'line-color': '#94a3b8',
                        'label': '', 'curve-style': 'bezier'
                    }
                }
            ],
            layout: { name: 'preset' },
            userZoomingEnabled: false,
            userPanningEnabled: false,
            boxSelectionEnabled: false,
            autoungrabify: true,
            autounselectify: true
        });
    }

    _updateMinimap() {
        if (!this.cyMinimap) return;
        this.cyMinimap.elements().remove();

        this.graphManager.getNodes().forEach(node => {
            this.cyMinimap.add({
                group: 'nodes',
                data: { id: node.id },
                position: { x: node.x, y: node.y }
            });
        });

        this.graphManager.getEdges().forEach(edge => {
            this.cyMinimap.add({
                group: 'edges',
                data: { id: edge.id, source: edge.source, target: edge.target }
            });
        });

        this.cyMinimap.fit(undefined, 5);
    }

    // ========================================================================
    // УВЕДОМЛЕНИЯ (TOAST)
    // ========================================================================

    /**
     * Показать уведомление.
     * @param {string} message — текст
     * @param {string} type — success | error | warning | info
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-custom toast-${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);

        // Автоудаление через 3 секунды
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// ============================================================================
// ТОЧКА ВХОДА
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    if (window.DependencyCheck && !window.DependencyCheck.ensureReady()) {
        return;
    }

    const app = new AppController();
    app.init();
    window.app = app;
});
