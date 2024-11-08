// types.ts

export interface FoldFile {
    file_spec: number;
    file_creator: string;
    vertices_coords: [number, number][];
    edges_vertices: [number, number][];
    edges_assignment: EdgeAssignment[];
    vertices_edges?: number[][];
    faces_vertices?: number[][];
}

export type EdgeAssignment = 'M' | 'V' | 'B' | 'F' | 'U';

export interface WebviewMessage {
    type: 'update' | 'error' | 'configUpdate';
    content: string;
    config?: FoldPreviewConfig;
}

export interface FoldPreviewState {
    scale: number;
    offsetX: number;
    offsetY: number;
}

export interface FoldPreviewConfig {
    colors: {
        mountain: string;
        valley: string;
        boundary: string;
        flat: string;
        unassigned: string;
    };
    lineStyles: {
        lineWidth: number;
        mountainStyle: LineStyle;
        valleyStyle: LineStyle;
    };
    vertices: {
        show: boolean;
        radius: number;
        color: string;
    };
    canvas: {
        backgroundColor: string;
        padding: number;
        zoomSpeed: number;
    };
}

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export interface FoldPreviewSettings {
    tabSize: number;
    config: FoldPreviewConfig;
}