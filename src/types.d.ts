export interface PNode {
    header: string;
    gnx: string;
    children: PNode[];
}

/**
 * * Icon path names used in leoNodes for rendering in treeview
 */
export interface Icon {
    light: string;
    dark: string;
}
