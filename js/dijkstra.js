/**
 * ============================================================================
 * dijkstra.js — Реализация алгоритма Дейкстры
 * ============================================================================
 * 
 * Роль: ядро проекта — пошаговая реализация алгоритма Дейкстры
 * для нахождения кратчайших путей в графах с неотрицательными весами.
 * 
 * Реализовано вручную без использования готовых библиотек.
 * 
 * Содержит:
 * - Очередь с приоритетами (PriorityQueue) на основе бинарной кучи
 * - Алгоритм Дейкстры с записью каждого шага для пошаговой визуализации
 * 
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

// ============================================================================
// ОЧЕРЕДЬ С ПРИОРИТЕТАМИ (мин-куча)
// ============================================================================

/**
 * Реализация очереди с приоритетами на основе бинарной кучи (min-heap).
 * 
 * Бинарная куча — это полное двоичное дерево, в котором значение
 * каждого узла меньше или равно значений его потомков.
 * 
 * Это обеспечивает:
 *  - Вставку: O(log n)
 *  - Извлечение минимума: O(log n)
 *  - Просмотр минимума: O(1)
 */
class PriorityQueue {
    constructor() {
        /**
         * Массив элементов кучи.
         * Каждый элемент — объект { element, priority }
         * @type {Array<{element: string, priority: number}>}
         */
        this.heap = [];
    }

    /**
     * Добавить элемент с заданным приоритетом.
     * Элемент «всплывает» вверх по куче, пока не окажется на своём месте.
     * 
     * @param {string} element — идентификатор (например, ID вершины)
     * @param {number} priority — приоритет (чем меньше — тем выше приоритет)
     */
    enqueue(element, priority) {
        const item = { element, priority };
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    /**
     * Извлечь элемент с наименьшим приоритетом (корень кучи).
     * Последний элемент перемещается в корень, затем «проталкивается» вниз.
     * 
     * @returns {{element: string, priority: number}|null}
     */
    dequeue() {
        if (this.isEmpty()) return null;

        const min = this.heap[0];
        const last = this.heap.pop();

        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._sinkDown(0);
        }

        return min;
    }

    /**
     * Проверить, пуста ли очередь.
     * @returns {boolean}
     */
    isEmpty() {
        return this.heap.length === 0;
    }

    /**
     * Получить размер очереди.
     * @returns {number}
     */
    size() {
        return this.heap.length;
    }

    /**
     * Проверить, содержится ли элемент в очереди.
     * @param {string} element — идентификатор
     * @returns {boolean}
     */
    contains(element) {
        return this.heap.some(item => item.element === element);
    }

    /**
     * Получить содержимое очереди (для отображения).
     * @returns {Array<{element: string, priority: number}>}
     */
    toArray() {
        return [...this.heap].sort((a, b) => a.priority - b.priority);
    }

