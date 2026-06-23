/**
 * ============================================================================
 * theory.js — Теоретический модуль
 * ============================================================================
 * 
 * Роль: генерация содержимого теоретического раздела.
 * Включает: теорию графов, историю алгоритма, биографию Дейкстры,
 * псевдокод, анализ сложности, практическое применение.
 * 
 * Автор: Курсовая работа — Алгоритм Дейкстры
 * ============================================================================
 */

'use strict';

class TheoryModule {
    /**
     * @param {string} containerId — ID контейнера для отображения теории
     */
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    /**
     * Отрисовать весь теоретический раздел.
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="workspace-page-shell theory-page">
                <div class="workspace-page-header">
                    <div>
                        <span class="workspace-kicker">Теория</span>
                        <h1>Алгоритмы кратчайших путей</h1>
                        <p>Ключевые определения, ограничения и сложность алгоритмов, которые используются в визуализаторе.</p>
                    </div>
                    <div class="workspace-header-metrics" aria-label="Разделы теории">
                        <div class="workspace-metric"><span>Темы</span><strong>11</strong></div>
                        <div class="workspace-metric"><span>Формат</span><strong>карточки</strong></div>
                        <div class="workspace-metric"><span>Фокус</span><strong>графы</strong></div>
                    </div>
                </div>
            <!-- Навигация по разделам теории -->
            <div class="theory-nav">
                <div class="theory-nav-inner">
                    <a href="#theory-graph" class="theory-nav-link active" data-section="theory-graph">
                        <i data-lucide="network"></i> Граф
                    </a>
                    <a href="#theory-shortest" class="theory-nav-link" data-section="theory-shortest">
                        <i data-lucide="route"></i> Кратчайший путь
                    </a>
                    <a href="#theory-history" class="theory-nav-link" data-section="theory-history">
                        <i data-lucide="history"></i> История
                    </a>
                    <a href="#theory-dijkstra" class="theory-nav-link" data-section="theory-dijkstra">
                        <i data-lucide="graduation-cap"></i> Дейкстра
                    </a>
                    <a href="#theory-algorithm" class="theory-nav-link" data-section="theory-algorithm">
                        <i data-lucide="settings"></i> Алгоритм
                    </a>
                    <a href="#theory-bellman-ford" class="theory-nav-link" data-section="theory-bellman-ford">
                        <i data-lucide="git-branch"></i> Беллман-Форд
                    </a>
                    <a href="#theory-floyd-warshall" class="theory-nav-link" data-section="theory-floyd-warshall">
                        <i data-lucide="layout-grid"></i> Флойд-Уоршелл
                    </a>
                    <a href="#theory-pseudocode" class="theory-nav-link" data-section="theory-pseudocode">
                        <i data-lucide="code"></i> Псевдокод
                    </a>
                    <a href="#theory-complexity" class="theory-nav-link" data-section="theory-complexity">
                        <i data-lucide="line-chart"></i> Сложность
                    </a>
                    <a href="#theory-pros-cons" class="theory-nav-link" data-section="theory-pros-cons">
                        <i data-lucide="scale"></i> Плюсы/Минусы
                    </a>
                    <a href="#theory-applications" class="theory-nav-link" data-section="theory-applications">
                        <i data-lucide="laptop"></i> Применение
                    </a>
                </div>
            </div>

            <!-- Содержимое разделов -->
            <div class="theory-content">
                ${this._renderGraphSection()}
                ${this._renderShortestPathSection()}
                ${this._renderHistorySection()}
                ${this._renderDijkstraBioSection()}
                ${this._renderAlgorithmSection()}
                ${this._renderBellmanFordSection()}
                ${this._renderFloydWarshallSection()}
                ${this._renderPseudocodeSection()}
                ${this._renderComplexitySection()}
                ${this._renderProsConsSection()}
                ${this._renderApplicationsSection()}
            </div>
            </div>
        `;

        // Инициализируем навигацию по разделам
        this._initNavigation();
    }

    // ========================================================================
    // РАЗДЕЛ: ЧТО ТАКОЕ ГРАФ
    // ========================================================================

    _renderGraphSection() {
        return `
        <section id="theory-graph" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon"><i data-lucide="network"></i></div>
                    <h2>Что такое граф</h2>
                </div>
                <div class="theory-card-body">
                    <p><strong>Граф</strong> — это математическая структура, которая используется для моделирования парных отношений между объектами. Граф состоит из <em>вершин</em> (или узлов) и <em>рёбер</em> (или дуг), которые соединяют пары вершин.</p>
                    
                    <div class="definition-box">
                        <div class="definition-title"><i data-lucide="book"></i> Формальное определение</div>
                        <p>Граф <strong>G = (V, E)</strong>, где:</p>
                        <ul>
                            <li><strong>V</strong> — множество вершин (vertices)</li>
                            <li><strong>E ⊆ V × V</strong> — множество рёбер (edges)</li>
                        </ul>
                    </div>

                    <h3>Виды графов</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-item-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
                                <i data-lucide="move-horizontal"></i>
                            </div>
                            <h4>Неориентированный граф</h4>
                            <p>Рёбра не имеют направления. Если существует ребро (u, v), то существует и ребро (v, u).</p>
                        </div>
                        <div class="info-item">
                            <div class="info-item-icon" style="background: linear-gradient(135deg, #7c3aed, #8b5cf6);">
                                <i data-lucide="arrow-right"></i>
                            </div>
                            <h4>Ориентированный граф</h4>
                            <p>Рёбра (дуги) имеют направление. Ребро (u, v) не подразумевает ребра (v, u).</p>
                        </div>
                        <div class="info-item">
                            <div class="info-item-icon" style="background: linear-gradient(135deg, #059669, #10b981);">
                                <i data-lucide="weight"></i>
                            </div>
                            <h4>Взвешенный граф</h4>
                            <p>Каждому ребру присвоен вес (стоимость, расстояние, время). Именно с таким графом работает алгоритм Дейкстры.</p>
                        </div>
                        <div class="info-item">
                            <div class="info-item-icon" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
                                <i data-lucide="circle"></i>
                            </div>
                            <h4>Связный граф</h4>
                            <p>Между любыми двумя вершинами существует путь. Алгоритм Дейкстры работает корректно только на связных компонентах.</p>
                        </div>
                    </div>

                    <h3>Способы представления</h3>
                    <div class="table-responsive">
                        <table class="theory-table">
                            <thead>
                                <tr>
                                    <th>Представление</th>
                                    <th>Память</th>
                                    <th>Проверка ребра</th>
                                    <th>Перебор соседей</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Матрица смежности</strong></td>
                                    <td>O(V²)</td>
                                    <td>O(1)</td>
                                    <td>O(V)</td>
                                </tr>
                                <tr>
                                    <td><strong>Список смежности</strong></td>
                                    <td>O(V + E)</td>
                                    <td>O(degree)</td>
                                    <td>O(degree)</td>
                                </tr>
                                <tr>
                                    <td><strong>Список рёбер</strong></td>
                                    <td>O(E)</td>
                                    <td>O(E)</td>
                                    <td>O(E)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p class="text-muted mt-2">В данном проекте используется <strong>список смежности</strong> как наиболее эффективный для разреженных графов.</p>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: КРАТЧАЙШИЙ ПУТЬ
    // ========================================================================

    _renderShortestPathSection() {
        return `
        <section id="theory-shortest" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #059669, #10b981);"><i data-lucide="route"></i></div>
                    <h2>Что такое кратчайший путь</h2>
                </div>
                <div class="theory-card-body">
                    <p><strong>Кратчайший путь</strong> между двумя вершинами в взвешенном графе — это путь, сумма весов рёбер которого минимальна.</p>
                    
                    <div class="definition-box">
                        <div class="definition-title"><i data-lucide="book"></i> Формальное определение</div>
                        <p>Для графа G = (V, E) с весовой функцией w: E → ℝ⁺, кратчайший путь от s к t — это последовательность вершин p = (v₀, v₁, ..., vₖ), где v₀ = s, vₖ = t, и сумма w(vᵢ, vᵢ₊₁) минимальна.</p>
                    </div>

                    <h3>Алгоритмы поиска кратчайших путей</h3>
                    <div class="table-responsive">
                        <table class="theory-table">
                            <thead>
                                <tr>
                                    <th>Алгоритм</th>
                                    <th>Сложность</th>
                                    <th>Ограничения</th>
                                    <th>Тип задачи</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="highlight-row">
                                    <td><strong>Дейкстры</strong></td>
                                    <td>O((V + E) log V)</td>
                                    <td>Неотрицательные веса</td>
                                    <td>Один источник</td>
                                </tr>
                                <tr>
                                    <td>Беллмана-Форда</td>
                                    <td>O(V · E)</td>
                                    <td>Нет отрицательных циклов</td>
                                    <td>Один источник</td>
                                </tr>
                                <tr>
                                    <td>Флойда-Уоршелла</td>
                                    <td>O(V³)</td>
                                    <td>Нет отрицательных циклов</td>
                                    <td>Все пары</td>
                                </tr>
                                <tr>
                                    <td>A* (A-star)</td>
                                    <td>O(E)</td>
                                    <td>Требует эвристику</td>
                                    <td>Один путь</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: ИСТОРИЯ АЛГОРИТМА
    // ========================================================================

    _renderHistorySection() {
        return `
        <section id="theory-history" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #d97706, #f59e0b);"><i data-lucide="history"></i></div>
                    <h2>История алгоритма</h2>
                </div>
                <div class="theory-card-body">
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h4>1956 год</h4>
                                <p>Эдсгер Дейкстра разработал алгоритм, размышляя о задаче кратчайшего пути в Амстердаме. По его словам, он придумал алгоритм за 20 минут, сидя на террасе кафе со своей невестой.</p>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h4>1959 год</h4>
                                <p>Алгоритм был опубликован в журнале «Numerische Mathematik» под заголовком «A note on two problems in connexion with graphs» (Заметка о двух задачах, связанных с графами). Статья занимала всего 3 страницы.</p>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h4>1960–1970-е</h4>
                                <p>Алгоритм стал широко использоваться в задачах маршрутизации в компьютерных сетях, особенно в протоколе OSPF (Open Shortest Path First).</p>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h4>1984 год</h4>
                                <p>Фредман и Тарьян предложили улучшение с использованием кучи Фибоначчи, доведя сложность до O(V log V + E).</p>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h4>Современность</h4>
                                <p>Алгоритм является основой навигационных систем (GPS), маршрутизации в интернете, логистических решений и многих других приложений.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: БИОГРАФИЯ ДЕЙКСТРЫ
    // ========================================================================

    _renderDijkstraBioSection() {
        return `
        <section id="theory-dijkstra" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #7c3aed, #8b5cf6);"><i data-lucide="graduation-cap"></i></div>
                    <h2>Эдсгер Вибе Дейкстра</h2>
                </div>
                <div class="theory-card-body">
                    <div class="bio-layout">
                        <div class="bio-info">
                            <div class="bio-facts">
                                <div class="bio-fact">
                                    <i data-lucide="calendar"></i>
                                    <span><strong>Даты жизни:</strong> 11 мая 1930 — 6 августа 2002</span>
                                </div>
                                <div class="bio-fact">
                                    <i data-lucide="map-pin"></i>
                                    <span><strong>Место рождения:</strong> Роттердам, Нидерланды</span>
                                </div>
                                <div class="bio-fact">
                                    <i data-lucide="trophy"></i>
                                    <span><strong>Премия Тьюринга:</strong> 1972 год</span>
                                </div>
                                <div class="bio-fact">
                                    <i data-lucide="landmark"></i>
                                    <span><strong>Учёная степень:</strong> PhD, Амстердамский университет</span>
                                </div>
                            </div>

                            <p>Эдсгер Вибе Дейкстра — один из величайших учёных в области информатики. Его вклад в программирование, алгоритмы и вычислительную науку невозможно переоценить.</p>
                            
                            <h3>Основные достижения</h3>
                            <ul class="achievement-list">
                                <li><strong>Алгоритм кратчайших путей</strong> (1956) — используется повсеместно в навигации и сетях</li>
                                <li><strong>Семафоры</strong> — механизм синхронизации процессов в операционных системах</li>
                                <li><strong>Структурное программирование</strong> — концепция, которая изменила подход к написанию кода</li>
                                <li><strong>Алгоритм банкира</strong> — предотвращение взаимных блокировок (deadlock)</li>
                                <li><strong>Задача об обедающих философах</strong> — классическая задача синхронизации</li>
                                <li><strong>Алгоритм «Shunting-yard»</strong> — разбор математических выражений</li>
                            </ul>

                            <div class="quote-box">
                                <i data-lucide="quote"></i>
                                <blockquote>
                                    «Простота — необходимое условие надёжности.»
                                </blockquote>
                                <cite>— Эдсгер Дейкстра</cite>
                            </div>

                            <div class="quote-box">
                                <i data-lucide="quote"></i>
                                <blockquote>
                                    «Тестирование программ может быть использовано для демонстрации наличия ошибок, но никогда — для демонстрации их отсутствия.»
                                </blockquote>
                                <cite>— Эдсгер Дейкстра</cite>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: ПРИНЦИП РАБОТЫ АЛГОРИТМА
    // ========================================================================

    _renderAlgorithmSection() {
        return `
        <section id="theory-algorithm" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);"><i data-lucide="settings"></i></div>
                    <h2>Принцип работы алгоритма</h2>
                </div>
                <div class="theory-card-body">
                    <p>Алгоритм Дейкстры использует стратегию <strong>«жадного» алгоритма</strong>: на каждом шаге он выбирает ближайшую необработанную вершину и обновляет расстояния до её соседей.</p>

                    <h3>Ключевая идея — релаксация</h3>
                    <div class="definition-box">
                        <div class="definition-title"><i data-lucide="lightbulb"></i> Релаксация ребра</div>
                        <p>Если текущий известный путь до вершины v длиннее, чем путь через вершину u:</p>
                        <code class="formula">если dist[u] + w(u, v) < dist[v], то dist[v] = dist[u] + w(u, v)</code>
                    </div>

                    <h3>Пошаговое описание</h3>
                    <div class="steps-list">
                        <div class="step-item">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4>Инициализация</h4>
                                <p>Устанавливаем расстояние до начальной вершины = 0, до всех остальных = ∞. Создаём пустое множество посещённых вершин и добавляем начальную вершину в очередь приоритетов.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4>Извлечение минимума</h4>
                                <p>Из очереди приоритетов извлекаем вершину с наименьшим расстоянием. Помечаем её как посещённую.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h4>Релаксация рёбер</h4>
                                <p>Для каждого непосещённого соседа текущей вершины вычисляем новое расстояние. Если оно меньше текущего известного — обновляем и добавляем в очередь.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h4>Повторение</h4>
                                <p>Повторяем шаги 2-3, пока очередь не станет пустой или пока не достигнем целевой вершины.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">5</div>
                            <div class="step-content">
                                <h4>Восстановление пути</h4>
                                <p>Используя массив предшественников, восстанавливаем кратчайший путь от конечной вершины к начальной.</p>
                            </div>
                        </div>
                    </div>

                    <h3>Важные свойства</h3>
                    <div class="info-grid cols-2">
                        <div class="info-item">
                            <div class="info-item-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
                                <i data-lucide="check-circle"></i>
                            </div>
                            <h4>Жадный выбор</h4>
                            <p>На каждом шаге выбирается вершина с минимальным расстоянием. Это гарантирует оптимальность при неотрицательных весах.</p>
                        </div>
                        <div class="info-item">
                            <div class="info-item-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                                <i data-lucide="alert-triangle"></i>
                            </div>
                            <h4>Ограничение весов</h4>
                            <p>Алгоритм корректно работает <strong>только</strong> с неотрицательными весами рёбер. Для отрицательных весов используйте алгоритм Беллмана-Форда.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    _renderBellmanFordSection() {
        return `
        <section id="theory-bellman-ford" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #0f766e, #14b8a6);"><i data-lucide="git-branch"></i></div>
                    <h2>Алгоритм Беллмана-Форда</h2>
                </div>
                <div class="theory-card-body">
                    <p><strong>Алгоритм Беллмана-Форда</strong> решает задачу кратчайших путей от одной стартовой вершины и допускает отрицательные веса рёбер, если в графе нет отрицательных циклов.</p>
                    <div class="definition-box">
                        <div class="definition-title"><i data-lucide="lightbulb"></i> Идея</div>
                        <p>Кратчайший простой путь содержит не больше V - 1 рёбер. Поэтому достаточно V - 1 раз пройти по всем рёбрам и выполнить релаксацию: если путь через ребро стал короче, расстояние обновляется.</p>
                    </div>
                    <pre class="pseudocode"><code><span class="kw">функция</span> <span class="fn">BellmanFord</span>(G, start):
    dist[start] = 0, остальные = ∞
    <span class="kw">повторить</span> V - 1 раз:
        <span class="kw">для каждого</span> ребра (u, v, w):
            <span class="kw">если</span> dist[u] + w &lt; dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
    <span class="kw">для каждого</span> ребра (u, v, w):
        <span class="kw">если</span> dist[u] + w &lt; dist[v]:
            ошибка "отрицательный цикл"</code></pre>
                    <div class="complexity-grid">
                        <div class="complexity-item"><div class="complexity-label">Время</div><div class="complexity-value">O(V · E)</div></div>
                        <div class="complexity-item"><div class="complexity-label">Память</div><div class="complexity-value">O(V)</div></div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    _renderFloydWarshallSection() {
        return `
        <section id="theory-floyd-warshall" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #be185d, #ec4899);"><i data-lucide="layout-grid"></i></div>
                    <h2>Алгоритм Флойда-Уоршелла</h2>
                </div>
                <div class="theory-card-body">
                    <p><strong>Алгоритм Флойда-Уоршелла</strong> находит кратчайшие пути между всеми парами вершин. Он использует динамическое программирование и постепенно разрешает использовать вершины как промежуточные.</p>
                    <div class="definition-box">
                        <div class="definition-title"><i data-lucide="grid"></i> Матричный подход</div>
                        <p>dist[i][j] хранит лучшую известную стоимость пути из i в j. На шаге k проверяется, станет ли путь i → k → j короче текущего dist[i][j].</p>
                    </div>
                    <pre class="pseudocode"><code><span class="kw">функция</span> <span class="fn">FloydWarshall</span>(G):
    dist[i][i] = 0
    dist[u][v] = вес ребра (u, v)
    <span class="kw">для</span> k от 1 до V:
        <span class="kw">для</span> i от 1 до V:
            <span class="kw">для</span> j от 1 до V:
                <span class="kw">если</span> dist[i][k] + dist[k][j] &lt; dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    next[i][j] = next[i][k]</code></pre>
                    <div class="complexity-grid">
                        <div class="complexity-item"><div class="complexity-label">Время</div><div class="complexity-value">O(V³)</div></div>
                        <div class="complexity-item"><div class="complexity-label">Память</div><div class="complexity-value">O(V²)</div></div>
                    </div>
                    <p>Алгоритм удобен для небольших и средних графов, когда нужно сразу получить матрицу расстояний между всеми вершинами.</p>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: ПСЕВДОКОД
    // ========================================================================

    _renderPseudocodeSection() {
        return `
        <section id="theory-pseudocode" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #0891b2, #06b6d4);"><i data-lucide="code"></i></div>
                    <h2>Псевдокод алгоритма</h2>
                </div>
                <div class="theory-card-body">
                    <div class="pseudocode-block">
                        <div class="pseudocode-header">
                            <i data-lucide="file-code"></i>
                            <span>Алгоритм Дейкстры</span>
                        </div>
                        <pre class="pseudocode"><code><span class="kw">функция</span> <span class="fn">Dijkstra</span>(G, start, end):
    <span class="cm">// Шаг 1: Инициализация</span>
    <span class="kw">для каждой</span> вершины v <span class="kw">в</span> G.вершины:
        dist[v] ← <span class="val">∞</span>           <span class="cm">// расстояние до v = бесконечность</span>
        prev[v] ← <span class="val">null</span>        <span class="cm">// предшественник не определён</span>
        visited[v] ← <span class="val">false</span>    <span class="cm">// вершина ещё не обработана</span>
    
    dist[start] ← <span class="val">0</span>            <span class="cm">// расстояние до начальной = 0</span>
    
    <span class="cm">// Шаг 2: Создаём очередь приоритетов</span>
    Q ← <span class="kw">новая</span> ОчередьПриоритетов()
    Q.добавить(start, <span class="val">0</span>)       <span class="cm">// добавляем начальную вершину</span>
    
    <span class="cm">// Шаг 3: Основной цикл</span>
    <span class="kw">пока</span> Q <span class="kw">не</span> пуста:
        u ← Q.извлечьМинимум()   <span class="cm">// вершина с минимальным dist</span>
        
        <span class="kw">если</span> visited[u]:
            <span class="kw">продолжить</span>            <span class="cm">// пропускаем уже обработанные</span>
        
        visited[u] ← <span class="val">true</span>       <span class="cm">// помечаем как посещённую</span>
        
        <span class="kw">если</span> u = end:
            <span class="kw">выход</span>                  <span class="cm">// нашли кратчайший путь</span>
        
        <span class="cm">// Шаг 4: Релаксация рёбер</span>
        <span class="kw">для каждого</span> соседа v <span class="kw">вершины</span> u:
            <span class="kw">если</span> <span class="kw">не</span> visited[v]:
                новоеРасстояние ← dist[u] + вес(u, v)
                
                <span class="kw">если</span> новоеРасстояние < dist[v]:
                    dist[v] ← новоеРасстояние
                    prev[v] ← u
                    Q.добавить(v, новоеРасстояние)
    
    <span class="cm">// Шаг 5: Восстановление пути</span>
    путь ← []
    текущая ← end
    <span class="kw">пока</span> текущая ≠ <span class="val">null</span>:
        путь.добавитьВНачало(текущая)
        текущая ← prev[текущая]
    
    <span class="kw">вернуть</span> (путь, dist[end])</code></pre>
                    </div>

                    <h3 class="mt-4">Структуры данных</h3>
                    <div class="pseudocode-block">
                        <div class="pseudocode-header">
                            <i data-lucide="file-code"></i>
                            <span>Очередь с приоритетами (бинарная мин-куча)</span>
                        </div>
                        <pre class="pseudocode"><code><span class="kw">структура</span> <span class="fn">ОчередьПриоритетов</span>:
    куча ← []    <span class="cm">// массив пар (элемент, приоритет)</span>
    
    <span class="kw">функция</span> <span class="fn">добавить</span>(элемент, приоритет):
        куча.добавить((элемент, приоритет))
        всплытие(куча.длина - 1)       <span class="cm">// O(log n)</span>
    
    <span class="kw">функция</span> <span class="fn">извлечьМинимум</span>():
        мин ← куча[0]
        куча[0] ← куча.последний()
        куча.удалитьПоследний()
        погружение(0)                   <span class="cm">// O(log n)</span>
        <span class="kw">вернуть</span> мин
    
    <span class="kw">функция</span> <span class="fn">всплытие</span>(i):
        <span class="kw">пока</span> i > 0:
            родитель ← (i - 1) / 2
            <span class="kw">если</span> куча[i].приоритет < куча[родитель].приоритет:
                обменять(куча[i], куча[родитель])
                i ← родитель
            <span class="kw">иначе</span>: <span class="kw">выход</span>
    
    <span class="kw">функция</span> <span class="fn">погружение</span>(i):
        <span class="kw">пока</span> 2*i + 1 < куча.длина:
            мин_потомок ← потомок с наименьшим приоритетом
            <span class="kw">если</span> куча[i].приоритет > куча[мин_потомок].приоритет:
                обменять(куча[i], куча[мин_потомок])
                i ← мин_потомок
            <span class="kw">иначе</span>: <span class="kw">выход</span></code></pre>
                    </div>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: СЛОЖНОСТЬ
    // ========================================================================

    _renderComplexitySection() {
        return `
        <section id="theory-complexity" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #dc2626, #ef4444);"><i data-lucide="line-chart"></i></div>
                    <h2>Анализ сложности</h2>
                </div>
                <div class="theory-card-body">
                    <h3>Временная сложность</h3>
                    <div class="table-responsive">
                        <table class="theory-table">
                            <thead>
                                <tr>
                                    <th>Структура данных</th>
                                    <th>Извлечение мин.</th>
                                    <th>Обновление</th>
                                    <th>Общая сложность</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Простой массив</td>
                                    <td>O(V)</td>
                                    <td>O(1)</td>
                                    <td><strong>O(V²)</strong></td>
                                </tr>
                                <tr class="highlight-row">
                                    <td>Бинарная куча</td>
                                    <td>O(log V)</td>
                                    <td>O(log V)</td>
                                    <td><strong>O((V + E) log V)</strong></td>
                                </tr>
                                <tr>
                                    <td>Куча Фибоначчи</td>
                                    <td>O(log V)*</td>
                                    <td>O(1)*</td>
                                    <td><strong>O(V log V + E)</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p class="text-muted">* — амортизированная сложность</p>

                    <div class="definition-box mt-3">
                        <div class="definition-title"><i data-lucide="calculator"></i> В данном проекте</div>
                        <p>Используется <strong>бинарная куча</strong> (min-heap), обеспечивающая сложность <strong>O((V + E) · log V)</strong>.</p>
                        <p>Для разреженных графов (E ≈ V) это даёт <strong>O(V · log V)</strong>.</p>
                        <p>Для плотных графов (E ≈ V²) это даёт <strong>O(V² · log V)</strong>.</p>
                    </div>

                    <h3>Пространственная сложность</h3>
                    <div class="complexity-grid">
                        <div class="complexity-item">
                            <div class="complexity-label">Массив расстояний</div>
                            <div class="complexity-value">O(V)</div>
                        </div>
                        <div class="complexity-item">
                            <div class="complexity-label">Массив предшественников</div>
                            <div class="complexity-value">O(V)</div>
                        </div>
                        <div class="complexity-item">
                            <div class="complexity-label">Множество посещённых</div>
                            <div class="complexity-value">O(V)</div>
                        </div>
                        <div class="complexity-item">
                            <div class="complexity-label">Очередь приоритетов</div>
                            <div class="complexity-value">O(V)</div>
                        </div>
                        <div class="complexity-item total">
                            <div class="complexity-label">Итого</div>
                            <div class="complexity-value">O(V + E)</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: ПРЕИМУЩЕСТВА И НЕДОСТАТКИ
    // ========================================================================

    _renderProsConsSection() {
        return `
        <section id="theory-pros-cons" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #0891b2, #06b6d4);"><i data-lucide="scale"></i></div>
                    <h2>Преимущества и недостатки</h2>
                </div>
                <div class="theory-card-body">
                    <div class="pros-cons-grid">
                        <div class="pros-section">
                            <h3><i data-lucide="thumbs-up"></i> Преимущества</h3>
                            <ul class="pros-list">
                                <li><i data-lucide="check"></i> Гарантирует нахождение оптимального решения</li>
                                <li><i data-lucide="check"></i> Эффективен для разреженных графов с бинарной кучей</li>
                                <li><i data-lucide="check"></i> Прост для понимания и реализации</li>
                                <li><i data-lucide="check"></i> Находит кратчайшие пути ко всем вершинам от одного источника</li>
                                <li><i data-lucide="check"></i> Широко используется и хорошо изучен</li>
                                <li><i data-lucide="check"></i> Работает для ориентированных и неориентированных графов</li>
                            </ul>
                        </div>
                        <div class="cons-section">
                            <h3><i data-lucide="thumbs-down"></i> Недостатки</h3>
                            <ul class="cons-list">
                                <li><i data-lucide="x"></i> Не работает с отрицательными весами рёбер</li>
                                <li><i data-lucide="x"></i> Неэффективен для плотных графов (лучше использовать O(V²) версию)</li>
                                <li><i data-lucide="x"></i> Не подходит для динамических графов (при изменении рёбер)</li>
                                <li><i data-lucide="x"></i> Не учитывает эвристики (в отличие от A*)</li>
                                <li><i data-lucide="x"></i> Исследует много лишних вершин, если нужен путь только к одной</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // РАЗДЕЛ: ПРАКТИЧЕСКОЕ ПРИМЕНЕНИЕ
    // ========================================================================

    _renderApplicationsSection() {
        return `
        <section id="theory-applications" class="theory-section">
            <div class="theory-card">
                <div class="theory-card-header">
                    <div class="theory-icon" style="background: linear-gradient(135deg, #059669, #10b981);"><i data-lucide="laptop"></i></div>
                    <h2>Практическое применение</h2>
                </div>
                <div class="theory-card-body">
                    <div class="applications-grid">
                        <div class="application-card">
                            <div class="application-icon">
                                <i data-lucide="map"></i>
                            </div>
                            <h3>Навигация GPS</h3>
                            <p>Навигационные системы (Google Maps, Яндекс.Карты, Waze) используют модификации алгоритма Дейкстры для нахождения кратчайшего маршрута между двумя точками. Веса рёбер могут представлять расстояние, время в пути или стоимость.</p>
                            <div class="application-examples">
                                <span class="example-tag">Google Maps</span>
                                <span class="example-tag">Яндекс.Навигатор</span>
                                <span class="example-tag">Waze</span>
                            </div>
                        </div>

                        <div class="application-card">
                            <div class="application-icon">
                                <i data-lucide="network"></i>
                            </div>
                            <h3>Компьютерные сети</h3>
                            <p>Протоколы маршрутизации (OSPF, IS-IS) используют алгоритм Дейкстры для определения оптимального пути передачи пакетов данных. Каждый маршрутизатор вычисляет кратчайшие пути ко всем другим маршрутизаторам в сети.</p>
                            <div class="application-examples">
                                <span class="example-tag">OSPF</span>
                                <span class="example-tag">IS-IS</span>
                                <span class="example-tag">SDN</span>
                            </div>
                        </div>

                        <div class="application-card">
                            <div class="application-icon">
                                <i data-lucide="truck"></i>
                            </div>
                            <h3>Логистика</h3>
                            <p>Оптимизация маршрутов доставки, управление цепочками поставок, планирование транспортной логистики. Алгоритм помогает минимизировать расходы на транспортировку и время доставки.</p>
                            <div class="application-examples">
                                <span class="example-tag">Amazon</span>
                                <span class="example-tag">FedEx</span>
                                <span class="example-tag">DHL</span>
                            </div>
                        </div>

                        <div class="application-card">
                            <div class="application-icon">
                                <i data-lucide="gamepad-2"></i>
                            </div>
                            <h3>Игровая разработка</h3>
                            <p>В компьютерных играх алгоритм используется для поиска пути (pathfinding) — перемещения персонажей, NPC и юнитов по карте. Часто комбинируется с A* для ускорения за счёт эвристик.</p>
                            <div class="application-examples">
                                <span class="example-tag">Unity</span>
                                <span class="example-tag">Unreal Engine</span>
                                <span class="example-tag">Стратегии</span>
                            </div>
                        </div>

                        <div class="application-card">
                            <div class="application-icon">
                                <i data-lucide="phone"></i>
                            </div>
                            <h3>Телекоммуникации</h3>
                            <p>Определение оптимальных маршрутов для передачи телефонных вызовов и данных между узлами сети. Минимизация задержек и стоимости передачи.</p>
                            <div class="application-examples">
                                <span class="example-tag">5G</span>
                                <span class="example-tag">VoIP</span>
                                <span class="example-tag">CDN</span>
                            </div>
                        </div>

                        <div class="application-card">
                            <div class="application-icon">
                                <i data-lucide="bot"></i>
                            </div>
                            <h3>Робототехника</h3>
                            <p>Планирование движения роботов, навигация автономных транспортных средств, обход препятствий. Алгоритм помогает строить оптимальные маршруты в реальном времени.</p>
                            <div class="application-examples">
                                <span class="example-tag">Автопилот</span>
                                <span class="example-tag">Дроны</span>
                                <span class="example-tag">Складские роботы</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    }

    // ========================================================================
    // НАВИГАЦИЯ
    // ========================================================================

    /**
     * Инициализировать навигацию по разделам теории.
     * @private
     */
    _initNavigation() {
        const links = this.container.querySelectorAll('.theory-nav-link');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.dataset.section;
                const section = document.getElementById(sectionId);
                
                if (section) {
                    // Убираем активный класс со всех ссылок
                    links.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    // Плавная прокрутка к разделу
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Обновляем активную ссылку при прокрутке
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    links.forEach(l => {
                        l.classList.toggle('active', l.dataset.section === id);
                    });
                }
            });
        }, { threshold: 0.3 });

        this.container.querySelectorAll('.theory-section').forEach(section => {
            observer.observe(section);
        });
    }
}

// Экспортируем
window.TheoryModule = TheoryModule;
