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
    type: 'update' | 'error';
    content: string;
}

export interface FoldPreviewState {
    scale: number;
    offsetX: number;
    offsetY: number;
}