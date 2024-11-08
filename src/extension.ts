import * as vscode from 'vscode';
import { FoldPreviewConfig, WebviewMessage, FoldPreviewSettings } from './types';

class FoldPreviewProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'fold-preview.preview';
    private config: FoldPreviewConfig;
    private webviewPanels: vscode.WebviewPanel[] = [];

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        this.config = this.loadConfiguration();
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('fold-preview')) {
                this.config = this.loadConfiguration();
                this.updateAllWebviews();
            }
        });
    }

    private loadConfiguration(): FoldPreviewConfig {
        const config = vscode.workspace.getConfiguration('fold-preview');
        return {
            colors: {
                mountain: config.get('colors.mountain', '#FF0000'),
                valley: config.get('colors.valley', '#0000FF'),
                boundary: config.get('colors.boundary', '#000000'),
                flat: config.get('colors.flat', '#808080'),
                unassigned: config.get('colors.unassigned', '#CCCCCC')
            },
            lineStyles: {
                lineWidth: config.get('lineStyles.lineWidth', 2),
                mountainStyle: config.get('lineStyles.mountainStyle', 'solid'),
                valleyStyle: config.get('lineStyles.valleyStyle', 'solid')
            },
            vertices: {
                show: config.get('vertices.show', true),
                radius: config.get('vertices.radius', 2),
                color: config.get('vertices.color', '#000000')
            },
            canvas: {
                backgroundColor: config.get('canvas.backgroundColor', '#FFFFFF'),
                padding: config.get('canvas.padding', 40),
                zoomSpeed: config.get('canvas.zoomSpeed', 0.1)
            }
        };
    }

    private updateAllWebviews() {
        this.webviewPanels.forEach(panel => {
            panel.webview.postMessage({
                type: 'configUpdate',
                config: this.config
            } as WebviewMessage);
        });
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
        console.log('Registering FOLD Preview provider...');
        const provider = new FoldPreviewProvider(context);

        // Register the preview command
        const previewCommand = vscode.commands.registerCommand('fold-preview.openPreview', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            try {
                await vscode.commands.executeCommand(
                    'vscode.openWith',
                    activeEditor.document.uri,
                    FoldPreviewProvider.viewType,
                    { viewColumn: vscode.ViewColumn.Beside }
                );
            } catch (error) {
                console.error('Failed to open preview:', error);
                vscode.window.showErrorMessage(`Failed to open preview: ${error}`);
            }
        });

        // Register the custom editor provider
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            FoldPreviewProvider.viewType,
            provider,
            {
                webviewOptions: { retainContextWhenHidden: true },
                supportsMultipleEditorsPerDocument: true
            }
        );

        return [previewCommand, providerRegistration];
    }

    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.webviewPanels.push(webviewPanel);

        webviewPanel.onDidDispose(() => {
            const index = this.webviewPanels.indexOf(webviewPanel);
            if (index > -1) {
                this.webviewPanels.splice(index, 1);
            }
        });

        webviewPanel.webview.options = {
            enableScripts: true
        };

        webviewPanel.webview.html = this.getHtmlContent();

        const updateWebview = () => {
            try {
                const json = JSON.parse(document.getText());
                webviewPanel.webview.postMessage({
                    type: 'update',
                    content: JSON.stringify(json, null, 2),
                    config: this.config
                } as WebviewMessage);
            } catch (error) {
                webviewPanel.webview.postMessage({
                    type: 'error',
                    content: 'Invalid JSON format'
                } as WebviewMessage);
            }
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        updateWebview();
    }
    private getHtmlContent(): string {
        // Using a template literal with backticks
        return String.raw`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                    }
                    .controls {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 10px;
                        font-family: var(--vscode-editor-font-family);
                    }
                    .btn {
                        padding: 5px 10px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: 1px solid var(--vscode-button-border);
                        cursor: pointer;
                        border-radius: 3px;
                    }
                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .container {
                        flex: 1;
                        overflow: auto;
                        position: relative;
                    }
                    canvas { 
                        border: 1px solid var(--vscode-panel-border);
                    }
                    .error {
                        color: var(--vscode-errorForeground);
                        padding: 10px;
                        font-family: var(--vscode-editor-font-family);
                    }
                    .legend {
                        display: flex;
                        gap: 20px;
                        margin: 10px;
                        font-family: var(--vscode-editor-font-family);
                        flex-wrap: wrap;
                    }
                    .legend-item {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        min-width: 100px;
                    }
                    .legend-color {
                        width: 20px;
                        margin-top: 8px;
                    }
                    .legend-canvas {
                        width: 20px;
                        height: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="controls">
                    <button class="btn" id="zoomIn">Zoom In (+)</button>
                    <button class="btn" id="zoomOut">Zoom Out (-)</button>
                    <button class="btn" id="reset">Reset Zoom (R)</button>
                    <button class="btn" id="fitToView">Fit to View (F)</button>
                </div>
                <div class="container">
                    <canvas id="preview" width="800" height="800"></canvas>
                </div>
                <div id="legend" class="legend"></div>
                <div id="error" class="error"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const canvas = document.getElementById('preview');
                    const ctx = canvas.getContext('2d');
                    const errorDiv = document.getElementById('error');
                    const legendDiv = document.getElementById('legend');
                    let currentData = null;
                    let currentConfig = null;
                    let zoomLevel = 1;
                    let panX = 0;
                    let panY = 0;
                    let isDragging = false;
                    let lastX = 0;
                    let lastY = 0;

                    function updateLegend(config) {
                        const items = [
                            { type: 'Boundary', color: config.colors.boundary },
                            { type: 'Mountain', color: config.colors.mountain, style: config.lineStyles.mountainStyle },
                            { type: 'Valley', color: config.colors.valley, style: config.lineStyles.valleyStyle },
                            { type: 'Flat', color: config.colors.flat },
                            { type: 'Unassigned', color: config.colors.unassigned }
                        ];

                        legendDiv.innerHTML = items.map(item => {
                            let legendItem;
                            if (item.style === 'dashed-dotted') {
                                // Create a mini-canvas for dash-dot pattern
                                legendItem = '<div class="legend-item">' +
                                            '<canvas class="legend-canvas" width="20" height="20" ' +
                                            'data-color="' + item.color + '" ' +
                                            'data-style="dashed-dotted"></canvas>' +
                                            item.type +
                                            '</div>';
                            } else {
                                const styles = [
                                    'background: ' + item.color,
                                    'width: 20px',
                                    'height: ' + config.lineStyles.lineWidth + 'px'
                                ];
                                
                                if (item.style) {
                                    switch(item.style) {
                                        case 'dashed':
                                            styles.push('border-top-style: dashed');
                                            styles.push('border-top-width: ' + config.lineStyles.lineWidth + 'px');
                                            styles.push('border-top-color: ' + item.color);
                                            styles.push('background: none');
                                            break;
                                        case 'dotted':
                                            styles.push('border-top-style: dotted');
                                            styles.push('border-top-width: ' + config.lineStyles.lineWidth + 'px');
                                            styles.push('border-top-color: ' + item.color);
                                            styles.push('background: none');
                                            break;
                                    }
                                }
                                
                                legendItem = '<div class="legend-item">' +
                                            '<div class="legend-color" style="' + styles.join(';') + '"></div>' +
                                            item.type +
                                            '</div>';
                            }
                            return legendItem;
                        }).join('');

                        // Initialize any mini-canvases for dash-dot patterns
                        document.querySelectorAll('.legend-canvas').forEach(canvas => {
                            const ctx = canvas.getContext('2d');
                            const color = canvas.getAttribute('data-color');
                            
                            // Clear canvas
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            
                            // Draw dash-dot pattern
                            ctx.beginPath();
                            ctx.strokeStyle = color;
                            ctx.lineWidth = config.lineStyles.lineWidth;
                            ctx.setLineDash([5, 5, 1, 5]);
                            ctx.moveTo(0, 10);
                            ctx.lineTo(20, 10);
                            ctx.stroke();
                        });
                    }

                    function setDashPattern(style) {
                    switch (style) {
                        case 'dashed':
                            ctx.setLineDash([5, 5]);
                            break;
                        case 'dotted':
                            ctx.setLineDash([1, 5]);
                            break;
                        case 'dashed-dotted':
                            ctx.setLineDash([5, 5, 1, 5]); // Line, gap, dot, gap pattern
                            break;
                        default:
                            ctx.setLineDash([]);
                        }
                    }

                    // Zoom and pan controls implementation
                    document.getElementById('zoomIn').onclick = () => adjustZoom(1.2);
                    document.getElementById('zoomOut').onclick = () => adjustZoom(0.8);
                    document.getElementById('reset').onclick = resetView;
                    document.getElementById('fitToView').onclick = fitToView;

                    document.addEventListener('keydown', (e) => {
                        if (e.key === '+' || e.key === '=') adjustZoom(1.2);
                        if (e.key === '-') adjustZoom(0.8);
                        if (e.key === 'r' || e.key === 'R') resetView();
                        if (e.key === 'f' || e.key === 'F') fitToView();
                    });

                    canvas.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        lastX = e.clientX;
                        lastY = e.clientY;
                    });

                    window.addEventListener('mousemove', (e) => {
                        if (isDragging) {
                            panX += e.clientX - lastX;
                            panY += e.clientY - lastY;
                            lastX = e.clientX;
                            lastY = e.clientY;
                            renderWithTransform();
                        }
                    });

                    window.addEventListener('mouseup', () => {
                        isDragging = false;
                    });

                    canvas.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        const delta = -Math.sign(e.deltaY);
                        const zoomSpeed = currentConfig?.canvas?.zoomSpeed || 0.1;
                        adjustZoom(1 + delta * zoomSpeed);
                    });

                    function adjustZoom(factor) {
                        zoomLevel *= factor;
                        renderWithTransform();
                    }

                    function resetView() {
                        zoomLevel = 1;
                        panX = 0;
                        panY = 0;
                        renderWithTransform();
                    }

                    function fitToView() {
                        if (!currentData) return;
                        zoomLevel = 1;
                        panX = 0;
                        panY = 0;
                        renderFold(currentData);
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                try {
                                    currentData = JSON.parse(message.content);
                                    currentConfig = message.config;
                                    errorDiv.textContent = '';
                                    updateLegend(currentConfig);
                                    renderFold(currentData);
                                } catch (error) {
                                    errorDiv.textContent = 'Error parsing FOLD data: ' + error.message;
                                }
                                break;
                            case 'configUpdate':
                                currentConfig = message.config;
                                updateLegend(currentConfig);
                                if (currentData) {
                                    renderFold(currentData);
                                }
                                break;
                            case 'error':
                                errorDiv.textContent = message.content;
                                break;
                        }
                    });

                    function renderWithTransform() {
                        if (!currentData) return;
                        renderFold(currentData);
                    }

                    function renderFold(data) {
                        if (!currentConfig) return;
                        
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        // Set background color
                        ctx.fillStyle = currentConfig.canvas.backgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        if (!data.vertices_coords || !data.edges_vertices) {
                            return;
                        }

                        // Find bounds
                        let minX = Infinity, minY = Infinity;
                        let maxX = -Infinity, maxY = -Infinity;
                        
                        for (const [x, y] of data.vertices_coords) {
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }

                        // Calculate scale and offset
                        const padding = currentConfig.canvas.padding;
                        const width = maxX - minX;
                        const height = maxY - minY;
                        const scaleX = (canvas.width - padding * 2) / width;
                        const scaleY = (canvas.height - padding * 2) / height;
                        const scale = Math.min(scaleX, scaleY) * zoomLevel;

                        ctx.save();
                        ctx.translate(panX, panY);

                        const offsetX = (canvas.width - width * scale) / 2;
                        const offsetY = (canvas.height - height * scale) / 2;

                        // Draw edges
                        ctx.lineCap = 'round';
                        ctx.lineWidth = currentConfig.lineStyles.lineWidth;

                        const edgeTypes = {
                            'B': { color: currentConfig.colors.boundary },
                            'M': { 
                                color: currentConfig.colors.mountain,
                                style: currentConfig.lineStyles.mountainStyle
                            },
                            'V': { 
                                color: currentConfig.colors.valley,
                                style: currentConfig.lineStyles.valleyStyle
                            },
                            'F': { color: currentConfig.colors.flat },
                            'U': { color: currentConfig.colors.unassigned }
                        };

                        // Draw edges by type
                        for (let i = 0; i < data.edges_vertices.length; i++) {
                            const assignment = data.edges_assignment[i];
                            const edgeType = edgeTypes[assignment];
                            
                            if (!edgeType) continue;

                            ctx.beginPath();
                            ctx.strokeStyle = edgeType.color;
                            setDashPattern(edgeType.style);

                            const [v1, v2] = data.edges_vertices[i];
                            const [x1, y1] = data.vertices_coords[v1];
                            const [x2, y2] = data.vertices_coords[v2];

                            ctx.moveTo(
                                (x1 - minX) * scale + offsetX,
                                (y1 - minY) * scale + offsetY
                            );
                            ctx.lineTo(
                                (x2 - minX) * scale + offsetX,
                                (y2 - minY) * scale + offsetY
                            );
                            ctx.stroke();
                        }

                        // Draw vertices if enabled
                        if (currentConfig.vertices.show) {
                            ctx.fillStyle = currentConfig.vertices.color;
                            ctx.beginPath();
                            for (const [x, y] of data.vertices_coords) {
                                ctx.moveTo(
                                    (x - minX) * scale + offsetX,
                                    (y - minY) * scale + offsetY
                                );
                                ctx.arc(
                                    (x - minX) * scale + offsetX,
                                    (y - minY) * scale + offsetY,
                                    currentConfig.vertices.radius, 0, Math.PI * 2
                                );
                            }
                            ctx.fill();
                        }
                        
                        ctx.restore();
                    }

                    // Handle window resize
                    window.addEventListener('resize', () => {
                        const container = document.querySelector('.container');
                        const size = Math.min(
                            container.clientWidth,
                            container.clientHeight
                        );
                        canvas.width = size;
                        canvas.height = size;
                        
                        if (currentData) {
                            renderFold(currentData);
                        }
                    });

                    // Initial resize
                    window.dispatchEvent(new Event('resize'));
                </script>
            </body>
            </html>
        `;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating FOLD Preview extension');

    // Set default configuration values if not already set
    const config = vscode.workspace.getConfiguration('fold-preview');

    const defaultSettings = {
        'colors.mountain': '#FF0000',
        'colors.valley': '#0000FF',
        'colors.boundary': '#000000',
        'colors.flat': '#808080',
        'colors.unassigned': '#CCCCCC',
        'lineStyles.lineWidth': 2,
        'lineStyles.mountainStyle': 'dashed-dotted',
        'lineStyles.valleyStyle': 'dashed',
        'vertices.show': true,
        'vertices.radius': 2,
        'vertices.color': '#000000',
        'canvas.backgroundColor': '#FFFFFF',
        'canvas.padding': 40,
        'canvas.zoomSpeed': 0.1,
        'tabSize': 2
    };

    // Update each setting if it hasn't been set
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (config.get(key) === undefined) {
            config.update(key, value, vscode.ConfigurationTarget.Global);
        }
    }

    // Register preview provider
    context.subscriptions.push(...FoldPreviewProvider.register(context));

    // Register formatter
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('fold', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                try {
                    const config = vscode.workspace.getConfiguration('fold-preview');
                    const tabSize = config.get('tabSize', 2);

                    const text = document.getText();
                    const json = JSON.parse(text);
                    const formatted = JSON.stringify(json, null, tabSize);
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(text.length)
                    );
                    return [vscode.TextEdit.replace(fullRange, formatted)];
                } catch (error) {
                    vscode.window.showErrorMessage('Error formatting FOLD file: Invalid JSON');
                    return [];
                }
            }
        })
    );

    // Register format command
    context.subscriptions.push(
        vscode.commands.registerCommand('fold-preview.format', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'fold') {
                try {
                    await vscode.commands.executeCommand('editor.action.formatDocument');
                } catch (error) {
                    vscode.window.showErrorMessage('Error formatting FOLD file');
                }
            }
        })
    );

    console.log('FOLD Preview extension successfully activated');
}

export function deactivate() { }