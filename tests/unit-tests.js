'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

global.window = globalThis;
global.localStorage = (() => {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
})();

function loadScript(relativePath) {
    const absolutePath = path.join(__dirname, '..', relativePath);
    // The project uses browser globals; eval keeps the original files unchanged.
    eval(fs.readFileSync(absolutePath, 'utf8'));
}

loadScript('js/graph.js');
loadScript('js/dijkstra.js');
loadScript('js/bellman-ford.js');
loadScript('js/floyd-warshall.js');
loadScript('js/performance.js');
loadScript('js/app-utils.js');
loadScript('js/storage.js');
loadScript('js/undo-redo.js');

const {
    GraphManager,
    DijkstraAlgorithm,
    BellmanFordAlgorithm,
    FloydWarshallAlgorithm,
    PerformanceAnalyzer,
    AppUtils,
    StorageManager,
    UndoRedoManager
} = globalThis;

function createSampleGraph(directed = false) {
    const graph = new GraphManager();
    graph.setDirected(directed);
    ['n0', 'n1', 'n2', 'n3'].forEach((id, index) => graph.addNode(index * 10, 0, id));
    graph.addEdge('n0', 'n1', 4, 'e0');
    graph.addEdge('n0', 'n2', 1, 'e1');
    graph.addEdge('n2', 'n1', 2, 'e2');
    graph.addEdge('n1', 'n3', 1, 'e3');
    graph.addEdge('n2', 'n3', 5, 'e4');
    return graph;
}

function testUndirectedShortestPath() {
    const graph = createSampleGraph(false);
    const result = new DijkstraAlgorithm(graph).run('n0', 'n3');

    assert.deepStrictEqual(result.path, ['n0', 'n2', 'n1', 'n3']);
    assert.strictEqual(result.distance, 4);
    assert.ok(result.steps.length > 0);
}

function testDirectedNoPath() {
    const graph = new GraphManager();
    graph.setDirected(true);
    ['n0', 'n1', 'n2'].forEach((id, index) => graph.addNode(index, 0, id));
    graph.addEdge('n0', 'n1', 1, 'e0');
    graph.addEdge('n1', 'n2', 1, 'e1');

    const result = new DijkstraAlgorithm(graph).run('n2', 'n0');

    assert.deepStrictEqual(result.path, []);
    assert.strictEqual(result.distance, Infinity);
    assert.strictEqual(result.steps.at(-1).type, 'no_path');
}

function testFastModeDoesNotStoreSteps() {
    const graph = createSampleGraph(false);
    const result = new DijkstraAlgorithm(graph, { captureSteps: false }).run('n0', 'n3');

    assert.deepStrictEqual(result.path, ['n0', 'n2', 'n1', 'n3']);
    assert.strictEqual(result.distance, 4);
    assert.strictEqual(result.steps.length, 0);
    assert.strictEqual(result.visualizationLimited, true);
}

function testInvalidStartEnd() {
    const graph = createSampleGraph(false);

    assert.throws(() => new DijkstraAlgorithm(graph).run('bad', 'n1'), /Стартовая вершина bad не существует/);
    assert.throws(() => new DijkstraAlgorithm(graph).run('n0', 'bad'), /Конечная вершина bad не существует/);
}

function testGraphValidation() {
    const validData = {
        directed: false,
        nodes: [
            { id: 'n0', label: '0', x: 0, y: 0 },
            { id: 'n1', label: '1', x: 10, y: 0 }
        ],
        edges: [
            { id: 'e0', source: 'n0', target: 'n1', weight: 0 }
        ]
    };

    assert.strictEqual(GraphManager.validateGraphData(validData), true);

    assert.throws(() => GraphManager.validateGraphData({
        directed: false,
        nodes: [{ id: 'n0' }, { id: 'n0' }],
        edges: []
    }), /дублирующийся id вершины/);

    assert.throws(() => GraphManager.validateGraphData({
        directed: false,
        nodes: [{ id: 'n0' }],
        edges: [{ id: 'e0', source: 'n0', target: 'n404', weight: 1 }]
    }), /несуществующую вершину/);

    assert.strictEqual(GraphManager.validateGraphData({
        directed: false,
        nodes: [{ id: 'n0' }, { id: 'n1' }],
        edges: [{ id: 'e0', source: 'n0', target: 'n1', weight: -1 }]
    }), true);
}

