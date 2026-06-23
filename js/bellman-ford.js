/**
 * ============================================================================
 * bellman-ford.js — Реализация алгоритма Беллмана-Форда
 * ============================================================================
 *
 * Роль: альтернативный алгоритм кратчайших путей с поддержкой
 * отрицательных весов рёбер.
 *
 * Алгоритм Беллмана-Форда находит кратчайшие пути от начальной вершины
 * до всех остальных вершин графа, поддерживая рёбра с отрицательными
 * весами. Обнаруживает наличие отрицательных циклов.
 *
 * Реализовано вручную без использования готовых библиотек.
 *
 * Интерфейс полностью совместим с DijkstraAlgorithm для единообразной
 * работы визуализатора.
 *
 * Сложность: O(V·E)
 *
 * Автор: Курсовая работа — Алгоритм Беллмана-Форда
 * ============================================================================
 */

'use strict';

// ============================================================================
// АЛГОРИТМ БЕЛЛМАНА-ФОРДА
// ============================================================================

/**
 * Реализация алгоритма Беллмана-Форда для нахождения кратчайших путей
 * от заданной начальной вершины до всех остальных вершин графа.
 *
 * Алгоритм:
 * 1. Инициализировать расстояние до начальной вершины = 0,
 *    до всех остальных = ∞
 * 2. Повторить (V - 1) раз:
 *    a. Для каждого ребра (u, v) с весом w:
 *       - Если dist[u] + w < dist[v]:
 *         * Обновить dist[v] = dist[u] + w
 *         * Записать предшественника prev[v] = u
 * 3. Проверка на отрицательные циклы:
 *    Ещё раз пройти по всем рёбрам — если можно улучшить
 *    какое-либо расстояние, значит существует отрицательный цикл.
 * 4. Восстановить кратчайший путь по массиву предшественников
 *
 * Сложность: O(V·E)
 */
