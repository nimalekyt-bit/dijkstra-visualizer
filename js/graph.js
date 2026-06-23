/**
 * ============================================================================
 * graph.js — Модуль управления структурой данных графа
 * ============================================================================
 * 
 * Роль: представление графа в виде списка смежности.
 * Поддерживает ориентированные и неориентированные графы.
 * Предоставляет API для добавления/удаления вершин и рёбер,
 * генерации случайных графов, сериализации/десериализации (JSON).
 * 
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

class GraphManager {
    /**
     * Конструктор графа.
     * Инициализирует пустой граф с возможностью выбора типа (ориентированный / неориентированный).
     */
    constructor() {
        /** @type {Map<string, {id: string, label: string, x: number, y: number}>} */
        this.nodes = new Map();

        /** @type {Map<string, {id: string, source: string, target: string, weight: number}>} */
        this.edges = new Map();

        /** @type {Set<string>} Быстрая проверка существующих рёбер */
        this._edgeKeys = new Set();

        /** @type {boolean} Является ли граф ориентированным */
        this._directed = false;

        /** @type {number} Счётчик для генерации уникальных ID вершин */
        this._nodeIdCounter = 0;

        /** @type {number} Счётчик для генерации уникальных ID рёбер */
        this._edgeIdCounter = 0;
    }

    // ========================================================================
    // УПРАВЛЕНИЕ ВЕРШИНАМИ
    // ========================================================================

    /**
     * Добавить вершину в граф.
     * @param {number} x — координата X на холсте
     * @param {number} y — координата Y на холсте
     * @param {string} [customId] — пользовательский ID (опционально)
     * @param {string} [customLabel] — пользовательская подпись вершины (опционально)
     * @returns {string} — ID созданной вершины
     */
    addNode(x, y, customId, customLabel) {
        const id = customId || `n${this._nodeIdCounter++}`;
        const label = customLabel !== undefined && String(customLabel).trim() !== ''
            ? String(customLabel).trim()
            : id.replace('n', '');
        this.nodes.set(id, { id, label, x, y });
        return id;
    }

    /**
     * Удалить вершину и все связанные с ней рёбра.
     * @param {string} nodeId — ID вершины
     */
    removeNode(nodeId) {
        if (!this.nodes.has(nodeId)) return;

        // Удаляем все рёбра, связанные с этой вершиной
        const edgesToRemove = [];
        this.edges.forEach((edge, edgeId) => {
            if (edge.source === nodeId || edge.target === nodeId) {
                edgesToRemove.push(edgeId);
            }
        });
        edgesToRemove.forEach(edgeId => this.edges.delete(edgeId));
        this._rebuildEdgeKeys();

        // Удаляем саму вершину
        this.nodes.delete(nodeId);
    }

    /**
     * Получить информацию о вершине.
     * @param {string} nodeId — ID вершины
     * @returns {object|null} — данные вершины или null
     */
    getNode(nodeId) {
        return this.nodes.get(nodeId) || null;
    }

    /**
     * Обновить позицию вершины.
     * @param {string} nodeId — ID вершины
     * @param {number} x — новая координата X
     * @param {number} y — новая координата Y
     */
    updateNodePosition(nodeId, x, y) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.x = x;
            node.y = y;
        }
    }

    /**
     * Обновить пользовательскую подпись вершины.
     * @param {string} nodeId — ID вершины
     * @param {string} label — новая подпись
     * @returns {boolean}
     */
    updateNodeLabel(nodeId, label) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        const normalized = String(label || '').trim();
        node.label = normalized || node.id.replace('n', '');
        return true;
    }

    // ========================================================================
    // УПРАВЛЕНИЕ РЁБРАМИ
    // ========================================================================

    /**
     * Добавить ребро между двумя вершинами.
     * @param {string} source — ID начальной вершины
     * @param {string} target — ID конечной вершины
     * @param {number} weight — вес ребра
     * @param {string} [customId] — пользовательский ID ребра (опционально)
     * @returns {string|null} — ID созданного ребра или null при ошибке
     */
    addEdge(source, target, weight, customId, options = {}) {
        const silent = options.silent === true;

        // Проверяем существование обеих вершин
        if (!this.nodes.has(source) || !this.nodes.has(target)) {
            if (!silent) console.warn('Невозможно создать ребро: одна из вершин не существует');
            return null;
        }

        // Запрещаем петли
        if (source === target) {
            if (!silent) console.warn('Невозможно создать ребро: петли запрещены');
            return null;
        }

        weight = Number(weight);

        if (!Number.isFinite(weight)) {
            if (!silent) console.warn('Невозможно создать ребро: вес должен быть конечным числом');
            return null;
        }

        // Проверяем, нет ли уже такого ребра
        if (this._edgeExists(source, target)) {
            if (!silent) console.warn('Ребро между этими вершинами уже существует');
            return null;
        }

        if (customId && this.edges.has(customId)) {
            if (!silent) console.warn('Ребро с таким ID уже существует');
            return null;
        }

        weight = Math.round(weight);

        const id = customId || `e${this._edgeIdCounter++}`;
        this.edges.set(id, { id, source, target, weight });
        this._edgeKeys.add(this._edgeKey(source, target));
        return id;
    }

    /**
     * Удалить ребро.
     * @param {string} edgeId — ID ребра
     */
    removeEdge(edgeId) {
        if (this.edges.delete(edgeId)) {
            this._rebuildEdgeKeys();
        }
    }

    /**
     * Обновить вес ребра.
     * @param {string} edgeId — ID ребра
     * @param {number} weight — новый вес
     */
    updateEdgeWeight(edgeId, weight) {
        const edge = this.edges.get(edgeId);
        if (!edge) return false;

        weight = Number(weight);
        if (!Number.isFinite(weight)) {
            console.warn('Невозможно обновить вес: вес должен быть конечным числом');
            return false;
        }

        edge.weight = Math.round(weight);
        return true;
    }

    /**
     * Проверить существование ребра между двумя вершинами.
     * @private
     * @param {string} source — ID исходной вершины
     * @param {string} target — ID целевой вершины
     * @returns {boolean}
     */
    _edgeExists(source, target) {
        return this._edgeKeys.has(this._edgeKey(source, target));
    }

    /**
     * Построить ключ ребра с учётом типа графа.
     * @private
     */
    _edgeKey(source, target) {
        if (this._directed) return `${source}->${target}`;
        return [source, target].sort().join('--');
    }

    /**
     * Пересобрать набор ключей после массовых изменений.
     * @private
     */
    _rebuildEdgeKeys() {
        this._edgeKeys.clear();
        this.edges.forEach(edge => {
            this._edgeKeys.add(this._edgeKey(edge.source, edge.target));
        });
    }

    /**
     * Найти ребро по вершинам.
     * @param {string} source — ID исходной вершины
     * @param {string} target — ID целевой вершины
     * @returns {object|null}
     */
    findEdge(source, target) {
        for (const edge of this.edges.values()) {
            if (edge.source === source && edge.target === target) return edge;
            if (!this._directed && edge.source === target && edge.target === source) return edge;
        }
        return null;
    }

    // ========================================================================
    // СТРУКТУРА ГРАФА
    // ========================================================================

    /**
     * Получить всех соседей вершины.
     * @param {string} nodeId — ID вершины
     * @returns {Array<{nodeId: string, weight: number, edgeId: string}>} — список соседей
     */
    getNeighbors(nodeId) {
        const neighbors = [];

        this.edges.forEach((edge) => {
            if (edge.source === nodeId) {
                neighbors.push({
                    nodeId: edge.target,
                    weight: edge.weight,
                    edgeId: edge.id
                });
            }

            // Для неориентированного графа учитываем обратное направление
            if (!this._directed && edge.target === nodeId) {
                neighbors.push({
                    nodeId: edge.source,
                    weight: edge.weight,
                    edgeId: edge.id
                });
            }
        });

        return neighbors;
    }

    /**
     * Построить список смежности.
     * @returns {Map<string, Array<{nodeId: string, weight: number}>>}
     */
    getAdjacencyList() {
        const adjList = new Map();

        // Инициализируем пустыми массивами для всех вершин
        this.nodes.forEach((_, nodeId) => {
            adjList.set(nodeId, []);
        });

        // Заполняем рёбрами
        this.edges.forEach((edge) => {
            adjList.get(edge.source).push({
                nodeId: edge.target,
                weight: edge.weight
            });

            if (!this._directed) {
                adjList.get(edge.target).push({
                    nodeId: edge.source,
                    weight: edge.weight
                });
            }
        });

        return adjList;
    }

    // ========================================================================
    // ТИП ГРАФА
    // ========================================================================

    /**
     * Установить тип графа: ориентированный или неориентированный.
     * @param {boolean} directed — true = ориентированный
     */
    setDirected(directed) {
        this._directed = directed;
        this._rebuildEdgeKeys();
    }

    /**
     * Проверить, является ли граф ориентированным.
     * @returns {boolean}
     */
    isDirected() {
        return this._directed;
    }

    // ========================================================================
    // СТАТИСТИКА
    // ========================================================================

    /**
     * Получить количество вершин.
     * @returns {number}
     */
    getNodeCount() {
        return this.nodes.size;
    }

    /**
     * Получить количество рёбер.
     * @returns {number}
     */
    getEdgeCount() {
        return this.edges.size;
    }

    /**
     * Получить массив всех вершин.
     * @returns {Array<object>}
     */
    getNodes() {
        return Array.from(this.nodes.values());
    }

    /**
     * Получить массив всех рёбер.
     * @returns {Array<object>}
     */
    getEdges() {
        return Array.from(this.edges.values());
    }

    /**
     * Проверить наличие отрицательных весов.
     * @returns {boolean}
     */
    hasNegativeWeights() {
        return this.getEdges().some(edge => Number(edge.weight) < 0);
    }

    // ========================================================================
    // ОЧИСТКА
    // ========================================================================

    /**
     * Полностью очистить граф.
     */
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this._edgeKeys.clear();
        this._nodeIdCounter = 0;
        this._edgeIdCounter = 0;
    }

    // ========================================================================
    // СЕРИАЛИЗАЦИЯ / ДЕСЕРИАЛИЗАЦИЯ
    // ========================================================================

    /**
     * Сериализовать граф в JSON-совместимый объект.
     * @returns {object} — данные графа
     */
    toJSON() {
        return {
            directed: this._directed,
            nodes: this.getNodes(),
            edges: this.getEdges(),
            nodeIdCounter: this._nodeIdCounter,
            edgeIdCounter: this._edgeIdCounter
        };
    }

    /**
     * Восстановить граф из JSON-объекта.
     * @param {object} data — данные графа
     */
    fromJSON(data) {
        GraphManager.validateGraphData(data);

        this.clear();
        this._directed = data.directed || false;

        // Восстанавливаем вершины
        if (data.nodes) {
            data.nodes.forEach(node => {
                this.nodes.set(node.id, {
                    id: node.id,
                    label: node.label || node.id.replace('n', ''),
                    x: node.x || 0,
                    y: node.y || 0
                });
            });
        }

        // Восстанавливаем рёбра
        if (data.edges) {
            data.edges.forEach(edge => {
                this.addEdge(edge.source, edge.target, edge.weight, edge.id, { silent: true });
            });
        }

        // Восстанавливаем счётчики
        this._nodeIdCounter = data.nodeIdCounter || this._calculateMaxId(this.nodes, 'n');
        this._edgeIdCounter = data.edgeIdCounter || this._calculateMaxId(this.edges, 'e');
    }

    /**
     * Проверить структуру импортируемого графа.
     * @param {object} data — данные графа
     * @returns {true}
     */
    static validateGraphData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Неверный формат: данные графа должны быть объектом');
        }

        if (data.directed !== undefined && typeof data.directed !== 'boolean') {
            throw new Error('Неверный формат: поле directed должно быть boolean');
        }

        if (!Array.isArray(data.nodes)) {
            throw new Error('Неверный формат: отсутствует массив nodes');
        }

        if (!Array.isArray(data.edges)) {
            throw new Error('Неверный формат: отсутствует массив edges');
        }

        const nodeIds = new Set();
        data.nodes.forEach((node, index) => {
            if (!node || typeof node !== 'object') {
                throw new Error(`Неверный формат: вершина #${index + 1} должна быть объектом`);
            }

            if (typeof node.id !== 'string' || node.id.trim() === '') {
                throw new Error(`Неверный формат: у вершины #${index + 1} отсутствует строковый id`);
            }

            if (nodeIds.has(node.id)) {
                throw new Error(`Неверный формат: дублирующийся id вершины ${node.id}`);
            }

            if (node.label !== undefined && typeof node.label !== 'string') {
                throw new Error(`Неверный формат: label вершины ${node.id} должен быть строкой`);
            }

            if (node.x !== undefined && !Number.isFinite(Number(node.x))) {
                throw new Error(`Неверный формат: координата x вершины ${node.id} некорректна`);
            }

            if (node.y !== undefined && !Number.isFinite(Number(node.y))) {
                throw new Error(`Неверный формат: координата y вершины ${node.id} некорректна`);
            }

            nodeIds.add(node.id);
        });

        const edgeIds = new Set();
        const edgeKeys = new Set();
        const directed = data.directed === true;

        data.edges.forEach((edge, index) => {
            if (!edge || typeof edge !== 'object') {
                throw new Error(`Неверный формат: ребро #${index + 1} должно быть объектом`);
            }

            if (typeof edge.id !== 'string' || edge.id.trim() === '') {
                throw new Error(`Неверный формат: у ребра #${index + 1} отсутствует строковый id`);
            }

            if (edgeIds.has(edge.id)) {
                throw new Error(`Неверный формат: дублирующийся id ребра ${edge.id}`);
            }

            if (!nodeIds.has(edge.source)) {
                throw new Error(`Неверный формат: ребро ${edge.id} ссылается на несуществующую вершину ${edge.source}`);
            }

            if (!nodeIds.has(edge.target)) {
                throw new Error(`Неверный формат: ребро ${edge.id} ссылается на несуществующую вершину ${edge.target}`);
            }

            if (edge.source === edge.target) {
                throw new Error(`Неверный формат: ребро ${edge.id} является петлёй`);
            }

            const weight = Number(edge.weight);
            if (!Number.isFinite(weight)) {
                throw new Error(`Неверный формат: ребро ${edge.id} имеет некорректный вес`);
            }

            const edgeKey = directed
                ? `${edge.source}->${edge.target}`
                : [edge.source, edge.target].sort().join('--');

            if (edgeKeys.has(edgeKey)) {
                throw new Error(`Неверный формат: дублирующееся ребро ${edge.source} → ${edge.target}`);
            }

            edgeIds.add(edge.id);
            edgeKeys.add(edgeKey);
        });

        ['nodeIdCounter', 'edgeIdCounter'].forEach(field => {
            if (data[field] !== undefined && (!Number.isInteger(Number(data[field])) || Number(data[field]) < 0)) {
                throw new Error(`Неверный формат: поле ${field} должно быть неотрицательным целым числом`);
            }
        });

        return true;
    }

    /**
     * Вычислить максимальный ID для правильной генерации следующих ID.
     * @private
     * @param {Map} map — карта элементов
     * @param {string} prefix — префикс ID ('n' или 'e')
     * @returns {number}
     */
    _calculateMaxId(map, prefix) {
        let maxId = 0;
        map.forEach((_, key) => {
            const num = parseInt(key.replace(prefix, ''), 10);
            if (!isNaN(num) && num >= maxId) {
                maxId = num + 1;
            }
        });
        return maxId;
    }

    // ========================================================================
    // ГЕНЕРАЦИЯ СЛУЧАЙНЫХ ГРАФОВ
    // ========================================================================

    /**
     * Сгенерировать случайный связный граф.
     * 
     * Алгоритм:
     * 1. Создаём N вершин с случайными координатами.
     * 2. Строим остовное дерево (для гарантии связности).
     * 3. Добавляем дополнительные рёбра в зависимости от плотности.
     * 
     * @param {number} nodeCount — количество вершин
     * @param {number} minWeight — минимальный вес ребра
     * @param {number} maxWeight — максимальный вес ребра
     * @param {number} density — плотность графа (0.0 — 1.0)
     */
    generateRandom(nodeCount, minWeight, maxWeight, density) {
        this.clear();

        // Ограничиваем разумные значения
        nodeCount = Math.max(2, Math.min(1000, nodeCount));
        minWeight = Number.isFinite(Number(minWeight)) ? Math.round(Number(minWeight)) : 1;
        maxWeight = Number.isFinite(Number(maxWeight)) ? Math.round(Number(maxWeight)) : 20;
        minWeight = Math.max(-999, Math.min(999, minWeight));
        maxWeight = Math.max(minWeight, Math.min(999, maxWeight));
        density = Math.max(0.1, Math.min(1.0, density));

        // === Шаг 1: Создаём вершины ===
        const canvasWidth = 800;
        const canvasHeight = 600;
        const padding = 50;

        for (let i = 0; i < nodeCount; i++) {
            // Располагаем вершины кольцом для красивой визуализации
            const angle = (2 * Math.PI * i) / nodeCount;
            const radiusX = (canvasWidth - 2 * padding) / 2.5;
            const radiusY = (canvasHeight - 2 * padding) / 2.5;
            const x = canvasWidth / 2 + radiusX * Math.cos(angle) + (Math.random() - 0.5) * 40;
            const y = canvasHeight / 2 + radiusY * Math.sin(angle) + (Math.random() - 0.5) * 40;

            this.addNode(x, y);
        }

        const nodeIds = Array.from(this.nodes.keys());

        // === Шаг 2: Строим остовное дерево для гарантии связности ===
        // Перемешиваем массив вершин
        const shuffled = [...nodeIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Соединяем каждую вершину со следующей в перемешанном порядке
        for (let i = 0; i < shuffled.length - 1; i++) {
            const weight = this._randomWeight(minWeight, maxWeight);
            this.addEdge(shuffled[i], shuffled[i + 1], weight, undefined, { silent: true });
        }

        // === Шаг 3: Добавляем дополнительные рёбра по плотности ===
        const maxEdges = this._directed
            ? nodeCount * (nodeCount - 1)
            : nodeCount * (nodeCount - 1) / 2;
        const targetEdges = Math.min(
            Math.floor(maxEdges * density),
            maxEdges
        );
        const additionalEdges = targetEdges - (nodeCount - 1);

        let attempts = 0;
        let added = 0;
        const maxAttempts = additionalEdges * 10;

        while (added < additionalEdges && attempts < maxAttempts) {
            const srcIdx = Math.floor(Math.random() * nodeCount);
            const tgtIdx = Math.floor(Math.random() * nodeCount);

            if (srcIdx !== tgtIdx) {
                const source = nodeIds[srcIdx];
                const target = nodeIds[tgtIdx];
                const weight = this._randomWeight(minWeight, maxWeight);
                const edgeId = this.addEdge(source, target, weight, undefined, { silent: true });
                if (edgeId) added++;
            }

            attempts++;
        }
    }

    /**
     * Генерация случайного веса.
     * @private
     * @param {number} min — минимум
     * @param {number} max — максимум
     * @returns {number}
     */
    _randomWeight(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

// Экспортируем в глобальную область
window.GraphManager = GraphManager;
