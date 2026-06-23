/**
 * ============================================================================
 * performance.js — Модуль анализа производительности
 * ============================================================================
 * 
 * Роль: бенчмаркинг алгоритма Дейкстры на графах различного размера.
 * Генерация случайных графов, замер времени и числа операций,
 * построение графиков через Chart.js и таблиц результатов.
 * 
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

class PerformanceAnalyzer {
    constructor() {
        /** @type {Chart|null} — экземпляр Chart.js для графика */
        this.chart = null;

        /** @type {Array<object>} — результаты последнего бенчмарка */
        this.results = [];
    }

    /**
     * Запустить комплексный бенчмарк на заданных размерах графа.
     * 
     * Для каждого размера:
     * 1. Генерируется случайный граф заданного размера
     * 2. Запускается выбранный алгоритм
     * 3. Измеряется время выполнения и количество операций
     * 4. Результаты усредняются по нескольким запускам
     * 
     * @param {number[]} sizes — массив размеров графа [10, 50, 100, 250, 500, 1000]
     * @param {string[]} [algorithms] — алгоритмы для сравнения
     * @param {Function} [onProgress] — callback(current, total, message)
     * @returns {Promise<Array<{nodeCount, edgeCount, time, operations, timeStd}>>}
     */
    async runBenchmark(sizes, algorithms = ['dijkstra'], onProgress) {
        if (typeof algorithms === 'function') {
            onProgress = algorithms;
            algorithms = ['dijkstra'];
        }

        algorithms = this._normalizeAlgorithms(algorithms);
        this.results = [];
        const totalTests = sizes.length * algorithms.length;
        const runsPerSize = 3; // Количество запусков для усреднения
        let completed = 0;

        for (const algorithmId of algorithms) {
            const algorithmMeta = this._getAlgorithmMeta(algorithmId);

            for (let i = 0; i < sizes.length; i++) {
                const nodeCount = sizes[i];

                if (onProgress) {
                    onProgress(completed, totalTests, `${algorithmMeta.shortName}: граф с ${nodeCount} вершинами...`);
                }

                // Даём время на обновление UI
                await this._sleep(50);

                const times = [];
                const operations = [];
                let edgeCount = 0;
                const currentRuns = algorithmId === 'floyd-warshall' && nodeCount >= 50 ? 1 : runsPerSize;

                for (let run = 0; run < currentRuns; run++) {
                    // Генерируем случайный граф
                    const graph = new GraphManager();
                    const density = nodeCount <= 100 ? 0.3 : (nodeCount <= 500 ? 0.15 : 0.05);
                    graph.generateRandom(nodeCount, 1, 100, density);

                    edgeCount = graph.getEdgeCount();
                    const nodes = graph.getNodes();

                    // Выбираем начальную и конечную вершины
                    const startNode = nodes[0].id;
                    const endNode = nodes[nodes.length - 1].id;

                    // Запускаем алгоритм и замеряем время
                    const algorithm = this._createAlgorithm(algorithmId, graph, { captureSteps: false });
                    const startTime = performance.now();
                    const result = algorithm.run(startNode, endNode);
                    const elapsed = performance.now() - startTime;

                    times.push(elapsed);
                    operations.push(result.operationCount);
                }

                // Вычисляем среднее и стандартное отклонение
                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                const avgOps = Math.round(operations.reduce((a, b) => a + b, 0) / operations.length);
                const timeStd = Math.sqrt(
                    times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length
                );

                this.results.push({
                    algorithm: algorithmId,
                    algorithmName: algorithmMeta.name,
                    algorithmShortName: algorithmMeta.shortName,
                    nodeCount,
                    edgeCount,
                    time: parseFloat(avgTime.toFixed(3)),
                    timeStd: parseFloat(timeStd.toFixed(3)),
                    operations: avgOps,
                    theoreticalComplexity: this._theoreticalComplexity(algorithmId, nodeCount, edgeCount),
                    theoreticalLabel: algorithmMeta.complexity
                });

                completed++;
            }
        }

        if (onProgress) {
            onProgress(totalTests, totalTests, 'Бенчмарк завершён!');
        }

        return this.results;
    }

    /**
     * Построить график результатов с помощью Chart.js.
     * 
     * @param {string} canvasId — ID элемента <canvas>
     * @param {Array<object>} results — результаты бенчмарка
     */
    renderChart(canvasId, results) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Уничтожаем предыдущий график
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = canvas.getContext('2d');

        const labels = Array.from(new Set(results.map(r => r.nodeCount))).sort((a, b) => a - b);
        const algorithms = Array.from(new Set(results.map(r => r.algorithm)));
        const colors = {
            'dijkstra': '#2563eb',
            'bellman-ford': '#14b8a6',
            'floyd-warshall': '#ec4899'
        };

        const datasets = [];
        algorithms.forEach(algorithmId => {
            const meta = this._getAlgorithmMeta(algorithmId);
            const color = colors[algorithmId] || '#64748b';
            const valuesBySize = new Map(results
                .filter(r => r.algorithm === algorithmId)
                .map(r => [r.nodeCount, r]));

            datasets.push({
                label: `${meta.shortName}: время (мс)`,
                data: labels.map(size => valuesBySize.get(size)?.time ?? null),
                borderColor: color,
                backgroundColor: this._hexToRgba(color, 0.12),
                borderWidth: 3,
                fill: false,
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                yAxisID: 'y'
            });

            datasets.push({
                label: `${meta.shortName}: операции`,
                data: labels.map(size => valuesBySize.get(size)?.operations ?? null),
                borderColor: color,
                backgroundColor: this._hexToRgba(color, 0.08),
                borderDash: [6, 5],
                borderWidth: 2,
                fill: false,
                tension: 0.25,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                yAxisID: 'y1'
            });
        });

        // Определяем цвета на основе текущей темы
        const isDark = document.body.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
        const textColor = isDark ? '#e2e8f0' : '#475569';

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(size => size.toString()),
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Сравнение производительности алгоритмов кратчайших путей',
                        font: { size: 16, weight: '600' },
                        color: textColor,
                        padding: { bottom: 20 }
                    },
                    legend: {
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 13 }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        titleColor: isDark ? '#e2e8f0' : '#1e293b',
                        bodyColor: isDark ? '#cbd5e1' : '#475569',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.raw;
                                if (label.includes('Время')) {
                                    return `${label}: ${value.toFixed(3)} мс`;
                                }
                                return `${label}: ${value.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Количество вершин',
                            color: textColor,
                            font: { size: 14, weight: '500' }
                        },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Время (мс)',
                            color: '#2563eb',
                            font: { size: 14, weight: '500' }
                        },
                        ticks: { color: '#2563eb' },
                        grid: { color: gridColor }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Операции',
                            color: '#22c55e',
                            font: { size: 14, weight: '500' }
                        },
                        ticks: { color: '#22c55e' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    /**
     * Заполнить таблицу результатов.
     * 
     * @param {string} tableBodyId — ID элемента <tbody>
     * @param {Array<object>} results — результаты бенчмарка
     */
    renderTable(tableBodyId, results) {
        const tbody = document.getElementById(tableBodyId);
        if (!tbody) return;

        tbody.innerHTML = '';

        results.forEach((r, index) => {
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.05}s`;
            row.classList.add('fade-in-row');

            const theoreticalComplexity = r.theoreticalComplexity ||
                this._theoreticalComplexity(r.algorithm || 'dijkstra', r.nodeCount, r.edgeCount);

            row.innerHTML = `
                <td><strong>${r.algorithmShortName || this._getAlgorithmMeta(r.algorithm || 'dijkstra').shortName}</strong></td>
                <td><strong>${r.nodeCount}</strong></td>
                <td>${r.edgeCount.toLocaleString()}</td>
                <td>
                    <span class="badge-time">${r.time.toFixed(3)} мс</span>
                </td>
                <td>${r.operations.toLocaleString()}</td>
                <td title="${r.theoreticalLabel || this._getAlgorithmMeta(r.algorithm || 'dijkstra').complexity}">${Math.round(theoreticalComplexity).toLocaleString()}</td>
                <td>
                    <span class="badge-ratio">${(r.operations / theoreticalComplexity).toFixed(2)}</span>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    /**
     * Утилита ожидания (для обновления UI между шагами бенчмарка).
     * @private
     * @param {number} ms — миллисекунды
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _normalizeAlgorithms(algorithms) {
        const allowed = new Set(['dijkstra', 'bellman-ford', 'floyd-warshall']);
        const normalized = Array.isArray(algorithms) ? algorithms.filter(id => allowed.has(id)) : [];
        return normalized.length > 0 ? normalized : ['dijkstra'];
    }

    _getAlgorithmMeta(algorithmId) {
        const meta = {
            'dijkstra': {
                name: 'Алгоритм Дейкстры',
                shortName: 'Дейкстра',
                className: 'DijkstraAlgorithm',
                complexity: 'O((V+E)logV)'
            },
            'bellman-ford': {
                name: 'Алгоритм Беллмана-Форда',
                shortName: 'Беллман-Форд',
                className: 'BellmanFordAlgorithm',
                complexity: 'O(V·E)'
            },
            'floyd-warshall': {
                name: 'Алгоритм Флойда-Уоршелла',
                shortName: 'Флойд-Уоршелл',
                className: 'FloydWarshallAlgorithm',
                complexity: 'O(V³)'
            }
        };

        return meta[algorithmId] || meta.dijkstra;
    }

    _createAlgorithm(algorithmId, graph, options) {
        const meta = this._getAlgorithmMeta(algorithmId);
        const AlgorithmClass = window[meta.className];
        if (typeof AlgorithmClass !== 'function') {
            throw new Error(`Модуль алгоритма не загружен: ${meta.name}`);
        }
        return new AlgorithmClass(graph, options);
    }

    _theoreticalComplexity(algorithmId, nodeCount, edgeCount) {
        if (algorithmId === 'bellman-ford') {
            return Math.max(1, nodeCount * edgeCount);
        }
        if (algorithmId === 'floyd-warshall') {
            return Math.max(1, Math.pow(nodeCount, 3));
        }
        return Math.max(1, (nodeCount + edgeCount) * Math.log2(Math.max(2, nodeCount)));
    }

    _hexToRgba(hex, alpha) {
        const clean = hex.replace('#', '');
        const num = parseInt(clean, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// Экспортируем
window.PerformanceAnalyzer = PerformanceAnalyzer;