class BellmanFordAlgorithm {
    /**
     * @param {GraphManager} graphManager — экземпляр менеджера графа
     * @param {object} [options] — опции алгоритма
     * @param {boolean} [options.captureSteps=true] — записывать ли шаги визуализации
     * @param {number} [options.maxDetailedSteps=Infinity] — максимум подробных шагов
     */
    constructor(graphManager, options = {}) {
        /** @type {GraphManager} */
        this.graph = graphManager;

        /** @type {Map<string, number>} Массив кратчайших расстояний */
        this.distances = new Map();

        /** @type {Map<string, string|null>} Массив предшественников */
        this.predecessors = new Map();

        /** @type {Set<string>} Множество вершин, для которых расстояние было улучшено */
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
     * Запустить алгоритм Беллмана-Форда.
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
     *   predecessors: Map<string, string|null>,
     *   visualizationLimited: boolean,
     *   stepsTruncated: boolean
     * }}
     * @throws {Error} При обнаружении отрицательного цикла
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

        // Получаем список всех вершин и рёбер
        const allNodes = Array.from(this.graph.nodes.keys());
        const allEdges = this._getAllEdges();
        const nodeCount = allNodes.length;

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
        // ШАГ 2: Основной цикл — (V - 1) итераций по всем рёбрам
        // ====================================================================
        // На каждой итерации проходим по всем рёбрам графа и пытаемся
        // улучшить (релаксировать) расстояние до конечной вершины ребра.
        // После (V - 1) итераций все кратчайшие пути гарантированно найдены
        // (если нет отрицательных циклов).

        for (let iteration = 1; iteration < nodeCount; iteration++) {
            this._recordStep({
                type: 'iteration-start',
                currentNode: null,
                description: `Итерация ${iteration} из ${nodeCount - 1}`,
                relaxedEdge: null,
                updatedNode: null
            });

            let anyRelaxed = false;

            for (const edge of allEdges) {
                this.operationCount++;

                const { source, target, weight } = edge;
                const sourceDist = this.distances.get(source);

                // Если расстояние до source ещё бесконечно — пропускаем
                if (sourceDist === Infinity) {
                    continue;
                }

                const newDist = sourceDist + weight;
                const oldDist = this.distances.get(target);

                // Находим ребро для визуализации
                const graphEdge = this.captureSteps
                    ? this.graph.findEdge(source, target)
                    : null;

                this._recordStep({
                    type: 'examine',
                    currentNode: source,
                    description: `Проверяем ребро ${source.replace('n', '')} → ${target.replace('n', '')}: ${sourceDist} + ${weight} = ${newDist} (текущее: ${oldDist === Infinity ? '∞' : oldDist})`,
                    relaxedEdge: graphEdge ? graphEdge.id : null,
                    updatedNode: target
                });

                // Если нашли более короткий путь — релаксация
                if (newDist < oldDist) {
                    // Обновляем расстояние
                    this.distances.set(target, newDist);

                    // Запоминаем предшественника
                    this.predecessors.set(target, source);

                    // Добавляем вершину в множество «посещённых» для визуализации
                    this.visited.add(target);

                    anyRelaxed = true;

                    this._recordStep({
                        type: 'relax',
                        currentNode: source,
                        description: `Релаксация: dist[${target.replace('n', '')}] обновлено ${oldDist === Infinity ? '∞' : oldDist} → ${newDist}`,
                        relaxedEdge: graphEdge ? graphEdge.id : null,
                        updatedNode: target
                    });
                } else {
                    this._recordStep({
                        type: 'skip',
                        currentNode: source,
                        description: `Пропускаем: ${newDist} ≥ ${oldDist === Infinity ? '∞' : oldDist} — улучшение невозможно`,
                        relaxedEdge: graphEdge ? graphEdge.id : null,
                        updatedNode: target
                    });
                }
            }

            // Оптимизация: если на текущей итерации не было ни одной
            // релаксации, дальнейшие итерации бессмысленны — выходим раньше
            if (!anyRelaxed) {
                break;
            }
        }

        // ====================================================================
        // ШАГ 3: Проверка на отрицательные циклы
        // ====================================================================
        // Если на (V)-й итерации ещё можно улучшить расстояние,
        // значит граф содержит отрицательный цикл
        for (const edge of allEdges) {
            this.operationCount++;

            const { source, target, weight } = edge;
            const sourceDist = this.distances.get(source);

            if (sourceDist === Infinity) {
                continue;
            }

            const newDist = sourceDist + weight;
            const oldDist = this.distances.get(target);

            if (newDist < oldDist) {
                // Обнаружен отрицательный цикл
                this._recordStep({
                    type: 'negative-cycle',
                    currentNode: source,
                    description: `Обнаружен отрицательный цикл! Ребро ${source.replace('n', '')} → ${target.replace('n', '')}: ${sourceDist} + ${weight} = ${newDist} < ${oldDist}`,
                    relaxedEdge: this.captureSteps
                        ? (this.graph.findEdge(source, target) || {}).id || null
                        : null,
                    updatedNode: target
                });

                throw new Error(
                    `Граф содержит отрицательный цикл. Обнаружен на ребре ${source.replace('n', '')} → ${target.replace('n', '')}. ` +
                    `Алгоритм Беллмана-Форда не может найти кратчайший путь.`
                );
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
     * Получить все рёбра графа в формате { source, target, weight }.
     * Для ненаправленных графов каждое ребро включается в обоих направлениях.
     *
     * @private
     * @returns {Array<{source: string, target: string, weight: number}>}
     */
    _getAllEdges() {
        const edges = this.graph.getEdges();
        const isDirected = this.graph.isDirected();
        const result = [];

        for (const edge of edges) {
            const weight = Number(edge.weight);

            result.push({
                source: edge.source,
                target: edge.target,
                weight: weight
            });

            // Для ненаправленных графов добавляем обратное ребро
            if (!isDirected) {
                result.push({
                    source: edge.target,
                    target: edge.source,
                    weight: weight
                });
            }
        }

        return result;
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

            // Снимок состояния (клонируем Map/Set)
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
window.BellmanFordAlgorithm = BellmanFordAlgorithm;
