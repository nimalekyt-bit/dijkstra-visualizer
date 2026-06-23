# 🗺️ Dijkstra Visualizer

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)]()
[![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26?logo=html5&logoColor=white)]()
[![CSS3](https://img.shields.io/badge/CSS3-Styling-1572B6?logo=css3&logoColor=white)]()

*(Scroll down for Russian version / Прокрутите вниз для русской версии)*

## 🇬🇧 English

**Dijkstra Visualizer** is an interactive educational web application designed for building graphs, running shortest-path algorithms, and visualizing every step of the calculation in real time.

Built initially as coursework, it is structured cleanly as a portfolio project: algorithm implementations are strictly decoupled from the UI, examples are stored as JSON data, and the core algorithmic logic is fully covered by unit tests.

### ✨ Key Features
- **Visual Graph Editor:** Create and edit directed and undirected graphs interactively.
- **Step-by-Step Visualization:** Watch algorithms (Dijkstra, Bellman-Ford, Floyd-Warshall) execute node-by-node and edge-by-edge.
- **Negative Weights:** Full support for negative edge weights (where the selected algorithm allows them).
- **History & Reports:** Distance tables, path reconstruction, state history, and PDF/PNG report generation.
- **Offline First:** LocalStorage autosave, light/dark themes, and all vendor assets included locally.

### 🛠 Tech Stack
- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Visualization:** Cytoscape.js, Chart.js
- **UI:** Bootstrap, Font Awesome
- **Testing:** Unit tests for graph operations and shortest-path core

### 🚀 Quick Start
Simply open `index.html` in your browser:
```bash
start index.html
```
Or use a local server for the best experience:
```bash
npx serve .
```

---

## 🇷🇺 Русский

**Dijkstra Visualizer** — это интерактивное образовательное веб-приложение для построения графов, запуска алгоритмов поиска кратчайшего пути и визуализации каждого шага вычислений.

Проект отлично демонстрирует навыки работы со структурами данных: алгоритмическое ядро полностью отделено от интерфейса, логика покрыта тестами, а данные графов экспортируются в JSON.

### ✨ Главные возможности
- **Визуальный редактор графов:** Создание ориентированных и неориентированных графов мышкой.
- **Пошаговая визуализация:** Наблюдение за работой алгоритмов (Дейкстра, Беллман-Форд, Флойд-Уоршелл) шаг за шагом.
- **Отрицательные веса:** Поддержка отрицательных весов ребер (для алгоритмов, которые их поддерживают).
- **Аналитика:** Таблицы расстояний, реконструкция пути, графики производительности и экспорт отчетов в PDF/PNG.
- **Локальная работа:** Автосохранение в LocalStorage, темная/светлая тема, работа без интернета (все библиотеки локальны).

### 🛠 Стек технологий
- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Визуализация:** Cytoscape.js, Chart.js
- **UI/UX:** Bootstrap, Font Awesome
- **Тестирование:** Unit-тесты для алгоритмов поиска кратчайшего пути

### 🚀 Быстрый старт
Просто откройте файл `index.html` в браузере:
```bash
start index.html
```
Или используйте любой локальный сервер:
```bash
npx serve .
```
