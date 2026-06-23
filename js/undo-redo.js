/**
 * ============================================================================
 * undo-redo.js — Система отмены/повтора действий (Undo/Redo)
 * ============================================================================
 *
 * Реализация паттерна «Команда» (Command Pattern) для поддержки
 * отмены и повтора операций над графом.
 *
 * Каждая команда инкапсулирует действие и хранит достаточно данных
 * для полного обратного выполнения (undo).
 *
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

// ============================================================================
// МЕНЕДЖЕР ОТМЕНЫ / ПОВТОРА
// ============================================================================

/**
 * Менеджер стека отмены и повтора.
 * Управляет выполнением команд, хранит историю и позволяет
 * перемещаться по ней вперёд/назад.
 */
class UndoRedoManager {
    /**
     * @param {number} maxStackSize — максимальный размер стека (по умолчанию 50)
     */
    constructor(maxStackSize = 50) {
        /** @type {number} Максимальный размер стека */
        this._maxStackSize = maxStackSize;

        /** @type {Array} Стек отмены */
        this._undoStack = [];

        /** @type {Array} Стек повтора */
        this._redoStack = [];
    }

    /**
     * Выполнить команду и добавить её в стек отмены.
     * Стек повтора очищается, т.к. новая команда начинает новую ветку истории.
     * @param {object} command — объект команды с методами execute() и undo()
     * @returns {*} — результат выполнения команды
     */
    execute(command) {
        const result = command.execute();

        if (result === false || result === null) {
            return result;
        }

        // Добавляем в стек отмены
        this._undoStack.push(command);

        // Ограничиваем размер стека
        if (this._undoStack.length > this._maxStackSize) {
            this._undoStack.shift();
        }

        // Новое действие сбрасывает ветку повтора
        this._redoStack = [];

        return result;
    }

    /**
     * Отменить последнее действие.
     * Извлекает команду из стека отмены, вызывает undo(),
     * и перемещает в стек повтора.
     * @returns {boolean} — true, если отмена выполнена
     */
    undo() {
        if (!this.canUndo()) return false;

        const command = this._undoStack.pop();
        command.undo();
        this._redoStack.push(command);

        return true;
    }

    /**
     * Повторить ранее отменённое действие.
     * Извлекает команду из стека повтора, вызывает execute(),
     * и перемещает обратно в стек отмены.
     * @returns {boolean} — true, если повтор выполнен
     */
    redo() {
        if (!this.canRedo()) return false;

        const command = this._redoStack.pop();
        command.execute();
        this._undoStack.push(command);

        return true;
    }

    /**
     * Можно ли выполнить отмену.
     * @returns {boolean}
     */
    canUndo() {
        return this._undoStack.length > 0;
    }

    /**
     * Можно ли выполнить повтор.
     * @returns {boolean}
     */
    canRedo() {
        return this._redoStack.length > 0;
    }

    /**
     * Полная очистка обоих стеков.
     * Используется при загрузке нового графа, сбросе и т.д.
     */
    clear() {
        this._undoStack = [];
        this._redoStack = [];
    }
}

// ============================================================================
// КОМАНДА: ДОБАВЛЕНИЕ ВЕРШИНЫ
// ============================================================================

/**
 * Команда добавления вершины в граф.
 * При первом выполнении создаёт вершину и запоминает её ID.
 * При повторном выполнении (redo) использует тот же ID.
 */
class AddNodeCommand {
    /**
     * @param {GraphManager} graphManager — менеджер графа
     * @param {object} cyInstance — экземпляр Cytoscape
     * @param {number} x — координата X
     * @param {number} y — координата Y
     */
    constructor(graphManager, cyInstance, x, y) {
        this._graphManager = graphManager;
        this._cy = cyInstance;
        this._x = x;
        this._y = y;

        /** @type {string|null} ID созданной вершины (заполняется после первого execute) */
        this._nodeId = null;

        /** @type {string|null} Метка вершины */
        this._label = null;
    }

