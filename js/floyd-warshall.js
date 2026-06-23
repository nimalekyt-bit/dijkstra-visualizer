/**
 * ============================================================================
 * floyd-warshall.js — Реализация алгоритма Флойда-Уоршелла
 * ============================================================================
 *
 * Роль: алгоритм нахождения кратчайших путей между ВСЕМИ парами вершин.
 *
 * Алгоритм Флойда-Уоршелла:
 *   Для каждой промежуточной вершины k:
 *     Для каждой пары вершин (i, j):
 *       Если dist[i][k] + dist[k][j] < dist[i][j] → обновить dist[i][j]
 *
 * Сложность: O(V³) по времени, O(V²) по памяти.
 *
 * Реализовано вручную без использования готовых библиотек.
 * Интерфейс совместим с DijkstraAlgorithm для единообразной работы
 * визуализатора и UI.
 *
 * Автор: Курсовая работа — Алгоритм Флойда-Уоршелла
 * ============================================================================
 */

'use strict';

// ============================================================================
// АЛГОРИТМ ФЛОЙДА-УОРШЕЛЛА
// ============================================================================

/**
 * Реализация алгоритма Флойда-Уоршелла для нахождения кратчайших путей
 * между всеми парами вершин графа (допускаются отрицательные веса,
 * но не отрицательные циклы).
 *
 * Алгоритм:
 * 1. Инициализировать матрицу расстояний:
 *    dist[i][i] = 0, dist[i][j] = weight(i,j) или ∞
 * 2. Для каждой промежуточной вершины k:
 *    Для каждой пары (i, j):
 *      Если dist[i][k] + dist[k][j] < dist[i][j]:
 *        dist[i][j] = dist[i][k] + dist[k][j]
 *        next[i][j] = next[i][k]
 * 3. Проверить отрицательные циклы (dist[i][i] < 0)
 * 4. Восстановить путь по матрице next
 *
 * Сложность: O(V³)
 */
class FloydWarshallAlgorithm {
    /**
     * @param {GraphManager} graphManager — экземпляр менеджера графа
     * @param {object} [options={}] — настройки алгоритма
     * @param {boolean} [options.captureSteps=true] — записывать ли шаги визуализации
     * @param {number} [options.maxDetailedSteps=Infinity] — максимум записываемых шагов
     */
    constructor(graphManager, options = {}) {
        /** @type {GraphManager} */
        this.graph = graphManager;

        /** @type {Map<string, number>} Расстояния от стартовой вершины (для совместимости) */
        this.distances = new Map();

        /** @type {Map<string, string|null>} Предшественники от стартовой вершины (для совместимости) */
        this.predecessors = new Map();

        /** @type {Set<string>} Множество использованных промежуточных вершин k */
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

        /**
         * Матрица расстояний: dist[i][j] — кратчайшее расстояние от i до j.
         * Реализована как Map<string, Map<string, number>>.
         * @type {Map<string, Map<string, number>>}
         */
        this.dist = new Map();

        /**
         * Матрица следующих вершин для восстановления пути.
         * next[i][j] — следующая вершина на кратчайшем пути от i до j.
         * @type {Map<string, Map<string, string|null>>}
         */
        this.next = new Map();
    }