    /**
     * «Всплытие» элемента вверх по куче.
     * Элемент меняется местами с родителем, пока приоритет
     * элемента меньше приоритета родителя.
     * 
     * @private
     * @param {number} index — индекс элемента
     */
    _bubbleUp(index) {
        while (index > 0) {
            // Индекс родительского элемента: (i - 1) / 2
            const parentIndex = Math.floor((index - 1) / 2);

            // Если приоритет текущего элемента >= приоритету родителя — стоп
            if (this.heap[index].priority >= this.heap[parentIndex].priority) {
                break;
            }

            // Меняем местами с родителем
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    /**
     * «Проталкивание» элемента вниз по куче.
     * Элемент меняется местами с наименьшим потомком,
     * пока оба потомка не станут больше или равны текущему.
     * 
     * @private
     * @param {number} index — индекс элемента
     */
    _sinkDown(index) {
        const length = this.heap.length;

        while (true) {
            let smallest = index;
            const left = 2 * index + 1;   // Левый потомок
            const right = 2 * index + 2;  // Правый потомок

            // Сравниваем с левым потомком
            if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
                smallest = left;
            }

            // Сравниваем с правым потомком
            if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
                smallest = right;
            }

            // Если наименьший — не текущий, меняем и продолжаем
            if (smallest !== index) {
                [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
                index = smallest;
            } else {
                break;
            }
        }
    }
}

// ============================================================================
// АЛГОРИТМ ДЕЙКСТРЫ
// ============================================================================

/**
 * Реализация алгоритма Дейкстры для нахождения кратчайших путей
 * от заданной начальной вершины до всех остальных вершин графа.
 * 
 * Алгоритм:
 * 1. Инициализировать расстояние до начальной вершины = 0,
 *    до всех остальных = ∞
 * 2. Поместить начальную вершину в очередь с приоритетом 0
 * 3. Пока очередь не пуста:
 *    a. Извлечь вершину с минимальным расстоянием (u)
 *    b. Для каждого соседа v вершины u:
 *       - Вычислить новое расстояние = dist[u] + weight(u, v)
 *       - Если новое расстояние < dist[v]:
 *         * Обновить dist[v]
 *         * Записать предшественника prev[v] = u
 *         * Добавить v в очередь
 * 4. Восстановить кратчайший путь по массиву предшественников
 * 
 * Сложность: O((V + E) · log V) с бинарной кучей
 */
class DijkstraAlgorithm {
    /**
     * @param {GraphManager} graphManager — экземпляр менеджера графа
     */
    constructor(graphManager, options = {}) {
        /** @type {GraphManager} */
        this.graph = graphManager;

        /** @type {Map<string, number>} Массив кратчайших расстояний */
        this.distances = new Map();

        /** @type {Map<string, string|null>} Массив предшественников */
        this.predecessors = new Map();

        /** @type {Set<string>} Множество посещённых (обработанных) вершин */
        this.visited = new Set();

        /** @type {Array<object>} Журнал шагов для пошаговой визуализации */
        this.steps = [];

        /** @type {number} Счётчик операций */
        this.operationCount = 0;

        /** @type {boolean} Записывать ли подробные шаги визуализации */
        this.captureSteps = options.captureSteps !== false;

        /** @type {number} Максимум подробных шагов, сохраняемых в памяти */
        this.maxDetailedSteps = Number.isFinite(options.maxDetailedSteps)
            ? Math.max(0, options.maxDetailedSteps)
            : Infinity;

        /** @type {boolean} Были ли шаги обрезаны по лимиту */
        this.stepsTruncated = false;
    }