function testNegativeWeightsAreStoredButRejectedByDijkstra() {
    const graph = new GraphManager();
    graph.setDirected(true);
    graph.addNode(0, 0, 'n0');
    graph.addNode(10, 0, 'n1');

    assert.strictEqual(graph.addEdge('n0', 'n1', -3, 'e0'), 'e0');
    assert.strictEqual(graph.hasNegativeWeights(), true);
    assert.throws(
        () => new DijkstraAlgorithm(graph).run('n0', 'n1'),
        /не поддерживает отрицательные веса/
    );
}

function testFromJSONRejectsInvalidGraph() {
    const graph = new GraphManager();
    assert.throws(() => graph.fromJSON({
        nodes: [{ id: 'n0' }],
        edges: [{ id: 'e0', source: 'n0', target: 'n1', weight: 1 }]
    }), /несуществующую вершину/);
}

async function testBenchmarkFastMode() {
    const analyzer = new PerformanceAnalyzer();
    const results = await analyzer.runBenchmark([100, 500, 1000]);

    assert.strictEqual(results.length, 3);
    assert.deepStrictEqual(results.map(result => result.nodeCount), [100, 500, 1000]);
    results.forEach(result => {
        assert.strictEqual(result.algorithm, 'dijkstra');
        assert.ok(result.edgeCount > 0);
        assert.ok(Number.isFinite(result.time));
        assert.ok(result.operations > 0);
    });
}

function testAutosaveAndSettings() {
    localStorage.clear();
    const storage = new StorageManager();
    const graph = createSampleGraph(false);

    assert.strictEqual(storage.saveAutosave({
        graph: graph.toJSON(),
        settings: { darkTheme: true, speed: 500 }
    }), true);

    const restored = storage.loadAutosave();
    assert.strictEqual(restored.graph.nodes.length, 4);
    assert.strictEqual(restored.settings.darkTheme, true);
    assert.strictEqual(restored.settings.speed, 500);
    assert.ok(restored.savedAt);

    storage.saveSettings({ darkTheme: true });
    storage.saveSettings({ speed: 900 });
    assert.deepStrictEqual(storage.loadSettings(), { darkTheme: true, speed: 900 });

    storage.clearAutosave();
    assert.strictEqual(storage.loadAutosave(), null);
}

function testDistanceSorting() {
    const rows = [
        { nodeId: 'n2', distance: 5, predecessor: 'n1' },
        { nodeId: 'n0', distance: 0, predecessor: null },
        { nodeId: 'n1', distance: 2, predecessor: 'n0' },
        { nodeId: 'n3', distance: Infinity, predecessor: null }
    ];

    assert.deepStrictEqual(
        AppUtils.sortDistanceRows(rows, { key: 'node', direction: 'asc' }).map(row => row.nodeId),
        ['n0', 'n1', 'n2', 'n3']
    );

    assert.deepStrictEqual(
        AppUtils.sortDistanceRows(rows, { key: 'distance', direction: 'asc' }).map(row => row.nodeId),
        ['n0', 'n1', 'n2', 'n3']
    );

    assert.deepStrictEqual(
        AppUtils.sortDistanceRows(rows, { key: 'predecessor', direction: 'asc' }).map(row => row.nodeId),
        ['n1', 'n2', 'n0', 'n3']
    );
}

function testReportData() {
    const graph = createSampleGraph(false);
    const result = new DijkstraAlgorithm(graph, { captureSteps: false }).run('n0', 'n3');
    const report = AppUtils.createReportData({
        graphData: graph.toJSON(),
        isDirected: graph.isDirected(),
        startNode: 'n0',
        endNode: 'n3',
        result,
        graphImage: null
    });

    assert.strictEqual(report.projectName, 'Визуализатор алгоритмов на графах');
    assert.strictEqual(report.algorithmName, 'Алгоритм Дейкстры');
    assert.strictEqual(report.graphType, 'Неориентированный');
    assert.strictEqual(report.nodeCount, 4);
    assert.strictEqual(report.edgeCount, 5);
    assert.strictEqual(report.startNode, '0');
    assert.strictEqual(report.endNode, '3');
    assert.strictEqual(report.cost, 4);
    assert.strictEqual(report.pathText, '0 -> 2 -> 1 -> 3');
    assert.strictEqual(report.distances.length, 4);
    assert.strictEqual(report.edges.length, 5);
    assert.deepStrictEqual(report.edges[0], {
        source: '0',
        target: '1',
        direction: '—',
        weight: 4
    });
}

