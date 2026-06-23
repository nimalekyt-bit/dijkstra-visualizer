<div align="center">
  <img src="https://placehold.co/100x100/1e1e1e/ffffff?text=DV" alt="Dijkstra Visualizer Logo" width="100" height="100" style="border-radius: 20%; margin-bottom: 20px;" />

  # 🗺️ Pathfinding Visualizer

  **Interactive Educational Tool for Graph Algorithms**

  [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)]()
  [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)]()
  [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)]()
  
  *Visualize Dijkstra, Bellman-Ford, and Floyd-Warshall step-by-step.*

  [English](#english) • [Русский](#русский)
</div>

---

<a id="english"></a>
## 🇬🇧 English

Graph algorithms can be abstract and hard to grasp. **Pathfinding Visualizer** bridges the gap by letting you draw graphs interactively and watch shortest-path algorithms execute in real-time, step-by-step.

Built as a portfolio project, it boasts a clean architecture where the core algorithmic logic (pure JavaScript) is strictly decoupled from the UI layer.

### ✨ Features

- 🏗️ **Interactive Canvas**: Click and drag to create nodes, directed/undirected edges, and assign weights (including negative ones!).
- 🔍 **Step-by-Step Execution**: Pause, rewind, or fast-forward through the algorithm's decision-making process.
- 📊 **Real-time Analytics**: Watch distance tables update live, reconstruct shortest paths, and view algorithm state history.
- 🚀 **Performance Benchmarks**: Generate large random graphs to compare the time complexity of different algorithms.
- 💾 **Export & Save**: Save your graphs to JSON, or generate beautiful PDF/PNG reports of your findings.
- 🌙 **Dark Mode Ready**: A polished UI with local vendor assets, meaning it works 100% offline.

<br>

<div align="center">
  <!-- TODO: Replace with actual GIF or screenshot -->
  <img src="https://placehold.co/800x400/1e1e1e/ffffff?text=Drop+your+awesome+screenshot+here" alt="Visualizer Demo" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" />
</div>

<br>

### 🛠 Architecture & Stack

Unlike many visualizers that tangle UI code with logic, this project isolates the math:
- **Core Algorithms**: Vanilla ES6+ JavaScript (Fully Unit-Tested).
- **Rendering Engine**: `Cytoscape.js` for high-performance canvas drawing.
- **Data Visualization**: `Chart.js` for complexity graphs.

### 🚀 Try It Now

No build steps required. Just clone and open!
```bash
git clone https://github.com/nimalekyt-bit/dijkstra-visualizer.git
cd dijkstra-visualizer
# Open index.html in your favorite browser!
start index.html
```

<br><br>

---

<a id="русский"></a>
## 🇷🇺 Русский

**Pathfinding Visualizer** — это интерактивное веб-приложение, которое позволяет рисовать графы и наблюдать за работой алгоритмов поиска кратчайшего пути (Дейкстра, Беллман-Форд, Флойд-Уоршелл) в реальном времени.

Проект создан с упором на чистую архитектуру: математическое ядро полностью независимо от интерфейса и покрыто Unit-тестами.

### ✨ Главные фичи

- 🏗️ **Визуальный редактор**: Создавайте узлы и ребра в пару кликов. Поддерживаются ориентированные графы и отрицательные веса.
- 🔍 **Пошаговая визуализация**: Наблюдайте, как алгоритм проверяет соседние вершины и обновляет таблицу расстояний.
- 📊 **Аналитика и отчеты**: Сравнивайте скорость алгоритмов на графиках и экспортируйте результаты в PDF или PNG.
- 💾 **Работа оффлайн**: Проект не требует интернета (все библиотеки скачаны локально) и умеет сохранять ваши графы в LocalStorage.

### 🚀 Запуск
Просто скачайте репозиторий и откройте `index.html`:
```bash
git clone https://github.com/nimalekyt-bit/dijkstra-visualizer.git
cd dijkstra-visualizer
start index.html
```
