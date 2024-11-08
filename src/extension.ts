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
                        width: 30px;
                        margin-top: 8px;
                    }
                    .legend-canvas {
                        width: 30px;
                        height: 10px;
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
                            return '<div class="legend-item">' +
                                '<canvas class="legend-canvas" width="32" height="10" ' +
                                'data-color="' + item.color + '" ' +
                                'data-style="' + (item.style || 'solid') + '"></canvas>' +
                                item.type +
                                '</div>';
                        }).join('');

                        // Initialize all legend canvases
                        document.querySelectorAll('.legend-canvas').forEach(canvas => {
                            const ctx = canvas.getContext('2d');
                            const color = canvas.getAttribute('data-color');
                            const style = canvas.getAttribute('data-style');
                            
                            ctx.fillStyle = config.canvas.backgroundColor;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            ctx.beginPath();
                            ctx.strokeStyle = color;
                            ctx.lineWidth = config.lineStyles.lineWidth;
                            
                            // Use same dash pattern scaling for legend
                            switch(style) {
                                case 'dashed':
                                    ctx.setLineDash([5, 4]);
                                    break;
                                case 'dotted':
                                    ctx.setLineDash([2, 4]);
                                    break;
                                case 'dashed-dotted':
                                    ctx.setLineDash([5, 4, 2, 4]);
                                    break;
                                default:
                                    ctx.setLineDash([]);
                            }
                            
                            ctx.moveTo(0, 5);
                            ctx.lineTo(32, 5);
                            ctx.stroke();
                        });
                    }

                    function setDashPattern(style) {
                        // Scale the dash patterns based on zoom level
                        const scale = 1 / zoomLevel;
                        
                        switch (style) {
                            case 'dashed':
                                ctx.setLineDash([5 * scale, 5 * scale]);
                                break;
                            case 'dotted':
                                ctx.setLineDash([1 * scale, 5 * scale]);
                                break;
                            case 'dashed-dotted':
                                ctx.setLineDash([5 * scale, 5 * scale, 1 * scale, 5 * scale]);
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
                    const rect = canvas.getBoundingClientRect();
                    
                    // Get mouse position relative to canvas
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    
                    // Calculate zoom
                    const delta = -Math.sign(e.deltaY);
                    const zoomSpeed = currentConfig?.canvas?.zoomSpeed || 0.1;
                    const scale = 1 + delta * zoomSpeed;
                    
                    const beforeX = (mouseX - panX) / zoomLevel;
                    const beforeY = (mouseY - panY) / zoomLevel;
                    
                    zoomLevel *= scale;
                    
                    panX = mouseX - beforeX * zoomLevel;
                    panY = mouseY - beforeY * zoomLevel;
                    
                    if (currentData) {
                        renderFold(currentData);
                    }
                });

                function adjustZoom(scale) {
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    
                    const beforeX = (centerX - panX) / zoomLevel;
                    const beforeY = (centerY - panY) / zoomLevel;
                    
                    zoomLevel *= scale;
                    
                    panX = centerX - beforeX * zoomLevel;
                    panY = centerY - beforeY * zoomLevel;
                    
                    if (currentData) {
                        renderFold(currentData);
                    }
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
                        if (!currentConfig || !data.vertices_coords || !data.edges_vertices) {
                            return;
                        }

                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = currentConfig.canvas.backgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Find bounds
                        let minX = Infinity, minY = Infinity;
                        let maxX = -Infinity, maxY = -Infinity;
                        
                        for (const [x, y] of data.vertices_coords) {
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }

                        // Calculate initial scale to fit content
                        const padding = currentConfig.canvas.padding;
                        const width = maxX - minX;
                        const height = maxY - minY;
                        const scaleX = (canvas.width - padding * 2) / width;
                        const scaleY = (canvas.height - padding * 2) / height;
                        const baseScale = Math.min(scaleX, scaleY);

                        const offsetX = (canvas.width - width * baseScale) / 2;
                        const offsetY = (canvas.height - height * baseScale) / 2;

                        ctx.save();
                        
                        // Apply transforms
                        ctx.translate(panX, panY);
                        ctx.scale(zoomLevel, zoomLevel);

                        // Set up edge styles
                        const edgeTypes = {
                            'B': { color: currentConfig.colors.boundary },
                            'M': { color: currentConfig.colors.mountain, style: currentConfig.lineStyles.mountainStyle },
                            'V': { color: currentConfig.colors.valley, style: currentConfig.lineStyles.valleyStyle },
                            'F': { color: currentConfig.colors.flat },
                            'U': { color: currentConfig.colors.unassigned }
                        };

                        // Draw edges
                        ctx.lineCap = 'round';
                        ctx.lineWidth = currentConfig.lineStyles.lineWidth / zoomLevel;

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

                            const tx1 = (x1 - minX) * baseScale + offsetX;
                            const ty1 = (y1 - minY) * baseScale + offsetY;
                            const tx2 = (x2 - minX) * baseScale + offsetX;
                            const ty2 = (y2 - minY) * baseScale + offsetY;

                            ctx.moveTo(tx1, ty1);
                            ctx.lineTo(tx2, ty2);
                            ctx.stroke();
                        }

                        // Draw vertices
                        if (currentConfig.vertices.show) {
                            ctx.fillStyle = currentConfig.vertices.color;
                            ctx.beginPath();
                            for (const [x, y] of data.vertices_coords) {
                                const tx = (x - minX) * baseScale + offsetX;
                                const ty = (y - minY) * baseScale + offsetY;
                                ctx.moveTo(tx, ty);
                                ctx.arc(tx, ty, currentConfig.vertices.radius / zoomLevel, 0, Math.PI * 2);
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