    /**
     * Выполнить: добавить вершину в граф и на холст.
     * @returns {string} — ID созданной вершины
     */
    execute() {
        // При повторном выполнении (redo) используем сохранённый ID
        const nodeId = this._graphManager.addNode(this._x, this._y, this._nodeId || undefined);
        this._nodeId = nodeId;

        // Получаем метку из GraphManager
        const nodeData = this._graphManager.getNode(nodeId);
        this._label = nodeData ? nodeData.label : nodeId.replace('n', '');

        // Добавляем элемент в Cytoscape
        this._cy.add({
            group: 'nodes',
            data: { id: nodeId, label: this._label },
            position: { x: this._x, y: this._y }
        });

        return nodeId;
    }

    /**
     * Отменить: удалить вершину из графа и с холста.
     */
    undo() {
        if (!this._nodeId) return;

        // Удаляем из Cytoscape (автоматически удалит связанные рёбра на холсте)
        const cyNode = this._cy.getElementById(this._nodeId);
        if (cyNode.length) {
            cyNode.remove();
        }

        // Удаляем из GraphManager
        this._graphManager.removeNode(this._nodeId);
    }
}

// ============================================================================
// КОМАНДА: УДАЛЕНИЕ ВЕРШИНЫ
// ============================================================================

/**
 * Команда удаления вершины из графа.
 * Перед удалением сохраняет данные вершины и все связанные рёбра,
 * чтобы при undo полностью восстановить состояние.
 */
class RemoveNodeCommand {
    /**
     * @param {GraphManager} graphManager — менеджер графа
     * @param {object} cyInstance — экземпляр Cytoscape
     * @param {string} nodeId — ID удаляемой вершины
     */
    constructor(graphManager, cyInstance, nodeId) {
        this._graphManager = graphManager;
        this._cy = cyInstance;
        this._nodeId = nodeId;

        /** @type {object|null} Сохранённые данные вершины */
        this._savedNode = null;

        /** @type {Array<object>} Сохранённые данные связанных рёбер */
        this._savedEdges = [];
    }

    /**
     * Выполнить: сохранить данные вершины и рёбер, затем удалить.
     */
    execute() {
        // Сохраняем данные вершины
        const node = this._graphManager.getNode(this._nodeId);
        if (!node) return false;
        this._savedNode = { ...node };

        // Сохраняем все рёбра, связанные с вершиной
        this._savedEdges = [];
        const allEdges = this._graphManager.getEdges();
        for (const edge of allEdges) {
            if (edge.source === this._nodeId || edge.target === this._nodeId) {
                this._savedEdges.push({ ...edge });
            }
        }

        // Удаляем из Cytoscape (вершину и связанные рёбра)
        const cyNode = this._cy.getElementById(this._nodeId);
        if (cyNode.length) {
            cyNode.remove();
        }

        // Удаляем из GraphManager (removeNode удаляет и связанные рёбра)
        this._graphManager.removeNode(this._nodeId);
        return true;
    }

    /**
     * Отменить: восстановить вершину и все связанные рёбра.
     */
    undo() {
        if (!this._savedNode) return;

        const node = this._savedNode;

        // Восстанавливаем вершину в GraphManager
        this._graphManager.addNode(node.x, node.y, node.id, node.label);

        // Восстанавливаем вершину в Cytoscape
        this._cy.add({
            group: 'nodes',
            data: { id: node.id, label: node.label },
            position: { x: node.x, y: node.y }
        });

        // Восстанавливаем все связанные рёбра
        const directed = this._graphManager.isDirected();
        for (const edge of this._savedEdges) {
            // Добавляем обратно в GraphManager
            this._graphManager.addEdge(edge.source, edge.target, edge.weight, edge.id, { silent: true });

            // Добавляем обратно в Cytoscape
            this._cy.add({
                group: 'edges',
                data: {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    weight: edge.weight,
                    directed: directed
                }
            });
        }
    }
}

// ============================================================================
// КОМАНДА: ДОБАВЛЕНИЕ РЕБРА
// ============================================================================