function testBellmanFordShortestPathWithNegativeWeight() {
    const graph = new GraphManager();
    graph.setDirected(true);
    ['n0', 'n1', 'n2', 'n3'].forEach((id, index) => graph.addNode(index, 0, id));
    graph.addEdge('n0', 'n1', 1, 'e0');
    graph.addEdge('n1', 'n2', -2, 'e1');
    graph.addEdge('n0', 'n2', 4, 'e2');
    graph.addEdge('n2', 'n3', 2, 'e3');

    const result = new BellmanFordAlgorithm(graph).run('n0', 'n3');

    assert.deepStrictEqual(result.path, ['n0', 'n1', 'n2', 'n3']);
    assert.strictEqual(result.distance, 1);
    assert.ok(result.steps.some(step => step.type === 'relax'));
}

function testBellmanFordNegativeCycle() {
    const graph = new GraphManager();
    graph.setDirected(true);
    ['n0', 'n1', 'n2'].forEach((id, index) => graph.addNode(index, 0, id));
    graph.addEdge('n0', 'n1', 1, 'e0');
    graph.addEdge('n1', 'n2', -2, 'e1');
    graph.addEdge('n2', 'n0', -2, 'e2');

    assert.throws(
        () => new BellmanFordAlgorithm(graph).run('n0', 'n2'),
        /отрицательный цикл/
    );
}

function testFloydWarshallAllPairsAndPath() {
    const graph = new GraphManager();
    graph.setDirected(true);
    ['n0', 'n1', 'n2', 'n3'].forEach((id, index) => graph.addNode(index, 0, id));
    graph.addEdge('n0', 'n1', 1, 'e0');
    graph.addEdge('n1', 'n2', -2, 'e1');
    graph.addEdge('n0', 'n2', 4, 'e2');
    graph.addEdge('n2', 'n3', 2, 'e3');

    const result = new FloydWarshallAlgorithm(graph).run('n0', 'n3');

    assert.deepStrictEqual(result.path, ['n0', 'n1', 'n2', 'n3']);
    assert.strictEqual(result.distance, 1);
    assert.strictEqual(result.allPairsDistances.get('n0').get('n3'), 1);
    assert.strictEqual(result.distMatrix.get('n0').get('n2'), -1);
    assert.strictEqual(result.nextMatrix.get('n0').get('n3'), 'n1');
}

function testFloydWarshallNegativeCycle() {
    const graph = new GraphManager();
    graph.setDirected(true);
    ['n0', 'n1', 'n2'].forEach((id, index) => graph.addNode(index, 0, id));
    graph.addEdge('n0', 'n1', 1, 'e0');
    graph.addEdge('n1', 'n2', -2, 'e1');
    graph.addEdge('n2', 'n0', -2, 'e2');

    assert.throws(
        () => new FloydWarshallAlgorithm(graph).run('n0', 'n2'),
        /отрицательный цикл/
    );
}

function testUndoRedoManager() {
    const manager = new UndoRedoManager(2);
    let value = 0;
    const command = () => ({
        execute() {
            value++;
            return true;
        },
        undo() {
            value--;
        }
    });

    manager.execute(command());
    assert.strictEqual(value, 1);
    assert.strictEqual(manager.canUndo(), true);
    assert.strictEqual(manager.undo(), true);
    assert.strictEqual(value, 0);
    assert.strictEqual(manager.canRedo(), true);
    assert.strictEqual(manager.redo(), true);
    assert.strictEqual(value, 1);

    manager.execute(command());
    manager.execute(command());
    assert.strictEqual(value, 3);
    assert.strictEqual(manager.undo(), true);
    assert.strictEqual(manager.undo(), true);
    assert.strictEqual(manager.undo(), false);
    assert.strictEqual(value, 1);

    manager.execute({
        execute() {
            return null;
        },
        undo() {
            value = -100;
        }
    });
    assert.strictEqual(value, 1);
    assert.strictEqual(manager.canRedo(), true);
    assert.strictEqual(manager.redo(), true);
    assert.strictEqual(value, 2);
}

async function run() {
    testUndirectedShortestPath();
    testDirectedNoPath();
    testFastModeDoesNotStoreSteps();
    testInvalidStartEnd();
    testGraphValidation();
    testNegativeWeightsAreStoredButRejectedByDijkstra();
    testFromJSONRejectsInvalidGraph();
    testAutosaveAndSettings();
    testDistanceSorting();
    testReportData();
    testBellmanFordShortestPathWithNegativeWeight();
    testBellmanFordNegativeCycle();
    testFloydWarshallAllPairsAndPath();
    testFloydWarshallNegativeCycle();
    testUndoRedoManager();
    await testBenchmarkFastMode();

    console.log('All unit tests passed');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
