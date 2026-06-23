const fs = require('fs');
const path = require('path');

// Эмуляция браузерного окружения для независимого запуска алгоритмов в Node.js
global.window = globalThis;

function loadScript(relativePath) {
    const absolutePath = path.join(__dirname, relativePath);
    eval(fs.readFileSync(absolutePath, 'utf8'));
}

// Загружаем только чистое математическое ядро (без UI и DOM)
loadScript('js/graph.js');
loadScript('js/dijkstra.js');

const { GraphManager, DijkstraAlgorithm } = globalThis;

function runDemo() {
    console.log("==========================================");
    console.log("  ДЕМОНСТРАЦИЯ РАБОТЫ АЛГОРИТМА ДЕЙКСТРЫ  ");
    console.log("  (Консольный режим, без графики и UI)    ");
    console.log("==========================================\n");
    
    // 1. Создаем пустой граф
    const graph = new GraphManager();
    graph.setDirected(false);
    
    console.log("1. Инициализация графа...");
    // 2. Добавляем вершины (ID 'A', 'B', 'C', 'D')
    graph.addNode(0, 0, "A");
    graph.addNode(10, 0, "B");
    graph.addNode(0, 10, "C");
    graph.addNode(10, 10, "D");
    
    console.log("2. Добавление рёбер и весов...");
    graph.addEdge("A", "B", 4, "e1"); // A - B, вес 4
    graph.addEdge("A", "C", 2, "e2"); // A - C, вес 2
    graph.addEdge("C", "B", 1, "e3"); // C - B, вес 1
    graph.addEdge("B", "D", 3, "e4"); // B - D, вес 3
    graph.addEdge("C", "D", 5, "e5"); // C - D, вес 5

    console.log("\nГраф успешно построен в памяти.");
    console.log("Ищем оптимальный маршрут от 'A' до 'D'...\n");
    
    // 3. Запуск алгоритма в режиме "без визуализации" (максимальная скорость)
    const dijkstra = new DijkstraAlgorithm(graph, { captureSteps: false });
    const result = dijkstra.run("A", "D");
    
    console.log("---------------- РЕЗУЛЬТАТ ---------------");
    console.log(`Кратчайший путь:        ${result.path.join(" -> ")}`);
    console.log(`Общая стоимость (вес):  ${result.distance}`);
    console.log(`Время вычисления:       ${result.executionTime.toFixed(4)} мс`);
    console.log(`Элементарных операций:  ${result.operationCount}`);
    console.log("------------------------------------------");
    
    console.log("\nПолная таблица минимальных расстояний от 'A':");
    for (const [node, dist] of result.distances.entries()) {
        const pathIsTarget = node === 'D' ? ' <-- ЦЕЛЬ' : '';
        console.log(`  До узла '${node}': ${dist}${pathIsTarget}`);
    }
}

runDemo();