/**
 * Команда добавления ребра в граф.
 */
class AddEdgeCommand {
    /**
     * @param {GraphManager} graphManager — менеджер графа
     * @param {object} cyInstance — экземпляр Cytoscape
     * @param {string} source — ID начальной вершины
     * @param {string} target — ID конечной вершины
     * @param {number} weight — вес ребра
     * @param {boolean} isDirected — ориентированное ли ребро
     */
    constructor(graphManager, cyInstance, source, target, weight, isDirected) {
        this._graphManager = graphManager;
        this._cy = cyInstance;
        this._source = source;
        this._target = target;
        this._weight = weight;
        this._isDirected = isDirected;

        /** @type {string|null} ID созданного ребра (заполняется после первого execute) */
        this._edgeId = null;
    }

    /**
     * Выполнить: добавить ребро в граф и на холст.
     * @returns {string|null} — ID созданного ребра или null при ошибке
     */
    execute() {
        // При повторном выполнении (redo) используем сохранённый ID
        const edgeId = this._graphManager.addEdge(
            this._source,
            this._target,
            this._weight,
            this._edgeId || undefined,
            { silent: true }
        );

        if (!edgeId) return null;

        this._edgeId = edgeId;

        // Добавляем элемент в Cytoscape
        this._cy.add({
            group: 'edges',
            data: {
                id: edgeId,
                source: this._source,
                target: this._target,
                weight: this._weight,
                directed: this._isDirected
            }
        });

        return edgeId;
    }

    /**
     * Отменить: удалить ребро из графа и с холста.
     */
    undo() {
        if (!this._edgeId) return;

        // Удаляем из Cytoscape
        const cyEdge = this._cy.getElementById(this._edgeId);
        if (cyEdge.length) {
            cyEdge.remove();
        }

        // Удаляем из GraphManager
        this._graphManager.removeEdge(this._edgeId);
    }
}

// ============================================================================
// КОМАНДА: УДАЛЕНИЕ РЕБРА
// ============================================================================

/**
 * Команда удаления ребра из графа.
 * Перед удалением сохраняет данные ребра для восстановления.
 */
class RemoveEdgeCommand {
    /**
     * @param {GraphManager} graphManager — менеджер графа
     * @param {object} cyInstance — экземпляр Cytoscape
     * @param {string} edgeId — ID удаляемого ребра
     */
    constructor(graphManager, cyInstance, edgeId) {
        this._graphManager = graphManager;
        this._cy = cyInstance;
        this._edgeId = edgeId;

        /** @type {object|null} Сохранённые данные ребра */
        this._savedEdge = null;
    }

    /**
     * Выполнить: сохранить данные ребра, затем удалить.
     */
    execute() {
        // Находим и сохраняем данные ребра перед удалением
        const edges = this._graphManager.getEdges();
        for (const edge of edges) {
            if (edge.id === this._edgeId) {
                this._savedEdge = { ...edge };
                break;
            }
        }

        if (!this._savedEdge) return false;

        // Удаляем из Cytoscape
        const cyEdge = this._cy.getElementById(this._edgeId);
        if (cyEdge.length) {
            cyEdge.remove();
        }

        // Удаляем из GraphManager
        this._graphManager.removeEdge(this._edgeId);
        return true;
    }

    /**
     * Отменить: восстановить удалённое ребро.
     */
    undo() {
        if (!this._savedEdge) return;

        const edge = this._savedEdge;
        const directed = this._graphManager.isDirected();

        // Восстанавливаем в GraphManager
        this._graphManager.addEdge(edge.source, edge.target, edge.weight, edge.id, { silent: true });

        // Восстанавливаем в Cytoscape
        this._cy.add({
            group: 'edges',
            data: {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                weight: edge.weight,
                directed: directed
            }
        });
    }
}

// ============================================================================
// КОМАНДА: ОБНОВЛЕНИЕ ВЕСА РЕБРА
// ============================================================================

/**
 * Команда изменения веса ребра.
 * Сохраняет старый вес для отмены.
 */
