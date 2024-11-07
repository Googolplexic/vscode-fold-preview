"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
function activate(context) {
    // Register the preview command
    context.subscriptions.push(vscode.commands.registerCommand('fold-preview.preview', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const uri = editor.document.uri;
        // Create and show panel
        const panel = vscode.window.createWebviewPanel('foldPreview', 'FOLD Preview', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Initial content
        updateContent(panel, editor.document);
        // Update content when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === editor.document.uri.toString()) {
                updateContent(panel, e.document);
            }
        });
        // Clean up when panel is closed
        panel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }));
}
function updateContent(panel, document) {
    try {
        const foldData = JSON.parse(document.getText());
        panel.webview.html = getWebviewContent(foldData);
    }
    catch (error) {
        panel.webview.html = getErrorContent(error);
    }
}
function getWebviewContent(foldData) {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                margin: 0; 
                padding: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            canvas { 
                border: 1px solid var(--vscode-panel-border);
                background: var(--vscode-editor-background);
            }
        </style>
    </head>
    <body>
        <canvas id="preview" width="800" height="800"></canvas>
        <script>
            const vscode = acquireVsCodeApi();
            const canvas = document.getElementById('preview');
            const ctx = canvas.getContext('2d');
            
            // Your existing canvas rendering code here
            const data = ${JSON.stringify(foldData)};
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
    </html>`;
}
function getErrorContent(error) {
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                margin: 0; 
                padding: 20px;
                color: var(--vscode-editor-foreground);
                font-family: var(--vscode-editor-font-family);
            }
            .error {
                color: var(--vscode-errorForeground);
                white-space: pre-wrap;
            }
        </style>
    </head>
    <body>
        <div class="error">Error parsing FOLD file: ${error.message}</div>
    </body>
    </html>`;
}
function deactivate() { }
//# sourceMappingURL=exten.js.map