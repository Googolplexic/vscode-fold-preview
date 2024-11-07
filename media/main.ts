interface Point {
    x: number;
    y: number;
}

class FoldPreviewRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private errorDiv: HTMLDivElement;
    private scale: number = 1;
    private panOffset: Point = { x: 0, y: 0 };

    constructor() {
        this.canvas = document.getElementById('preview') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.errorDiv = document.getElementById('error') as HTMLDivElement;

        this.setupCanvas();
        this.setupEventListeners();
    }

    private setupCanvas(): void {
        // Make canvas fill the window
        const resizeCanvas = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
    }

    private setupEventListeners(): void {
        // Handle zoom and pan
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        this.canvas.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            const delta = -Math.sign(e.deltaY) * 0.1;
            this.scale *= (1 + delta);
            this.render(this.currentData);
        });

        this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (isDragging) {
                this.panOffset.x += e.clientX - lastX;
                this.panOffset.y += e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;
                this.render(this.currentData);
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    private currentData: any = null;

    public render(foldData: any): void {
        this.currentData = foldData;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!foldData) {
            return;
        }

        this.ctx.save();

        // Apply transformations
        this.ctx.translate(
            this.canvas.width / 2 + this.panOffset.x,
            this.canvas.height / 2 + this.panOffset.y
        );
        this.ctx.scale(this.scale * 200, this.scale * 200);

        // Draw vertices
        if (foldData.vertices_coords) {
            this.ctx.fillStyle = '#000';
            for (const [x, y] of foldData.vertices_coords) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 0.01, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw edges
        if (foldData.edges_vertices && foldData.edges_assignment) {
            for (let i = 0; i < foldData.edges_vertices.length; i++) {
                const [v1Index, v2Index] = foldData.edges_vertices[i];
                const assignment = foldData.edges_assignment[i];

                const [x1, y1] = foldData.vertices_coords[v1Index];
                const [x2, y2] = foldData.vertices_coords[v2Index];

                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);

                switch (assignment) {
                    case 'M':
                        this.ctx.strokeStyle = 'red';
                        this.ctx.setLineDash([0.02, 0.02]);
                        break;
                    case 'V':
                        this.ctx.strokeStyle = 'blue';
                        this.ctx.setLineDash([0.02, 0.02]);
                        break;
                    case 'B':
                        this.ctx.strokeStyle = 'black';
                        this.ctx.setLineDash([]);
                        break;
                    default:
                        this.ctx.strokeStyle = 'gray';
                        this.ctx.setLineDash([0.01, 0.01]);
                }

                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.ctx.restore();
    }

    public showError(message: string): void {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
    }

    public hideError(): void {
        this.errorDiv.style.display = 'none';
    }
}

// Initialize renderer
const renderer = new FoldPreviewRenderer();

// Handle messages from extension
window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
        case 'update':
            try {
                const foldData = JSON.parse(message.content);
                renderer.hideError();
                renderer.render(foldData);
            } catch (error: any) {
                renderer.showError(`Error parsing FOLD data: ${error.message}`);
            }
            break;
        case 'error':
            renderer.showError(message.content);
            break;
    }
});