    /**
     * Запустить алгоритм Флойда-Уоршелла.
     *
     * Хотя алгоритм вычисляет расстояния между ВСЕМИ парами вершин,
     * для совместимости с интерфейсом DijkstraAlgorithm принимает
     * startNodeId и endNodeId и возвращает путь между ними.
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
     *   stepsTruncated: boolean,
     *   allPairsDistances: Map<string, Map<string, number>>
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
        this.dist = new Map();
        this.next = new Map();

        // Проверяем входные данные
        this._validateInput(startNodeId, endNodeId);

        // Получаем все вершины графа
        const allNodes = Array.from(this.graph.nodes.keys());
        const nodeCount = allNodes.length;

        // ====================================================================
        // ШАГ 1: Инициализация матриц dist и next
        // ====================================================================
        this._initializeMatrices(allNodes);

        // Инициализируем distances и predecessors для стартовой вершины
        // (для совместимости — снимки показывают расстояния от startNodeId)
        this._updateDistancesFromStart(startNodeId, allNodes);

        // Записываем начальный шаг
        this._recordStep({
            type: 'init',
            currentNode: startNodeId,
            description: `Инициализация: матрица ${nodeCount}×${nodeCount}, dist[i][i] = 0, dist[i][j] = вес ребра или ∞`,
            relaxedEdge: null,
            updatedNode: null
        });

        // ====================================================================
        // ШАГ 2: Основной цикл — три вложенных цикла (k, i, j)
        // ====================================================================
        for (let ki = 0; ki < nodeCount; ki++) {
            const k = allNodes[ki];

            // Помечаем вершину k как использованную промежуточную
            this.visited.add(k);

            // Обновляем distances от startNodeId для снимков
            this._updateDistancesFromStart(startNodeId, allNodes);

            // Записываем шаг начала итерации по k
            this._recordStep({
                type: 'iteration-k',
                currentNode: k,
                description: `Итерация k = ${k.replace('n', '')}: проверяем пути через вершину ${k.replace('n', '')}`,
                relaxedEdge: null,
                updatedNode: null
            });

            for (let ii = 0; ii < nodeCount; ii++) {
                const i = allNodes[ii];
                const distIK = this.dist.get(i).get(k);

                // Оптимизация: если dist[i][k] = ∞, ничего не улучшится
                if (distIK === Infinity) {
                    continue;
                }

                for (let ji = 0; ji < nodeCount; ji++) {
                    const j = allNodes[ji];
                    this.operationCount++;

                    const distKJ = this.dist.get(k).get(j);

                    // Если dist[k][j] = ∞, пропускаем
                    if (distKJ === Infinity) {
                        continue;
                    }

                    const newDist = distIK + distKJ;
                    const oldDist = this.dist.get(i).get(j);

                    // Записываем шаг проверки пары (i, j)
                    this._recordStep({
                        type: 'examine-pair',
                        currentNode: k,
                        description: `Проверяем: dist[${i.replace('n', '')}][${j.replace('n', '')}] = ${oldDist === Infinity ? '∞' : oldDist} vs dist[${i.replace('n', '')}][${k.replace('n', '')}] + dist[${k.replace('n', '')}][${j.replace('n', '')}] = ${distIK} + ${distKJ} = ${newDist}`,
                        relaxedEdge: null,
                        updatedNode: j
                    });

                    // Если нашли более короткий путь через вершину k
                    if (newDist < oldDist) {
                        // Обновляем расстояние
                        this.dist.get(i).set(j, newDist);

                        // Обновляем матрицу next для восстановления пути
                        this.next.get(i).set(j, this.next.get(i).get(k));

                        // Обновляем distances от startNodeId для снимков
                        this._updateDistancesFromStart(startNodeId, allNodes);

                        // Записываем шаг релаксации
                        this._recordStep({
                            type: 'relax',
                            currentNode: k,
                            description: `Релаксация: dist[${i.replace('n', '')}][${j.replace('n', '')}] обновлено ${oldDist === Infinity ? '∞' : oldDist} → ${newDist} (через ${k.replace('n', '')})`,
                            relaxedEdge: null,
                            updatedNode: j
                        });
                    } else {
                        this._recordStep({
                            type: 'skip',
                            currentNode: k,
                            description: `Пропускаем: ${newDist} ≥ ${oldDist === Infinity ? '∞' : oldDist} — улучшение невозможно`,
                            relaxedEdge: null,
                            updatedNode: j
                        });
                    }
                }
            }
        }

        // ====================================================================
        // ШАГ 3: Проверка на отрицательные циклы
        // ====================================================================
        this._checkNegativeCycles(allNodes);

        // ====================================================================
        // ШАГ 4: Извлечение результатов для пары (startNodeId, endNodeId)
        // ====================================================================

        // Финальное обновление distances и predecessors от startNodeId
        this._updateDistancesFromStart(startNodeId, allNodes);
        this._updatePredecessorsFromStart(startNodeId, allNodes);

        // Восстанавливаем путь
        const path = this._reconstructPath(startNodeId, endNodeId);
        const endDistance = endNodeId ? this.dist.get(startNodeId).get(endNodeId) : 0;
        const totalDistance = endNodeId
            ? (endDistance === undefined ? Infinity : endDistance)
            : 0;

        // Записываем финальный шаг
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

        // Формируем allPairsDistances — копия полной матрицы расстояний
        const allPairsDistances = new Map();
        for (const [nodeI, row] of this.dist) {
            allPairsDistances.set(nodeI, new Map(row));
        }

        const nextMatrix = new Map();
        for (const [nodeI, row] of this.next) {
            nextMatrix.set(nodeI, new Map(row));
        }

        return {
            path,
            distance: totalDistance,
            steps: this.steps,
            operationCount: this.operationCount,
            executionTime,
            distances: new Map(this.distances),
            predecessors: new Map(this.predecessors),
            visualizationLimited: !this.captureSteps,
            stepsTruncated: this.stepsTruncated,
            allPairsDistances,
            distMatrix: allPairsDistances,
            nextMatrix
        };
    }

    /**
     * Инициализировать матрицы dist и next.
     *
     * dist[i][j] = 0 если i === j,
     *              weight(i, j) если есть ребро,
     *              Infinity иначе.
     *
     * next[i][j] = j если есть ребро или i === j,
     *              null иначе.
     *
     * @private
     * @param {string[]} allNodes — массив ID всех вершин
     */
    _initializeMatrices(allNodes) {
        const edges = this.graph.getEdges();
        const isDirected = this.graph.isDirected();

        // Инициализируем матрицы значениями по умолчанию
        for (const i of allNodes) {
            this.dist.set(i, new Map());
            this.next.set(i, new Map());

            for (const j of allNodes) {
                if (i === j) {
                    this.dist.get(i).set(j, 0);
                    this.next.get(i).set(j, j);
                } else {
                    this.dist.get(i).set(j, Infinity);
                    this.next.get(i).set(j, null);
                }
            }
        }

        // Заполняем матрицу по рёбрам графа
        for (const edge of edges) {
            const weight = Number(edge.weight);
            const src = edge.source;
            const tgt = edge.target;

            // Берём минимальный вес, если между вершинами несколько рёбер
            const currentDist = this.dist.get(src).get(tgt);
            if (weight < currentDist) {
                this.dist.get(src).set(tgt, weight);
                this.next.get(src).set(tgt, tgt);
            }

            // Для неориентированного графа добавляем обратное ребро
            if (!isDirected) {
                const currentDistRev = this.dist.get(tgt).get(src);
                if (weight < currentDistRev) {
                    this.dist.get(tgt).set(src, weight);
                    this.next.get(tgt).set(src, src);
                }
            }
        }
    }

