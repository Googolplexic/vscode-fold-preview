// types.ts
export type EdgeAssignment = 'M' | 'V' | 'B' | 'F' | 'U';

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dashed-dotted';

export type WebviewMessage =
    | { type: 'update'; content: string; config: WorkspaceConfigLike }
    | { type: 'error'; content: string }
    | { type: 'configUpdate'; content: string; config: WorkspaceConfigLike };

export type WorkspaceConfigLike = {
    get(section: 'colors.mountain'): string;
    get(section: 'colors.valley'): string;
    get(section: 'colors.boundary'): string;
    get(section: 'colors.flat'): string;
    get(section: 'colors.unassigned'): string;
    get(section: 'lineStyles.lineWidth'): number;
    get(section: 'lineStyles.mountainStyle'): LineStyle;
    get(section: 'lineStyles.valleyStyle'): LineStyle;
    get(section: 'vertices.show'): boolean;
    get(section: 'vertices.radius'): number;
    get(section: 'vertices.color'): string;
    get(section: 'canvas.backgroundColor'): string;
    get(section: 'canvas.padding'): number;
    get(section: 'canvas.zoomSpeed'): number;
    [key: string]: unknown;
    get(section: 'labels.circleRadius'): number;
    get(section: 'labels.circleBackground'): string;
    get(section: 'labels.circleBorder'): string;
    get(section: 'labels.borderWidth'): number;
    get(section: 'labels.fontSize'): number;
    get(section: 'labels.textColor'): string;
    get(section: 'labels.offset'): number;
};