class UpdateWeightCommand {
    /**
     * @param {GraphManager} graphManager — менеджер графа
     * @param {object} cyInstance — экземпляр Cytoscape
     * @param {string} edgeId — ID ребра
     * @param {number} newWeight — новый вес
     */
    constructor(graphManager, cyInstance, edgeId, newWeight) {
        this._graphManager = graphManager;
        this._cy = cyInstance;
        this._edgeId = edgeId;
        this._newWeight = newWeight;

        /** @type {number|null} Старый вес (сохраняется при execute) */
        this._oldWeight = null;
    }

    /**
     * Выполнить: сохранить старый вес и установить новый.
     */
    execute() {
        // Находим текущий вес ребра
        const edges = this._graphManager.getEdges();
        for (const edge of edges) {
            if (edge.id === this._edgeId) {
                this._oldWeight = edge.weight;
                break;
            }
        }

        if (this._oldWeight === null) return false;

        // Обновляем вес в GraphManager
        const updated = this._graphManager.updateEdgeWeight(this._edgeId, this._newWeight);
        if (!updated) return false;

        // Обновляем данные в Cytoscape
        const cyEdge = this._cy.getElementById(this._edgeId);
        if (cyEdge.length) {
            cyEdge.data('weight', this._newWeight);
        }

        return true;
    }

    /**
     * Отменить: вернуть старый вес.
     */
    undo() {
        if (this._oldWeight === null) return;

        // Восстанавливаем вес в GraphManager
        this._graphManager.updateEdgeWeight(this._edgeId, this._oldWeight);

        // Восстанавливаем данные в Cytoscape
        const cyEdge = this._cy.getElementById(this._edgeId);
        if (cyEdge.length) {
            cyEdge.data('weight', this._oldWeight);
        }
    }
}

// ============================================================================
// КОМАНДА: ПЕРЕМЕЩЕНИЕ ВЕРШИНЫ
// ============================================================================

/**
 * Команда перемещения вершины.
 * Обновляет позицию в GraphManager и в Cytoscape.
 */
class MoveNodeCommand {
    /**
     * @param {GraphManager} graphManager — менеджер графа
     * @param {string} nodeId — ID вершины
     * @param {number} oldX — старая координата X
     * @param {number} oldY — старая координата Y
     * @param {number} newX — новая координата X
     * @param {number} newY — новая координата Y
     * @param {object} [cyInstance] — экземпляр Cytoscape
     */
    constructor(graphManager, nodeId, oldX, oldY, newX, newY, cyInstance) {
        this._graphManager = graphManager;
        this._nodeId = nodeId;
        this._oldX = oldX;
        this._oldY = oldY;
        this._newX = newX;
        this._newY = newY;
        this._cy = cyInstance || null;
    }

    /**
     * Выполнить: обновить позицию вершины на новые координаты.
     */
    execute() {
        this._graphManager.updateNodePosition(this._nodeId, this._newX, this._newY);
        this._setCyPosition(this._newX, this._newY);
        return true;
    }

    /**
     * Отменить: вернуть позицию вершины к старым координатам.
     */
    undo() {
        this._graphManager.updateNodePosition(this._nodeId, this._oldX, this._oldY);
        this._setCyPosition(this._oldX, this._oldY);
    }

    /**
     * Синхронизировать позицию вершины на холсте.
     * @private
     */
    _setCyPosition(x, y) {
        if (!this._cy) return;
        const node = this._cy.getElementById(this._nodeId);
        if (node.length) {
            node.position({ x, y });
        }
    }
}

// ============================================================================
// ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ============================================================================

window.UndoRedoManager = UndoRedoManager;
window.AddNodeCommand = AddNodeCommand;
window.RemoveNodeCommand = RemoveNodeCommand;
window.AddEdgeCommand = AddEdgeCommand;
window.RemoveEdgeCommand = RemoveEdgeCommand;
window.UpdateWeightCommand = UpdateWeightCommand;
window.MoveNodeCommand = MoveNodeCommand;