    /**
     * Запустить алгоритм Дейкстры.
     * 
     * @param {string} startNodeId — ID начальной вершины
     * @param {string} [endNodeId] — ID конечной вершины (опционально)
     * @returns {{
     *   path: string[],
     *   distance: number,
     *   steps: Array<object>,
     *   operationCount: number,
     *   executionTime: number,
     *   distances: Map<string, number>,
     *   predecessors: Map<string, string|null>
     * }}
     */
    run(startNodeId, endNodeId) {
        // Замеряем время выполнения
        const startTime = performance.now();

        // Сбрасываем состояние
        this.distances = new Map();
        this.predecessors = new Map();
        this.visited = new Set();
        this.steps = [];
        this.operationCount = 0;
        this.stepsTruncated = false;

        this._validateInput(startNodeId, endNodeId);
        this._validateWeights();

        // Получаем список смежности
        const adjList = this.graph.getAdjacencyList();
        const allNodes = Array.from(this.graph.nodes.keys());

        // ====================================================================
        // ШАГ 1: Инициализация
        // ====================================================================
        // Устанавливаем расстояние до начальной вершины = 0,
        // до всех остальных = бесконечность (Infinity)
        allNodes.forEach(nodeId => {
            this.distances.set(nodeId, nodeId === startNodeId ? 0 : Infinity);
            this.predecessors.set(nodeId, null);
        });

        // Записываем начальный шаг
        this._recordStep({
            type: 'init',
            currentNode: startNodeId,
            description: `Инициализация: dist[${startNodeId.replace('n', '')}] = 0, остальные = ∞`,
            relaxedEdge: null,
            updatedNode: null
        });

        // ====================================================================
        // ШАГ 2: Создаём очередь приоритетов и добавляем начальную вершину
        // ====================================================================
        const pq = new PriorityQueue();
        pq.enqueue(startNodeId, 0);
        this.operationCount++;

        this._recordStep({
            type: 'enqueue',
            currentNode: startNodeId,
            description: `Добавляем вершину ${startNodeId.replace('n', '')} в очередь с приоритетом 0`,
            relaxedEdge: null,
            updatedNode: startNodeId
        });

        // ====================================================================
        // ШАГ 3: Основной цикл
        // ====================================================================
        while (!pq.isEmpty()) {
            // Извлекаем вершину с минимальным расстоянием
            const { element: currentNode, priority: currentDist } = pq.dequeue();
            this.operationCount++;

            // Пропускаем, если вершина уже обработана
            // (в очереди могут быть устаревшие записи)
            if (this.visited.has(currentNode)) {
                continue;
            }

            // Помечаем вершину как посещённую
            this.visited.add(currentNode);

            this._recordStep({
                type: 'visit',
                currentNode: currentNode,
                description: `Извлекаем вершину ${currentNode.replace('n', '')} (расстояние: ${currentDist})`,
                relaxedEdge: null,
                updatedNode: null
            });

            // Если достигли конечной вершины — можно остановиться (оптимизация)
            if (endNodeId && currentNode === endNodeId) {
                this._recordStep({
                    type: 'found',
                    currentNode: currentNode,
                    description: `Конечная вершина ${currentNode.replace('n', '')} найдена! Расстояние: ${currentDist}`,
                    relaxedEdge: null,
                    updatedNode: null
                });
                break;
            }

            // Получаем список соседей текущей вершины
            const neighbors = adjList.get(currentNode) || [];

            // ================================================================
            // ШАГ 3a: Релаксация рёбер
            // ================================================================
            // Для каждого соседа проверяем, можно ли улучшить путь
            for (const neighbor of neighbors) {
                this.operationCount++;

                const { nodeId: neighborId, weight } = neighbor;

                // Пропускаем уже посещённые вершины
                if (this.visited.has(neighborId)) {
                    continue;
                }

                // Вычисляем новое расстояние через текущую вершину
                const newDist = this.distances.get(currentNode) + weight;
                const oldDist = this.distances.get(neighborId);

                // Находим ребро для визуализации
                const edge = this.captureSteps ? this.graph.findEdge(currentNode, neighborId) : null;

                this._recordStep({
                    type: 'examine',
                    currentNode: currentNode,
                    description: `Проверяем ребро ${currentNode.replace('n', '')} → ${neighborId.replace('n', '')}: ${this.distances.get(currentNode)} + ${weight} = ${newDist} (текущее: ${oldDist === Infinity ? '∞' : oldDist})`,
                    relaxedEdge: edge ? edge.id : null,
                    updatedNode: neighborId
                });

                // Если нашли более короткий путь — релаксация
                if (newDist < oldDist) {
                    // Обновляем расстояние
                    this.distances.set(neighborId, newDist);

                    // Запоминаем предшественника
                    this.predecessors.set(neighborId, currentNode);

                    // Добавляем в очередь с новым приоритетом
                    pq.enqueue(neighborId, newDist);
                    this.operationCount++;

                    this._recordStep({
                        type: 'relax',
                        currentNode: currentNode,
                        description: `Релаксация: dist[${neighborId.replace('n', '')}] обновлено ${oldDist === Infinity ? '∞' : oldDist} → ${newDist}`,
                        relaxedEdge: edge ? edge.id : null,
                        updatedNode: neighborId
                    });
                } else {
                    this._recordStep({
                        type: 'skip',
                        currentNode: currentNode,
                        description: `Пропускаем: ${newDist} ≥ ${oldDist === Infinity ? '∞' : oldDist} — улучшение невозможно`,
                        relaxedEdge: edge ? edge.id : null,
                        updatedNode: neighborId
                    });
                }
            }
        }

        // ====================================================================
        // ШАГ 4: Восстановление пути
        // ====================================================================
        const path = this._reconstructPath(startNodeId, endNodeId);
        const endDistance = endNodeId ? this.distances.get(endNodeId) : 0;
        const totalDistance = endNodeId
            ? (endDistance === undefined ? Infinity : endDistance)
            : 0;

        if (path.length > 0) {
            this._recordStep({
                type: 'complete',
                currentNode: null,
                description: `Алгоритм завершён. Кратчайший путь: ${path.map(n => n.replace('n', '')).join(' → ')} (длина: ${totalDistance})`,
                relaxedEdge: null,
                updatedNode: null
            });
        } else if (endNodeId) {
            this._recordStep({
                type: 'no_path',
                currentNode: null,
                description: `Путь от ${startNodeId.replace('n', '')} до ${endNodeId.replace('n', '')} не найден`,
                relaxedEdge: null,
                updatedNode: null
            });
        }

        const executionTime = performance.now() - startTime;

        return {
            path,
            distance: totalDistance,
            steps: this.steps,
            operationCount: this.operationCount,
            executionTime,
            distances: new Map(this.distances),
            predecessors: new Map(this.predecessors),
            visualizationLimited: !this.captureSteps,
            stepsTruncated: this.stepsTruncated
        };
    }