    /**
     * Обновить Map distances (расстояния от startNodeId) для снимков.
     * Извлекает строку dist[startNodeId][*] из полной матрицы.
     *
     * @private
     * @param {string} startNodeId — начальная вершина
     * @param {string[]} allNodes — массив ID всех вершин
     */
    _updateDistancesFromStart(startNodeId, allNodes) {
        const startRow = this.dist.get(startNodeId);
        if (!startRow) return;

        for (const nodeId of allNodes) {
            this.distances.set(nodeId, startRow.get(nodeId));
        }
    }

    /**
     * Обновить Map predecessors (предшественники от startNodeId).
     * Восстанавливает предшественников из матрицы next.
     *
     * Для каждой вершины j: предшественник — это вершина, из которой
     * мы приходим в j на кратчайшем пути от startNodeId.
     *
     * @private
     * @param {string} startNodeId — начальная вершина
     * @param {string[]} allNodes — массив ID всех вершин
     */
    _updatePredecessorsFromStart(startNodeId, allNodes) {
        for (const j of allNodes) {
            if (j === startNodeId) {
                this.predecessors.set(j, null);
                continue;
            }

            const dist = this.dist.get(startNodeId).get(j);
            if (dist === Infinity) {
                this.predecessors.set(j, null);
                continue;
            }

            // Восстанавливаем путь от startNodeId до j и берём предпоследнюю вершину
            const pathToJ = this._reconstructPath(startNodeId, j);
            if (pathToJ.length >= 2) {
                this.predecessors.set(j, pathToJ[pathToJ.length - 2]);
            } else {
                this.predecessors.set(j, null);
            }
        }
    }

