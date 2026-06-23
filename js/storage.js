/**
 * ============================================================================
 * storage.js — Модуль сохранения и загрузки данных
 * ============================================================================
 * 
 * Роль: сохранение/загрузка графов в LocalStorage и файлы,
 * экспорт результатов в JSON/TXT, экспорт изображений PNG,
 * импорт графов из JSON-файлов, загрузка примеров.
 * 
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

class StorageManager {
    constructor() {
        /** @type {string} — ключ для LocalStorage */
        this.STORAGE_KEY = 'dijkstra_saved_graphs';

        /** @type {string} — ключ для настроек */
        this.SETTINGS_KEY = 'dijkstra_settings';

        /** @type {string} — ключ автосохранения последнего состояния */
        this.AUTOSAVE_KEY = 'dijkstra_autosave_state';

        /** @type {string} — ключ истории действий */
        this.HISTORY_KEY = 'dijkstra_action_history';
    }

    // ========================================================================
    // LOCALSTORAGE — СОХРАНЕНИЕ ГРАФОВ
    // ========================================================================

    /**
     * Сохранить граф в LocalStorage.
     * @param {string} name — имя графа
     * @param {object} graphData — данные графа (из graphManager.toJSON())
     */
    saveGraph(name, graphData) {
        const graphs = this._getAllGraphs();

        graphs[name] = {
            name,
            data: graphData,
            date: new Date().toISOString(),
            nodeCount: graphData.nodes ? graphData.nodes.length : 0,
            edgeCount: graphData.edges ? graphData.edges.length : 0
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(graphs));
            return true;
        } catch (e) {
            console.error('Ошибка сохранения в LocalStorage:', e);
            return false;
        }
    }

    /**
     * Загрузить граф из LocalStorage.
     * @param {string} name — имя графа
     * @returns {object|null} — данные графа или null
     */
    loadGraph(name) {
        const graphs = this._getAllGraphs();
        return graphs[name] ? graphs[name].data : null;
    }

    /**
     * Получить список сохранённых графов.
     * @returns {Array<{name, date, nodeCount, edgeCount}>}
     */
    getSavedGraphs() {
        const graphs = this._getAllGraphs();
        return Object.values(graphs).map(g => ({
            name: g.name,
            date: g.date,
            nodeCount: g.nodeCount,
            edgeCount: g.edgeCount
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Удалить граф из LocalStorage.
     * @param {string} name — имя графа
     */
    deleteGraph(name) {
        const graphs = this._getAllGraphs();
        delete graphs[name];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(graphs));
    }

    /**
     * Получить все графы из LocalStorage.
     * @private
     * @returns {object}
     */
    _getAllGraphs() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Ошибка чтения LocalStorage:', e);
            return {};
        }
    }

    // ========================================================================
    // ЭКСПОРТ ФАЙЛОВ
    // ========================================================================

    /**
     * Экспортировать граф в JSON-файл.
     * @param {object} graphData — данные графа
     * @param {string} [filename] — имя файла
     */
    exportJSON(graphData, filename) {
        const json = JSON.stringify(graphData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        this._downloadBlob(blob, filename || 'graph.json');
    }

    /**
     * Экспортировать результаты в TXT.
     * @param {object} results — результаты алгоритма
     */
    exportResults(results) {
        let text = '═══════════════════════════════════════════════════\n';
        text += '  РЕЗУЛЬТАТЫ АЛГОРИТМА ДЕЙКСТРЫ\n';
        text += '═══════════════════════════════════════════════════\n\n';

        if (results.path && results.path.length > 0) {
            text += `Кратчайший путь: ${results.path.map(n => n.replace('n', '')).join(' → ')}\n`;
            text += `Длина пути: ${results.distance}\n`;
            text += `Количество шагов: ${results.steps ? results.steps.length : 'N/A'}\n`;
            text += `Время выполнения: ${results.executionTime.toFixed(3)} мс\n`;
            text += `Количество операций: ${results.operationCount}\n`;
        } else {
            text += 'Путь не найден.\n';
        }

        text += '\n───────────────────────────────────────────────────\n';
        text += '  ТАБЛИЦА РАССТОЯНИЙ\n';
        text += '───────────────────────────────────────────────────\n\n';

        if (results.distances) {
            text += 'Вершина\t\tРасстояние\tПредшественник\n';
            text += '─────────\t──────────\t─────────────\n';

            results.distances.forEach((dist, nodeId) => {
                const predecessor = results.predecessors.get(nodeId);
                text += `${nodeId.replace('n', '')}\t\t${dist === Infinity ? '∞' : dist}\t\t${predecessor ? predecessor.replace('n', '') : '—'}\n`;
            });
        }

        text += '\n═══════════════════════════════════════════════════\n';
        text += `Дата: ${new Date().toLocaleString('ru-RU')}\n`;
        text += 'Создано: Визуализатор алгоритма Дейкстры\n';

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        this._downloadBlob(blob, 'dijkstra_results.txt');
    }

    /**
     * Экспортировать изображение графа в PNG.
     * @param {object} cyInstance — экземпляр Cytoscape.js
     */
    exportPNG(cyInstance) {
        if (!cyInstance) return;

        const png = cyInstance.png({
            output: 'blob',
            bg: document.body.classList.contains('dark-theme') ? '#0b0f19' : '#ffffff',
            full: true,
            scale: 2
        });

        this._downloadBlob(png, 'graph.png');
    }

    /**
     * Экспорт результатов в JSON.
     * @param {object} results — результаты алгоритма
     */
    exportResultsJSON(results) {
        const exportData = {
            path: results.path ? results.path.map(n => n.replace('n', '')) : [],
            distance: results.distance === Infinity ? 'Infinity' : results.distance,
            executionTime: results.executionTime,
            operationCount: results.operationCount,
            stepsCount: results.steps ? results.steps.length : 0,
            distances: {},
            predecessors: {},
            date: new Date().toISOString()
        };

        if (results.distances) {
            results.distances.forEach((dist, nodeId) => {
                exportData.distances[nodeId.replace('n', '')] = dist === Infinity ? 'Infinity' : dist;
            });
        }

        if (results.predecessors) {
            results.predecessors.forEach((pred, nodeId) => {
                exportData.predecessors[nodeId.replace('n', '')] = pred ? pred.replace('n', '') : null;
            });
        }

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        this._downloadBlob(blob, 'dijkstra_results.json');
    }

    /**
     * Экспортировать PDF-отчёт по последнему запуску алгоритма.
     * @param {object} reportData — подготовленные данные отчёта
     */
    exportReportPDF(reportData) {
        const jsPDFConstructor = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDFConstructor) {
            throw new Error('Библиотека jsPDF не загружена');
        }

        const doc = new jsPDFConstructor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        let fontName = 'helvetica';

        if (window.PDF_FONT_NOTO_SANS_BASE64) {
            fontName = 'NotoSansCoursework';
            doc.addFileToVFS('NotoSans-Regular.ttf', window.PDF_FONT_NOTO_SANS_BASE64);
            doc.addFont('NotoSans-Regular.ttf', fontName, 'normal');
            doc.addFont('NotoSans-Regular.ttf', fontName, 'bold');
            doc.setFont(fontName, 'normal');
        }

        const margin = 16;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margin * 2;
        const footerY = pageHeight - 10;
        let y = 18;

        const colors = {
            primary: [37, 99, 235],
            primaryDark: [30, 64, 175],
            green: [22, 163, 74],
            red: [220, 38, 38],
            text: [15, 23, 42],
            muted: [100, 116, 139],
            border: [203, 213, 225],
            soft: [239, 246, 255],
            softGray: [248, 250, 252],
            white: [255, 255, 255]
        };

        const setTextColor = (color) => doc.setTextColor(color[0], color[1], color[2]);
        const setFillColor = (color) => doc.setFillColor(color[0], color[1], color[2]);
        const setDrawColor = (color) => doc.setDrawColor(color[0], color[1], color[2]);
        const setFont = (style = 'normal', size = 10) => {
            doc.setFont(fontName, style);
            doc.setFontSize(size);
        };

        const formatValue = (value) => {
            if (value === null || value === undefined || value === '') return '—';
            if (value === Infinity || value === 'Infinity') return '∞';
            return String(value);
        };

        const formatCost = (value) => value === 'Infinity' || value === Infinity ? 'Путь не найден' : formatValue(value);

        const addFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let page = 1; page <= pageCount; page++) {
                doc.setPage(page);
                setDrawColor(colors.border);
                doc.setLineWidth(0.2);
                doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
                setFont('normal', 8);
                setTextColor(colors.muted);
                doc.text('Визуализатор алгоритма Дейкстры', margin, footerY);
                doc.text(`Страница ${page} из ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });
            }
        };

        const ensureSpace = (height) => {
            if (y + height > pageHeight - 18) {
                doc.addPage();
                y = 18;
            }
        };

        const addParagraph = (text, options = {}) => {
            const size = options.size || 10;
            const gap = options.gap || 5;
            const width = options.width || contentWidth;
            const x = options.x || margin;
            setFont(options.bold ? 'bold' : 'normal', size);
            setTextColor(options.color || colors.text);
            const lines = doc.splitTextToSize(String(text), width);
            ensureSpace(lines.length * gap + 2);
            doc.text(lines, x, y);
            y += lines.length * gap + (options.after || 0);
        };

        const addSectionTitle = (title) => {
            ensureSpace(14);
            y += 4;
            setFillColor(colors.soft);
            setDrawColor(colors.border);
            doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'FD');
            setFont('bold', 12);
            setTextColor(colors.primaryDark);
            doc.text(title, margin + 4, y + 6);
            y += 13;
        };

        const addKeyValueGrid = (items) => {
            const gap = 4;
            const columnGap = 6;
            const columnWidth = (contentWidth - columnGap) / 2;
            const rowHeight = 18;

            for (let i = 0; i < items.length; i += 2) {
                ensureSpace(rowHeight + gap);
                [items[i], items[i + 1]].forEach((item, columnIndex) => {
                    if (!item) return;
                    const x = margin + columnIndex * (columnWidth + columnGap);
                    setFillColor(colors.softGray);
                    setDrawColor(colors.border);
                    doc.roundedRect(x, y, columnWidth, rowHeight, 2, 2, 'FD');
                    setFont('normal', 8);
                    setTextColor(colors.muted);
                    doc.text(item.label, x + 4, y + 6);
                    setFont('bold', 12);
                    setTextColor(item.highlight ? colors.primaryDark : colors.text);
                    const valueLines = doc.splitTextToSize(formatValue(item.value), columnWidth - 8);
                    doc.text(valueLines.slice(0, 2), x + 4, y + 13);
                });
                y += rowHeight + gap;
            }
        };

        const addResultBanner = () => {
            const hasPath = reportData.cost !== 'Infinity' && reportData.pathText !== 'Путь не найден';
            const bannerColor = hasPath ? colors.green : colors.red;
            ensureSpace(30);
            setFillColor(bannerColor);
            doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
            setFont('bold', 13);
            setTextColor(colors.white);
            doc.text(hasPath ? 'Кратчайший путь найден' : 'Путь между выбранными вершинами не найден', margin + 5, y + 8);
            setFont('normal', 10);
            const subtitle = hasPath
                ? `Маршрут: ${reportData.pathText}; стоимость: ${formatCost(reportData.cost)}`
                : 'Все достижимые вершины обработаны, но конечная вершина осталась недостижимой.';
            const lines = doc.splitTextToSize(subtitle, contentWidth - 10);
            doc.text(lines.slice(0, 2), margin + 5, y + 15);
            y += 30;
        };

        const addGraphImage = () => {
            if (!reportData.graphImage) return;

            try {
                addSectionTitle('Изображение графа');
                const imageWidth = contentWidth;
                const imageHeight = Math.min(92, imageWidth * 0.56);
                ensureSpace(imageHeight + 8);
                setDrawColor(colors.border);
                setFillColor(colors.white);
                doc.roundedRect(margin, y, imageWidth, imageHeight, 2, 2, 'FD');
                doc.addImage(reportData.graphImage, 'PNG', margin + 2, y + 2, imageWidth - 4, imageHeight - 4);
                y += imageHeight + 4;
            } catch (err) {
                addParagraph('Изображение графа не удалось добавить в PDF.', { color: colors.muted });
            }
        };

        const addEdgesTable = () => {
            addSectionTitle('Список рёбер графа');

            const rows = Array.isArray(reportData.edges) ? reportData.edges : [];
            if (rows.length === 0) {
                addParagraph('В графе нет рёбер.', { color: colors.muted });
                return;
            }

            const colWidths = [36, 36, 36, contentWidth - 108];
            const headers = ['Откуда', 'Куда', 'Вес', 'Тип связи'];
            const rowHeight = 8;

            const drawHeader = () => {
                ensureSpace(rowHeight + 2);
                setFillColor(colors.primary);
                doc.rect(margin, y, contentWidth, rowHeight, 'F');
                setFont('bold', 9);
                setTextColor(colors.white);
                let x = margin;
                headers.forEach((header, index) => {
                    doc.text(header, x + 3, y + 5.4);
                    x += colWidths[index];
                });
                y += rowHeight;
            };

            drawHeader();
            rows.forEach((row, index) => {
                ensureSpace(rowHeight + 2);
                if (y < 22) drawHeader();

                setFillColor(index % 2 === 0 ? colors.white : colors.softGray);
                setDrawColor(colors.border);
                doc.rect(margin, y, contentWidth, rowHeight, 'FD');

                setFont('normal', 9);
                setTextColor(colors.text);
                const relation = row.direction === '→'
                    ? `${formatValue(row.source)} → ${formatValue(row.target)}`
                    : `${formatValue(row.source)} — ${formatValue(row.target)}`;
                const values = [
                    formatValue(row.source),
                    formatValue(row.target),
                    formatValue(row.weight),
                    relation
                ];
                let x = margin;
                values.forEach((value, columnIndex) => {
                    doc.text(String(value), x + 3, y + 5.4);
                    x += colWidths[columnIndex];
                });
                y += rowHeight;
            });
        };

        const addDistanceTable = () => {
            addSectionTitle('Таблица расстояний');

            const rows = Array.isArray(reportData.distances) ? reportData.distances : [];
            if (rows.length === 0) {
                addParagraph('Нет данных для отображения.', { color: colors.muted });
                return;
            }

            const colWidths = [34, 52, contentWidth - 86];
            const headers = ['Вершина', 'Расстояние', 'Предшественник'];
            const rowHeight = 8;

            const drawHeader = () => {
                ensureSpace(rowHeight + 2);
                setFillColor(colors.primary);
                doc.rect(margin, y, contentWidth, rowHeight, 'F');
                setFont('bold', 9);
                setTextColor(colors.white);
                let x = margin;
                headers.forEach((header, index) => {
                    doc.text(header, x + 3, y + 5.4);
                    x += colWidths[index];
                });
                y += rowHeight;
            };

            drawHeader();
            rows.forEach((row, index) => {
                ensureSpace(rowHeight + 2);
                if (y < 22) drawHeader();

                setFillColor(index % 2 === 0 ? colors.white : colors.softGray);
                setDrawColor(colors.border);
                doc.rect(margin, y, contentWidth, rowHeight, 'FD');

                setFont('normal', 9);
                setTextColor(colors.text);
                const values = [
                    formatValue(row.node),
                    formatValue(row.distance),
                    formatValue(row.predecessor)
                ];
                let x = margin;
                values.forEach((value, columnIndex) => {
                    doc.text(value, x + 3, y + 5.4);
                    x += colWidths[columnIndex];
                });
                y += rowHeight;
            });
        };

        setFillColor(colors.primary);
        doc.rect(0, 0, pageWidth, 38, 'F');
        setFont('bold', 18);
        setTextColor(colors.white);
        doc.text(reportData.projectName, margin, 17);
        setFont('normal', 10);
        doc.text(`Отчёт по результатам выполнения: ${reportData.algorithmName || 'алгоритм кратчайшего пути'}`, margin, 26);
        doc.text(`Дата формирования: ${new Date(reportData.generatedAt).toLocaleString('ru-RU')}`, margin, 33);
        y = 48;

        addSectionTitle('Параметры графа');
        addKeyValueGrid([
            { label: 'Тип графа', value: reportData.graphType },
            { label: 'Количество вершин', value: reportData.nodeCount },
            { label: 'Количество рёбер', value: reportData.edgeCount },
            { label: 'Стартовая вершина', value: reportData.startNode, highlight: true },
            { label: 'Конечная вершина', value: reportData.endNode, highlight: true },
            { label: 'Дата запуска', value: new Date(reportData.generatedAt).toLocaleDateString('ru-RU') }
        ]);

        addSectionTitle('Результат алгоритма');
        addResultBanner();
        addKeyValueGrid([
            { label: 'Стоимость пути', value: formatCost(reportData.cost), highlight: true },
            { label: 'Время выполнения', value: `${Number(reportData.executionTime).toFixed(3)} мс` },
            { label: 'Количество шагов', value: reportData.stepsCount },
            { label: 'Количество операций', value: reportData.operationCount }
        ]);

        addGraphImage();
        addEdgesTable();
        addDistanceTable();

        addSectionTitle('Краткое описание алгоритма');
        addParagraph(reportData.algorithmDescription);
        if (reportData.algorithmId === 'dijkstra') {
            addParagraph(
                'Алгоритм применим к графам с неотрицательными весами рёбер. В проекте используется очередь с приоритетами на основе бинарной кучи, что даёт сложность O((V + E) log V).',
                { color: colors.muted }
            );
        }

        addFooter();

        doc.save('graph_algorithms_report.pdf');
    }

    // ========================================================================
    // ИМПОРТ ФАЙЛОВ
    // ========================================================================

    /**
     * Импортировать граф из JSON-файла.
     * @param {File} file — объект File
     * @returns {Promise<object>} — данные графа
     */
    importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    GraphManager.validateGraphData(data);

                    resolve(data);
                } catch (err) {
                    reject(new Error('Ошибка разбора JSON: ' + err.message));
                }
            };

            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    /**
     * Загрузить примеры графов из файла examples.json.
     * @returns {Promise<Array<{name, description, data}>>}
     */
    async getExamples() {
        try {
            const response = await fetch('data/examples.json');
            const data = await response.json();

            return data.examples.map(example => ({
                name: example.name,
                description: example.description,
                data: {
                    directed: example.directed,
                    nodes: example.nodes,
                    edges: example.edges
                }
            }));
        } catch (e) {
            console.warn('Не удалось загрузить примеры:', e);
            return [];
        }
    }

    // ========================================================================
    // НАСТРОЙКИ ПРИЛОЖЕНИЯ
    // ========================================================================

    /**
     * Сохранить настройки.
     * @param {object} settings — объект настроек
     */
    saveSettings(settings) {
        try {
            const current = this.loadSettings();
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
        } catch (e) {
            console.error('Ошибка сохранения настроек:', e);
        }
    }

    /**
     * Загрузить настройки.
     * @returns {object} — настройки или пустой объект
     */
    loadSettings() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    /**
     * Автоматически сохранить последнее состояние приложения.
     * @param {object} state — граф, настройки и дата сохранения
     */
    saveAutosave(state) {
        try {
            localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify({
                ...state,
                savedAt: new Date().toISOString()
            }));
            return true;
        } catch (e) {
            console.error('Ошибка автосохранения:', e);
            return false;
        }
    }

    /**
     * Загрузить автосохранённое состояние.
     * @returns {object|null}
     */
    loadAutosave() {
        try {
            const data = localStorage.getItem(this.AUTOSAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Удалить автосохранённое состояние.
     */
    clearAutosave() {
        localStorage.removeItem(this.AUTOSAVE_KEY);
    }

    /**
     * Сохранить историю действий.
     * @param {Array<object>} history — список действий
     */
    saveActionHistory(history) {
        try {
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Загрузить историю действий.
     * @returns {Array<object>}
     */
    loadActionHistory() {
        try {
            const data = localStorage.getItem(this.HISTORY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Очистить историю действий.
     */
    clearActionHistory() {
        localStorage.removeItem(this.HISTORY_KEY);
    }

    // ========================================================================
    // УТИЛИТЫ
    // ========================================================================

    /**
     * Скачать Blob как файл.
     * @private
     * @param {Blob} blob — данные
     * @param {string} filename — имя файла
     */
    _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Очищаем
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}

// Экспортируем
window.StorageManager = StorageManager;
