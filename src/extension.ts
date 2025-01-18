import * as vscode from 'vscode';
import { WebviewMessage, WorkspaceConfigLike } from './types';

class FoldPreviewProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'fold-preview.preview';
    private webviewPanels: vscode.WebviewPanel[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('fold-preview')) {
                this.updateAllWebviews();
            }
        });
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable[] {
        console.log('Registering FOLD Preview provider...');
        const provider = new FoldPreviewProvider(context);

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

    private updateAllWebviews() {
        const config = vscode.workspace.getConfiguration('fold-preview') as unknown as WorkspaceConfigLike;
        this.webviewPanels.forEach(panel => {
            panel.webview.postMessage({
                type: 'configUpdate',
                content: '',
                config
            } satisfies WebviewMessage);
        });
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
                const config = vscode.workspace.getConfiguration('fold-preview') as unknown as WorkspaceConfigLike;
                webviewPanel.webview.postMessage({
                    type: 'update',
                    content: JSON.stringify(json, null, 2),
                    config
                } satisfies WebviewMessage);
            } catch (error) {
                webviewPanel.webview.postMessage({
                    type: 'error',
                    content: 'Invalid JSON format'
                } satisfies WebviewMessage);
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
                        border-top: 1px solid var(--vscode-panel-border);
                        padding-top: 10px;
                    }

                    .legend-item {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        min-width: 100px;
                    }

                    .legend-section {
                        display: flex;
                        gap: 20px;
                        flex-wrap: wrap;
                        margin-right: 40px;
                        padding-right: 40px;
                        border-right: 1px solid var(--vscode-panel-border);
                    }

                    .legend-section:last-child {
                        border-right: none;
                    }

                    .legend-label-preview {
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 1px solid var(--vscode-panel-border);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        margin-right: 5px;
                    }
                    .controls {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 10px;
                        font-family: var(--vscode-editor-font-family);
                        flex-wrap: wrap;
                    }
                    .control-group {
                        display: flex;
                        gap: 10px;
                        align-items: center;
                        padding: 5px;
                        border-right: 1px solid var(--vscode-panel-border);
                    }
                    .control-group:last-child {
                        border-right: none;
                    }
                    .toggle-label {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        user-select: none;
                        color: var(--vscode-editor-foreground);
                    }
                    .checkbox-input {
                        margin: 0;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="controls">
                    <div class="control-group">
                        <button class="btn" id="zoomIn">Zoom In (+)</button>
                        <button class="btn" id="zoomOut">Zoom Out (-)</button>
                        <button class="btn" id="reset">Reset Zoom (R)</button>
                        <button class="btn" id="fitToView">Fit to View (F)</button>
                    </div>
                    <div class="control-group">
                        <label class="toggle-label">
                            <input type="checkbox" id="showVertexLabels" class="checkbox-input">
                            Vertex Labels
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="showEdgeLabels" class="checkbox-input">
                            Edge Labels
                        </label>
                        <label class="toggle-label">
                            <input type="checkbox" id="showFaceLabels" class="checkbox-input">
                            Face Labels
                        </label>
                    </div>
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
                    // At the start of the script section, with other variable declarations
                    let showVertexLabels = false;
                    let showEdgeLabels = false;
                    let showFaceLabels = false;

                    document.getElementById('showVertexLabels').addEventListener('change', (e) => {
                        showVertexLabels = e.target.checked;
                        if (currentData) {
                            renderFold(currentData);
                        }
                    });

                    document.getElementById('showEdgeLabels').addEventListener('change', (e) => {
                        showEdgeLabels = e.target.checked;
                        if (currentData) {
                            renderFold(currentData);
                        }
                    });

                    document.getElementById('showFaceLabels').addEventListener('change', (e) => {
                        showFaceLabels = e.target.checked;
                        if (currentData) {
                            renderFold(currentData);
                        }
                    });

                function drawLabelCircle(ctx, x, y, text, type) {
                    // Check if this type of label is actually visible
                    if ((type === 'vertex' && !showVertexLabels) ||
                        (type === 'edge' && !showEdgeLabels) ||
                        (type === 'face' && !showFaceLabels)) {
                        return; // Don't draw if this label type is hidden
                    }

                    const radius = currentConfig.labels.circleRadius;
                    const bgColor = type === 'vertex' ? currentConfig.labels.vertex.background :
                                type === 'edge' ? currentConfig.labels.edge.background :
                                currentConfig.labels.face.background;
                    const borderColor = currentConfig.labels.circleBorder;
                    const borderWidth = currentConfig.labels.borderWidth;
                    const fontSize = currentConfig.labels.fontSize;
                    const textColor = currentConfig.labels.textColor;
                    
                    // Set text alignment properties each time
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Draw circle background
                    ctx.beginPath();
                    ctx.fillStyle = bgColor;
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = borderWidth / zoomLevel;
                    ctx.arc(x, y, radius / zoomLevel, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    // Draw text
                    ctx.font = (fontSize / zoomLevel) + 'px monospace';
                    ctx.fillStyle = textColor;
                    ctx.fillText(text, x, y);
                }
                    function updateLegend(config, data) {  // Add data parameter
                        const lineItems = [
                            { type: 'Boundary', color: config.colors.boundary },
                            { type: 'Mountain', color: config.colors.mountain, style: config.lineStyles.mountainStyle },
                            { type: 'Valley', color: config.colors.valley, style: config.lineStyles.valleyStyle },
                            { type: 'Flat', color: config.colors.flat },
                            { type: 'Unassigned', color: config.colors.unassigned }
                        ];

                        // Only include face labels if faces_vertices exists
                        const labelItems = [
                            { 
                                type: 'Vertex Labels', 
                                background: config.labels.vertex.background,
                                border: config.labels.circleBorder,
                                borderWidth: config.labels.borderWidth,
                                fontSize: config.labels.fontSize,
                                textColor: config.labels.textColor,
                                sample: '0'
                            },
                            { 
                                type: 'Edge Labels', 
                                background: config.labels.edge.background,
                                border: config.labels.circleBorder,
                                borderWidth: config.labels.borderWidth,
                                fontSize: config.labels.fontSize,
                                textColor: config.labels.textColor,
                                sample: '1'
                            }
                        ];

                        // Only add face labels if faces_vertices exists and is an array
                        if (data && data.faces_vertices && Array.isArray(data.faces_vertices)) {
                            labelItems.push({ 
                                type: 'Face Labels', 
                                background: config.labels.face.background,
                                border: config.labels.circleBorder,
                                borderWidth: config.labels.borderWidth,
                                fontSize: config.labels.fontSize,
                                textColor: config.labels.textColor,
                                sample: '2'
                            });
                        }

                        // Only show legend if there are items
                        const legendDiv = document.getElementById('legend');
                        if (!lineItems.length && !labelItems.length) {
                            legendDiv.style.display = 'none';
                            return;
                        }
                        legendDiv.style.display = 'flex';

                        // Create the line items section
                        const lineItemsHtml = lineItems.map(item => 
                            '<div class="legend-item">' +
                                '<canvas class="legend-canvas" width="32" height="10" ' +
                                'data-color="' + item.color + '" ' +
                                'data-style="' + (item.style || 'solid') + '"></canvas>' +
                                item.type +
                            '</div>'
                        ).join('');

                        // Create the label items section with matching styles
                        const labelItemsHtml = labelItems.map(item => 
                            '<div class="legend-item">' +
                                '<div class="legend-label-preview" style="' +
                                'background-color: ' + item.background + '; ' +
                                'border-color: ' + item.border + '; ' +
                                'border-width: ' + (item.borderWidth / zoomLevel) + 'px; ' +  // Scale border width like in canvas
                                'font-size: ' + (item.fontSize / zoomLevel) + 'px; ' +        // Scale font size like in canvas
                                'color: ' + item.textColor + '; ' +
                                'width: ' + (config.labels.circleRadius * 2 / zoomLevel) + 'px; ' +  // Scale circle size like in canvas
                                'height: ' + (config.labels.circleRadius * 2 / zoomLevel) + 'px;">' +
                                item.sample +
                                '</div>' +
                                item.type +
                            '</div>'
                        ).join('');

                        // Combine both sections
                        legendDiv.innerHTML = 
                            '<div class="legend-section">' + lineItemsHtml + '</div>' +
                            '<div class="legend-section">' + labelItemsHtml + '</div>';

                        // Initialize line style canvases
                        document.querySelectorAll('.legend-canvas').forEach(canvas => {
                            const ctx = canvas.getContext('2d');
                            const color = canvas.getAttribute('data-color');
                            const style = canvas.getAttribute('data-style');
                            
                            ctx.fillStyle = config.canvas.backgroundColor;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            ctx.beginPath();
                            ctx.strokeStyle = color;
                            ctx.lineWidth = config.lineStyles.lineWidth;
                            
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
                        if (!currentData || !currentData.vertices_coords) return;
                        
                        // Simply reset transformations
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
                                    updateLegend(currentConfig, currentData);
                                    renderFold(currentData);
                                } catch (error) {
                                    errorDiv.textContent = 'Error parsing FOLD data: ' + error.message;
                                }
                                break;
                            case 'configUpdate':
                                currentConfig = message.config;
                                updateLegend(currentConfig, currentData);
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
                        
                        const labelOffset = currentConfig.labels.offset;

                        // Only draw vertex labels if checkbox is checked
                        if (showVertexLabels && data.vertices_coords) {
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            data.vertices_coords.forEach((coords, i) => {
                                const [x, y] = coords;
                                const tx = (x - minX) * baseScale + offsetX;
                                const ty = (y - minY) * baseScale + offsetY;
                                drawLabelCircle(ctx, tx, ty - (labelOffset / zoomLevel), i.toString(), 'vertex');
                            });
                        }

                        // Only draw edge labels if checkbox is checked
                        if (showEdgeLabels && data.edges_vertices) {
                            data.edges_vertices.forEach((vertices, i) => {
                                const [v1, v2] = vertices;
                                const [x1, y1] = data.vertices_coords[v1];
                                const [x2, y2] = data.vertices_coords[v2];
                                const tx1 = (x1 - minX) * baseScale + offsetX;
                                const ty1 = (y1 - minY) * baseScale + offsetY;
                                const tx2 = (x2 - minX) * baseScale + offsetX;
                                const ty2 = (y2 - minY) * baseScale + offsetY;
                                drawLabelCircle(ctx, (tx1 + tx2)/2, (ty1 + ty2)/2 - (labelOffset / zoomLevel), i.toString(), 'edge');
                            });
                        }

                        // Only draw face labels if checkbox is checked AND faces exist
                        if (showFaceLabels && data.faces_vertices && Array.isArray(data.faces_vertices)) {
                            data.faces_vertices.forEach((vertices, i) => {
                                const centerX = vertices.reduce((sum, v) => sum + data.vertices_coords[v][0], 0) / vertices.length;
                                const centerY = vertices.reduce((sum, v) => sum + data.vertices_coords[v][1], 0) / vertices.length;
                                const tx = (centerX - minX) * baseScale + offsetX;
                                const ty = (centerY - minY) * baseScale + offsetY;
                                drawLabelCircle(ctx, tx, ty, i.toString(), 'face');
                            });
                        }

                        // Update the checkbox visibility based on available data
                        const faceLabelsCheckbox = document.getElementById('showFaceLabels');
                        if (faceLabelsCheckbox) {
                            faceLabelsCheckbox.closest('.toggle-label').style.display = 
                                data.faces_vertices && Array.isArray(data.faces_vertices) ? 'flex' : 'none';
                        }

                        ctx.restore();
                    }

                    // Handle window resize
                    window.addEventListener('resize', () => {
                        const container = document.querySelector('.container');
                        const legend = document.getElementById('legend');
                        canvas.width = window.innerWidth - 40;  // 40px for padding
                        
                        // Get legend height only if it's visible
                        const legendHeight = legend.style.display !== 'none' ? legend.offsetHeight + 20 : 0; // 20px for margins
                        const controlsHeight = 60; // Height of controls section
                        
                        // Subtract both controls and legend height (if legend is visible)
                        canvas.height = window.innerHeight - controlsHeight - legendHeight;
                        
                        if (currentData) {
                            renderFold(currentData);
                        }
                    });

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
        'canvas.padding': 80,
        'canvas.zoomSpeed': 0.1,
        'tabSize': 2,
        'labels.circleRadius': 10,
        'labels.vertex.background': '#FFE082',  
        'labels.edge.background': '#90CAF9',     
        'labels.face.background': '#EF9A9A',      
        'labels.circleBorder': '#000000',
        'labels.borderWidth': 1,
        'labels.fontSize': 12,
        'labels.textColor': '#000000',
        'labels.offset': 16,
        'labels.showVertices': false,
        'labels.showEdges': false,
        'labels.showFaces': false
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