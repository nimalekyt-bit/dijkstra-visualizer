# Dijkstra Visualizer

Interactive educational web app for building graphs, running shortest-path algorithms and visualizing every step of the calculation.

The project was built as coursework, but it is structured as a portfolio project: algorithm implementations are separated from the UI, examples are stored as data, and the core behavior is covered by tests.

## Features

- Visual graph editor with directed and undirected graphs.
- Step-by-step visualization for Dijkstra, Bellman-Ford and Floyd-Warshall.
- Support for negative edge weights where the selected algorithm allows them.
- Distance tables, path reconstruction and algorithm state history.
- Performance benchmark view for larger generated graphs.
- LocalStorage autosave and JSON import/export.
- PNG and PDF report export.
- Light/dark UI with local vendor assets for offline use.
- Unit tests for graph operations and shortest-path algorithms.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Cytoscape.js for graph rendering
- Chart.js for benchmarks
- jsPDF for reports
- Bootstrap and Font Awesome for UI elements

## Run

The app can be opened directly:

```bash
start index.html
```

For the best local experience, serve the folder with any static server:

```bash
npx serve .
```

## Tests

```bash
npm test
npm run check
```

## Project Structure

```text
css/       styles and themes
js/        graph model, algorithms, visualizer and UI logic
data/      example graphs
vendor/    local third-party browser libraries
tests/     unit tests for the algorithmic core
assets/    fonts and screenshots
desktop/   optional pywebview desktop wrapper
```

## Algorithms

The graph data structure and shortest-path logic are implemented in plain JavaScript. External libraries are used for visualization and UI, not for the algorithmic core.
