interface ILeoHeader {
    fileFormat: number;
}

interface IPosition {
    top: number;
    left: number;
    height: number;
    width: number;
}

interface IGlobals {
    bodyOutlineRatio?: number;
    globalWindowPosition?: IPosition;
    globalLogWindowPosition?: IPosition;
}

interface ITNode {
    tx: string;
    body: string;
}

interface IVNode {
    vh?: string;
    a?: string;
    t: string;
    children: IVNode[];
}

export interface ILeoFile {
    leoHeader: ILeoHeader;
    globals: IGlobals;
    vnodes: IVNode[];
    tnodes: ITNode[];
}