    /**
     * Проверить входные вершины.
     * @private
     */
    _validateInput(startNodeId, endNodeId) {
        if (!startNodeId || !this.graph.getNode(startNodeId)) {
            throw new Error(`Стартовая вершина ${startNodeId || 'не указана'} не существует`);
        }

        if (endNodeId && !this.graph.getNode(endNodeId)) {
            throw new Error(`Конечная вершина ${endNodeId} не существует`);
        }
    }

    /**
     * Проверить веса рёбер перед запуском алгоритма.
     * @private
     */
    _validateWeights() {
        const negativeEdge = this.graph.getEdges().find(edge => Number(edge.weight) < 0);
        if (negativeEdge) {
            throw new Error(`Алгоритм Дейкстры не поддерживает отрицательные веса: ребро ${negativeEdge.id} имеет вес ${negativeEdge.weight}`);
        }

        const invalidEdge = this.graph.getEdges().find(edge => {
            const weight = Number(edge.weight);
            return !this.graph.getNode(edge.source)
                || !this.graph.getNode(edge.target)
                || !Number.isFinite(weight);
        });

        if (invalidEdge) {
            throw new Error(`Ребро ${invalidEdge.id} содержит некорректные данные`);
        }
    }

    /**
     * Восстановить кратчайший путь от начальной до конечной вершины.
     * Идём от конечной вершины по массиву предшественников до начальной.
     * 
     * @private
     * @param {string} startNodeId — начальная вершина
     * @param {string} [endNodeId] — конечная вершина
     * @returns {string[]} — массив ID вершин, составляющих путь
     */
    _reconstructPath(startNodeId, endNodeId) {
        if (!endNodeId) return [];
        if (!this.distances.has(endNodeId)) return [];

        const path = [];
        let current = endNodeId;
        const seen = new Set();

        // Если расстояние = Infinity, путь не существует
        if (this.distances.get(endNodeId) === Infinity) {
            return [];
        }

        // Идём от конца к началу по предшественникам
        while (current !== null && current !== undefined) {
            if (seen.has(current)) return [];
            seen.add(current);
            path.unshift(current);
            current = this.predecessors.get(current) ?? null;
        }

        // Проверяем, что путь начинается с начальной вершины
        if (path[0] !== startNodeId) {
            return [];
        }

        return path;
    }

    /**
     * Записать текущее состояние алгоритма как шаг визуализации.
     * Каждый шаг содержит полный снимок состояния (snapshot).
     * 
     * @private
     * @param {object} info — информация о шаге
     */
    _recordStep(info) {
        if (!this.captureSteps) return;

        if (this.steps.length >= this.maxDetailedSteps) {
            this.stepsTruncated = true;
            return;
        }

        this.steps.push({
            index: this.steps.length,
            type: info.type,
            currentNode: info.currentNode,
            description: info.description,
            relaxedEdge: info.relaxedEdge,
            updatedNode: info.updatedNode,

            // Снимок состояния
            distances: new Map(this.distances),
            predecessors: new Map(this.predecessors),
            visited: new Set(this.visited),
            operationCount: this.operationCount
        });
    }

    /**
     * Получить все записанные шаги.
     * @returns {Array<object>}
     */
    getSteps() {
        return this.steps;
    }
}

// Экспортируем в глобальную область
window.PriorityQueue = PriorityQueue;
window.DijkstraAlgorithm = DijkstraAlgorithm;