    /**
     * Проверить входные вершины.
     * @private
     * @param {string} startNodeId — ID начальной вершины
     * @param {string} [endNodeId] — ID конечной вершины
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
     * Проверить наличие отрицательных циклов.
     * Если dist[i][i] < 0, значит существует отрицательный цикл,
     * проходящий через вершину i.
     *
     * @private
     * @param {string[]} allNodes — массив ID всех вершин
     * @throws {Error} если обнаружен отрицательный цикл
     */
    _checkNegativeCycles(allNodes) {
        for (const node of allNodes) {
            if (this.dist.get(node).get(node) < 0) {
                // Записываем шаг обнаружения отрицательного цикла
                this._recordStep({
                    type: 'negative-cycle',
                    currentNode: node,
                    description: `Обнаружен отрицательный цикл через вершину ${node.replace('n', '')}`,
                    relaxedEdge: null,
                    updatedNode: node
                });

                throw new Error(
                    `Обнаружен отрицательный цикл в графе (через вершину ${node.replace('n', '')}). ` +
                    `Алгоритм Флойда-Уоршелла не может найти кратчайшие пути при наличии отрицательных циклов.`
                );
            }
        }
    }

    /**
     * Восстановить кратчайший путь от startNodeId до endNodeId
     * по матрице next.
     *
     * next[i][j] хранит следующую вершину на кратчайшем пути от i до j.
     * Путь восстанавливается итеративно: i → next[i][j] → next[next[i][j]][j] → ... → j
     *
     * @private
     * @param {string} startNodeId — начальная вершина
     * @param {string} [endNodeId] — конечная вершина
     * @returns {string[]} — массив ID вершин, составляющих путь
     */
    _reconstructPath(startNodeId, endNodeId) {
        if (!endNodeId) return [];

        // Проверяем, что вершины существуют в матрице
        if (!this.next.has(startNodeId) || !this.next.get(startNodeId).has(endNodeId)) {
            return [];
        }

        // Если расстояние = Infinity, путь не существует
        if (this.dist.get(startNodeId).get(endNodeId) === Infinity) {
            return [];
        }

        // Если next[start][end] === null, пути нет
        if (this.next.get(startNodeId).get(endNodeId) === null) {
            return [];
        }

        const path = [];
        let current = startNodeId;
        const seen = new Set();

        // Идём по матрице next от start до end
        while (current !== endNodeId) {
            // Защита от бесконечных циклов
            if (seen.has(current)) return [];
            seen.add(current);

            path.push(current);
            current = this.next.get(current).get(endNodeId);

            // Если next вернул null — путь оборвался
            if (current === null || current === undefined) {
                return [];
            }
        }

        // Добавляем конечную вершину
        path.push(endNodeId);

        return path;
    }

    /**
     * Записать текущее состояние алгоритма как шаг визуализации.
     * Каждый шаг содержит полный снимок состояния (snapshot).
     *
     * Формат совместим с шагами DijkstraAlgorithm.
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

            // Снимок состояния (совместимо с DijkstraAlgorithm)
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
window.FloydWarshallAlgorithm = FloydWarshallAlgorithm;
