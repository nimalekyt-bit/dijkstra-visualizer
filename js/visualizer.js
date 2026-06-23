/**
 * ============================================================================
 * visualizer.js — Модуль визуализации алгоритма Дейкстры
 * ============================================================================
 * 
 * Роль: управление пошаговой анимацией алгоритма на графе Cytoscape.
 * Подсветка вершин и рёбер, управление воспроизведением,
 * обновление таблицы расстояний и информационных панелей.
 * 
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

class AlgorithmVisualizer {
    /**
     * @param {object} cyInstance — экземпляр Cytoscape.js для визуализации
     */
    constructor(cyInstance) {
        /** @type {object} Cytoscape-инстанс */
        this.cy = cyInstance;

        /** @type {Array<object>} Массив шагов алгоритма */
        this.steps = [];

        /** @type {number} Индекс текущего шага */
        this.currentStepIndex = -1;

        /** @type {boolean} Флаг воспроизведения */
        this._isPlaying = false;

        /** @type {number|null} ID таймера анимации */
        this._playTimer = null;

        /** @type {number} Скорость анимации (мс между шагами) */
        this._speed = 1000;

        /** @type {Function|null} Callback при смене шага */
        this._onStepChangeCallback = null;

        /** @type {string[]} Кратчайший путь (для подсветки) */
        this._path = [];

        /** @type {string} ID начальной вершины */
        this._startNode = null;

        /** @type {string} ID конечной вершины */
        this._endNode = null;
    }

    // ========================================================================
    // НАСТРОЙКА
    // ========================================================================

    /**
     * Установить шаги алгоритма для визуализации.
     * @param {Array<object>} steps — шаги из DijkstraAlgorithm.run()
     * @param {string[]} path — кратчайший путь
     * @param {string} startNode — начальная вершина
     * @param {string} endNode — конечная вершина
     */
    setData(steps, path, startNode, endNode) {
        this.steps = steps;
        this._path = path;
        this._startNode = startNode;
        this._endNode = endNode;
        this.currentStepIndex = -1;
        this._isPlaying = false;
        this._clearTimers();
    }

    /**
     * Установить скорость анимации.
     * @param {number} speed — задержка между шагами (мс)
     */
    setSpeed(speed) {
        this._speed = speed;
    }

    /**
     * Зарегистрировать callback, вызываемый при каждой смене шага.
     * @param {Function} callback — функция(stepIndex, step)
     */
    onStepChange(callback) {
        this._onStepChangeCallback = callback;
    }

    // ========================================================================
    // УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ
    // ========================================================================

    /**
     * Запустить автоматическое воспроизведение.
     */
    play() {
        if (this.steps.length === 0) return;

        this._isPlaying = true;
        this._autoStep();
    }

    /**
     * Поставить на паузу.
     */
    pause() {
        this._isPlaying = false;
        this._clearTimers();
    }

    /**
     * Продолжить воспроизведение.
     */
    resume() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this._isPlaying = true;
            this._autoStep();
        }
    }

    /**
     * Перейти к следующему шагу.
     */
    stepForward() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this._applyStep(this.currentStepIndex);
        }
    }

    /**
     * Вернуться к предыдущему шагу.
     */
    stepBack() {
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this._applyStep(this.currentStepIndex);
        } else if (this.currentStepIndex === 0) {
            this.currentStepIndex = -1;
            this._resetStyles();
            this._notifyStepChange();
        }
    }

    /**
     * Сбросить визуализацию к начальному состоянию.
     */
    reset() {
        this._isPlaying = false;
        this._clearTimers();
        this.currentStepIndex = -1;
        this._resetStyles();
        this._notifyStepChange();
    }

    /**
     * Перейти к конкретному шагу.
     * @param {number} index — индекс шага
     */
    goToStep(index) {
        if (index >= 0 && index < this.steps.length) {
            this.currentStepIndex = index;
            this._applyStep(index);
        }
    }

    /**
     * Получить индекс текущего шага.
     * @returns {number}
     */
    getCurrentStep() {
        return this.currentStepIndex;
    }

    /**
     * Получить общее количество шагов.
     * @returns {number}
     */
    getTotalSteps() {
        return this.steps.length;
    }

    /**
     * Проверить, идёт ли воспроизведение.
     * @returns {boolean}
     */
    isPlaying() {
        return this._isPlaying;
    }

    // ========================================================================
    // ВИЗУАЛИЗАЦИЯ ПУТИ
    // ========================================================================

    /**
     * Подсветить кратчайший путь на графе.
     * @param {string[]} path — массив ID вершин
     */
    highlightPath(path) {
        if (!path || path.length === 0) return;

        // Подсвечиваем вершины пути
        path.forEach(nodeId => {
            const node = this.cy.getElementById(nodeId);
            if (node.length) {
                node.addClass('path-node');
            }
        });

        // Подсвечиваем рёбра пути
        for (let i = 0; i < path.length - 1; i++) {
            const source = path[i];
            const target = path[i + 1];

            // Ищем ребро в обоих направлениях
            let edge = this.cy.edges(`[source="${source}"][target="${target}"]`);
            if (edge.length === 0) {
                edge = this.cy.edges(`[source="${target}"][target="${source}"]`);
            }
            if (edge.length > 0) {
                edge.addClass('path-edge');
            }
        }
    }

    // ========================================================================
    // ВНУТРЕННИЕ МЕТОДЫ
    // ========================================================================

    /**
     * Автоматический переход к следующему шагу с задержкой.
     * @private
     */
    _autoStep() {
        if (!this._isPlaying) return;

        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this._applyStep(this.currentStepIndex);

            this._playTimer = setTimeout(() => {
                this._autoStep();
            }, this._speed);
        } else {
            // Достигнут конец — подсвечиваем путь
            this._isPlaying = false;
            this.highlightPath(this._path);
            this._notifyStepChange();
        }
    }

    /**
     * Применить визуальные стили для конкретного шага.
     * Каждый шаг содержит snapshot состояния алгоритма.
     * 
     * @private
     * @param {number} index — индекс шага
     */
    _applyStep(index) {
        const step = this.steps[index];
        if (!step) return;

        // Сначала сбрасываем все стили
        this._resetStyles();

        // Подсвечиваем посещённые вершины (зелёные)
        step.visited.forEach(nodeId => {
            const node = this.cy.getElementById(nodeId);
            if (node.length) {
                node.addClass('visited-node');
            }
        });

        // Подсвечиваем текущую вершину (жёлтая)
        if (step.currentNode) {
            const currentNode = this.cy.getElementById(step.currentNode);
            if (currentNode.length) {
                currentNode.removeClass('visited-node');
                currentNode.addClass(step.type === 'iteration-k' || step.type === 'examine-pair'
                    ? 'matrix-pivot-node'
                    : 'current-node');
            }
        }

        // Подсвечиваем исследуемое ребро
        if (step.relaxedEdge) {
            const edge = this.cy.getElementById(step.relaxedEdge);
            if (edge.length) {
                if (step.type === 'relax') {
                    edge.addClass('relaxed-edge');
                } else if (step.type === 'examine' || step.type === 'examine-pair') {
                    edge.addClass('examining-edge');
                } else if (step.type === 'skip') {
                    edge.addClass('skipped-edge');
                }
            }
        }

        // Подсвечиваем обновляемую вершину
        if (step.updatedNode && !step.visited.has(step.updatedNode)) {
            const updNode = this.cy.getElementById(step.updatedNode);
            if (updNode.length && step.updatedNode !== step.currentNode) {
                updNode.addClass(step.type === 'negative-cycle' ? 'negative-cycle-node' : 'queued-node');
            }
        }

        if (step.type === 'negative-cycle') {
            if (step.currentNode) {
                const node = this.cy.getElementById(step.currentNode);
                if (node.length) node.addClass('negative-cycle-node');
            }
            if (step.relaxedEdge) {
                const edge = this.cy.getElementById(step.relaxedEdge);
                if (edge.length) edge.addClass('path-edge');
            }
        }

        // Обновляем метки расстояний на вершинах
        step.distances.forEach((dist, nodeId) => {
            const node = this.cy.getElementById(nodeId);
            if (node.length) {
                const label = dist === Infinity ? '∞' : dist.toString();
                node.data('distLabel', label);
            }
        });

        // Если последний шаг (complete) — подсвечиваем путь
        if (step.type === 'complete' || step.type === 'no_path') {
            this.highlightPath(this._path);
        }

        // Уведомляем подписчиков
        this._notifyStepChange();
    }

    /**
     * Сбросить все визуальные стили.
     * @private
     */
    _resetStyles() {
        if (!this.cy) return;

        this.cy.elements().removeClass(
            'visited-node current-node queued-node path-node ' +
            'path-edge relaxed-edge examining-edge skipped-edge ' +
            'negative-cycle-node matrix-pivot-node'
        );

        // Сбрасываем метки расстояний
        this.cy.nodes().forEach(node => {
            node.data('distLabel', '');
        });
    }

    /**
     * Уведомить подписчика о смене шага.
     * @private
     */
    _notifyStepChange() {
        if (this._onStepChangeCallback) {
            const step = this.currentStepIndex >= 0 ? this.steps[this.currentStepIndex] : null;
            this._onStepChangeCallback(this.currentStepIndex, step);
        }
    }

    /**
     * Очистить таймеры.
     * @private
     */
    _clearTimers() {
        if (this._playTimer) {
            clearTimeout(this._playTimer);
            this._playTimer = null;
        }
    }
}

// Экспортируем
window.AlgorithmVisualizer = AlgorithmVisualizer;
