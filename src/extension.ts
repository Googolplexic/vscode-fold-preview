import * as vscode from 'vscode';

class FoldPreviewProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'fold-preview.preview';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
        console.log('Registering FOLD Preview provider...');
        const provider = new FoldPreviewProvider(context);

        // Register the preview command
        const previewCommand = vscode.commands.registerCommand('fold-preview.openPreview', async () => {
            console.log('Preview command triggered');
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            try {
                console.log('Opening preview...');
                await vscode.commands.executeCommand(
                    'vscode.openWith',
                    activeEditor.document.uri,
                    FoldPreviewProvider.viewType,
                    { viewColumn: vscode.ViewColumn.Beside }
                );
                console.log('Preview opened successfully');
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

        return [
            previewCommand,
            providerRegistration
        ];
    }

    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        console.log('Resolving custom text editor...');
        webviewPanel.webview.options = {
            enableScripts: true
        };

        webviewPanel.webview.html = this.getHtmlContent();

        const updateWebview = () => {
            try {
                const json = JSON.parse(document.getText());
                webviewPanel.webview.postMessage({
                    type: 'update',
                    content: JSON.stringify(json, null, 2)
                });
            } catch (error) {
                webviewPanel.webview.postMessage({
                    type: 'error',
                    content: 'Invalid JSON format'
                });
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
        return `
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
                        background: white;
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
                    }
                    .legend-item {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    }
                    .legend-color {
                        width: 20px;
                        height: 2px;
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
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-color" style="background: black"></div>
                        Boundary
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: red"></div>
                        Mountain
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: blue"></div>
                        Valley
                    </div>
                </div>
                <div id="error" class="error"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const canvas = document.getElementById('preview');
                    const ctx = canvas.getContext('2d');
                    const errorDiv = document.getElementById('error');
                    let currentData = null;
                    let zoomLevel = 1;
                    let panX = 0;
                    let panY = 0;
                    let isDragging = false;
                    let lastX = 0;
                    let lastY = 0;

                    // Zoom controls
                    document.getElementById('zoomIn').onclick = () => adjustZoom(1.2);
                    document.getElementById('zoomOut').onclick = () => adjustZoom(0.8);
                    document.getElementById('reset').onclick = resetView;
                    document.getElementById('fitToView').onclick = fitToView;

                    // Keyboard shortcuts
                    document.addEventListener('keydown', (e) => {
                        if (e.key === '+' || e.key === '=') adjustZoom(1.2);
                        if (e.key === '-') adjustZoom(0.8);
                        if (e.key === 'r' || e.key === 'R') resetView();
                        if (e.key === 'f' || e.key === 'F') fitToView();
                    });

                    // Pan controls
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

                    // Zoom with mouse wheel
                    canvas.addEventListener('wheel', (e) => {
                        e.preventDefault();
                        const delta = -Math.sign(e.deltaY);
                        adjustZoom(1 + delta * 0.1);
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
                                    errorDiv.textContent = '';
                                    renderFold(currentData);
                                } catch (error) {
                                    errorDiv.textContent = 'Error parsing FOLD data: ' + error.message;
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
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
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
                        const padding = 40;
                        const width = maxX - minX;
                        const height = maxY - minY;
                        const scaleX = (canvas.width - padding * 2) / width;
                        const scaleY = (canvas.height - padding * 2) / height;
                        const scale = Math.min(scaleX, scaleY) * zoomLevel;

                        // Apply transformations
                        ctx.save();
                        
                        // Apply pan
                        ctx.translate(panX, panY);

                        // Calculate center offset
                        const offsetX = (canvas.width - width * scale) / 2;
                        const offsetY = (canvas.height - height * scale) / 2;

                        // Draw edges
                        ctx.lineCap = 'round';
                        ctx.lineWidth = 2;

                        const passes = [
                            { type: 'B', color: 'black' },
                            { type: 'M', color: 'red' },
                            { type: 'V', color: 'blue' }
                        ];

                        for (const pass of passes) {
                            ctx.beginPath();
                            ctx.strokeStyle = pass.color;

                            for (let i = 0; i < data.edges_vertices.length; i++) {
                                if (data.edges_assignment[i] !== pass.type) continue;

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
                            }
                            ctx.stroke();
                        }

                        // Draw vertices
                        ctx.fillStyle = 'black';
                        ctx.beginPath();
                        for (const [x, y] of data.vertices_coords) {
                            ctx.moveTo(
                                (x - minX) * scale + offsetX,
                                (y - minY) * scale + offsetY
                            );
                            ctx.arc(
                                (x - minX) * scale + offsetX,
                                (y - minY) * scale + offsetY,
                                2, 0, Math.PI * 2
                            );
                        }
                        ctx.fill();
                        
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

    // Register preview provider
    context.subscriptions.push(...FoldPreviewProvider.register(context));

    // Register formatter
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('fold', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                try {
                    const config = vscode.workspace.getConfiguration('fold-preview');
                    const tabSize = config.get('tabSize', 2); // Default to 2 if not set

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