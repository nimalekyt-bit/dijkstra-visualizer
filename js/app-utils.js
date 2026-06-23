'use strict';

/**
 * Небольшие чистые утилиты приложения.
 * Держим их отдельно, чтобы сортировку и данные отчёта можно было тестировать без DOM.
 */
class AppUtils {
    static nodeNumber(nodeId) {
        const value = parseInt(String(nodeId || '').replace('n', ''), 10);
        return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
    }

    static formatNode(nodeId) {
        if (!nodeId) return '—';
        return String(nodeId).replace('n', '');
    }

    static formatDistance(distance) {
        return distance === Infinity || distance === 'Infinity' ? '∞' : String(distance);
    }

    static buildDistanceRows(distances, predecessors) {
        if (!distances) return [];

        const rows = [];
        distances.forEach((distance, nodeId) => {
            const predecessor = predecessors && predecessors.get ? predecessors.get(nodeId) : null;
            rows.push({ nodeId, distance, predecessor: predecessor || null });
        });

        return rows;
    }

    static sortDistanceRows(rows, sortState) {
        const key = sortState && sortState.key ? sortState.key : 'node';
        const direction = sortState && sortState.direction === 'desc' ? 'desc' : 'asc';
        const factor = direction === 'desc' ? -1 : 1;

        return [...rows].sort((a, b) => {
            let result = 0;

            if (key === 'distance') {
                const aDist = a.distance === Infinity ? Number.POSITIVE_INFINITY : Number(a.distance);
                const bDist = b.distance === Infinity ? Number.POSITIVE_INFINITY : Number(b.distance);
                result = aDist - bDist;
            } else if (key === 'predecessor') {
                const aPred = a.predecessor ? AppUtils.nodeNumber(a.predecessor) : Number.MAX_SAFE_INTEGER;
                const bPred = b.predecessor ? AppUtils.nodeNumber(b.predecessor) : Number.MAX_SAFE_INTEGER;
                result = aPred - bPred;
            } else {
                result = AppUtils.nodeNumber(a.nodeId) - AppUtils.nodeNumber(b.nodeId);
            }

            if (result === 0) {
                result = AppUtils.nodeNumber(a.nodeId) - AppUtils.nodeNumber(b.nodeId);
            }

            return result * factor;
        });
    }

    static createReportData({ graphData, isDirected, startNode, endNode, result, graphImage }) {
        const distances = result ? AppUtils.buildDistanceRows(result.distances, result.predecessors) : [];
        const path = result && Array.isArray(result.path) ? result.path : [];
        const distance = result ? result.distance : Infinity;
        const nodeLabels = new Map();

        if (graphData && Array.isArray(graphData.nodes)) {
            graphData.nodes.forEach(node => {
                nodeLabels.set(node.id, node.label || AppUtils.formatNode(node.id));
            });
        }

        const formatGraphNode = (nodeId) => nodeLabels.get(nodeId) || AppUtils.formatNode(nodeId);
        const algorithmId = result && result.algorithmId ? result.algorithmId : 'dijkstra';
        const algorithmName = result && result.algorithmName ? result.algorithmName : 'Алгоритм Дейкстры';
        const algorithmDescriptions = {
            'dijkstra': 'Алгоритм Дейкстры последовательно выбирает непосещённую вершину с минимальным известным расстоянием и релаксирует исходящие рёбра. Он корректен для графов с неотрицательными весами.',
            'bellman-ford': 'Алгоритм Беллмана-Форда выполняет V-1 проходов релаксации по всем рёбрам и умеет работать с отрицательными весами, дополнительно обнаруживая отрицательные циклы.',
            'floyd-warshall': 'Алгоритм Флойда-Уоршелла динамически строит матрицу кратчайших расстояний между всеми парами вершин и восстанавливает путь для выбранной пары.'
        };
        const edges = graphData && Array.isArray(graphData.edges)
            ? graphData.edges.map(edge => ({
                source: formatGraphNode(edge.source),
                target: formatGraphNode(edge.target),
                direction: isDirected ? '→' : '—',
                weight: edge.weight
            }))
            : [];

        return {
            projectName: 'Визуализатор алгоритмов на графах',
            algorithmName,
            algorithmId,
            generatedAt: new Date().toISOString(),
            graphType: isDirected ? 'Ориентированный' : 'Неориентированный',
            nodeCount: graphData && graphData.nodes ? graphData.nodes.length : 0,
            edgeCount: graphData && graphData.edges ? graphData.edges.length : 0,
            startNode: formatGraphNode(startNode),
            endNode: formatGraphNode(endNode),
            path: path.map(formatGraphNode),
            pathText: path.length > 0 ? path.map(formatGraphNode).join(' -> ') : 'Путь не найден',
            cost: distance === Infinity ? 'Infinity' : distance,
            executionTime: result && Number.isFinite(result.executionTime) ? result.executionTime : 0,
            operationCount: result ? result.operationCount : 0,
            stepsCount: result && result.steps ? result.steps.length : 0,
            distances: distances.map(row => ({
                node: formatGraphNode(row.nodeId),
                distance: row.distance === Infinity ? 'Infinity' : row.distance,
                predecessor: row.predecessor ? formatGraphNode(row.predecessor) : null
            })),
            edges,
            graphImage: graphImage || null,
            algorithmDescription: algorithmDescriptions[algorithmId] || algorithmDescriptions.dijkstra
        };
    }
}

window.AppUtils = AppUtils;
