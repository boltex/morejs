import * as path from 'path';
import * as vscode from "vscode";
import { MoreOutlineProvider } from './moreOutline';

interface BodyTimeInfo {
    ctime: number;
    mtime: number;
}

export class JsBodyProvider implements vscode.FileSystemProvider {

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    // * List of currently opened body panes gnx (from 'watch' & 'dispose' methods)
    private _watchedBodiesGnx: string[] = [];

    // * List of gnx that should be available (from more.selectNode and fs.delete)
    private _openedBodiesGnx: string[] = [];
    private _openedBodiesInfo: { [key: string]: BodyTimeInfo } = {};

    constructor(private _moreOutline: MoreOutlineProvider) { }

    public selectNode(p_uri: vscode.Uri) {
        const w_gnx = this._moreUriToStr(p_uri);
        if (!this._openedBodiesGnx.includes(w_gnx)) {
            this._openedBodiesGnx.push(w_gnx);
        }
        console.log('Selected', w_gnx, ' total:', this._openedBodiesGnx.length);

        this._openedBodiesInfo[w_gnx] = {
            ctime: new Date().getTime(),
            mtime: new Date().getTime()
        };
    }

    public refreshPossibleGnxList(): string[] {
        return Object.keys(this._moreOutline.bodies);
    }

    public getExpiredGnxList(): string[] {
        const w_possibleGnxList = this.refreshPossibleGnxList();
        const w_gnxToClose: string[] = [];
        this._watchedBodiesGnx.forEach(p_openedGnx => {
            if (!w_possibleGnxList.includes(p_openedGnx)) {
                w_gnxToClose.push(p_openedGnx);
            }
        });
        this.fireDeleteExpiredGnx(w_gnxToClose); // ! DELETE NOW ?
        return w_gnxToClose;
    }

    public fireDeleteExpiredGnx(p_gnxList: string[]): void {
        p_gnxList.forEach(p_gnx => {
            const w_uri: vscode.Uri = vscode.Uri.parse("more:/" + p_gnx);
            this._fireSoon({ uri: w_uri, type: vscode.FileChangeType.Deleted });
        });
    }

    public readDirectory(p_uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        console.log("readDirectory", p_uri.fsPath);

        const w_directory: [string, vscode.FileType][] = [];
        return Promise.resolve(w_directory);
    }

    public readFile(p_uri: vscode.Uri): Thenable<Uint8Array> {
        const w_gnx = this._moreUriToStr(p_uri);

        if (this._openedBodiesGnx.includes(w_gnx)) {
            console.log("read", p_uri.fsPath, "body", this._moreOutline.bodies[this._moreUriToStr(p_uri)]);
            return Promise.resolve(Buffer.from(this._moreOutline.bodies[this._moreUriToStr(p_uri)]));
        }
        console.log('COULD NOT READ: ', w_gnx);

        throw vscode.FileSystemError.FileNotADirectory(p_uri);
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        const w_gnx = this._moreUriToStr(p_uri);

        if (this._openedBodiesGnx.includes(w_gnx)) {
            console.log("stat ***** OK", p_uri.fsPath);
            return Promise.resolve(
                {
                    type: vscode.FileType.File,
                    ctime: this._openedBodiesInfo[w_gnx].ctime,
                    mtime: this._openedBodiesInfo[w_gnx].mtime,
                    size: Buffer.byteLength(this._moreOutline.bodies[this._moreUriToStr(p_uri)], 'utf8')
                }
            );
        } else {
            console.log("stat ***** NO MORE !!! ", p_uri.fsPath);
            throw vscode.FileSystemError.FileNotFound(p_uri);
        }

    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {
        const w_gnx = this._moreUriToStr(p_resource);

        if (!this._watchedBodiesGnx.includes(w_gnx)) {
            console.log('MORE fs watch put in _openedBodiesGnx:', p_resource.fsPath);
            this._watchedBodiesGnx.push(w_gnx); // add gnx
        } else {
            console.warn('MORE fs watch: already in _openedBodiesGnx:', p_resource.fsPath);

        }
        return new vscode.Disposable(() => {
            const w_position = this._watchedBodiesGnx.indexOf(w_gnx); // find and remove it
            if (w_position > -1) {
                console.log('MORE fs removed from _openedBodiesGnx: ', w_gnx);
                this._watchedBodiesGnx.splice(w_position, 1);
            }
        });
    }

    public writeFile(p_uri: vscode.Uri, p_content: Uint8Array, p_options: { create: boolean, overwrite: boolean }): void {
        console.log("writeFile", p_uri.fsPath);
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: p_uri });
    }

    public rename(p_oldUri: vscode.Uri, p_newUri: vscode.Uri, p_options: { overwrite: boolean }): void {
        console.log('SHOULD NOT RENAME!');

        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: p_oldUri },
            { type: vscode.FileChangeType.Created, uri: p_newUri }
        );
    }

    public delete(p_uri: vscode.Uri): void {
        console.log("delete", p_uri.fsPath);
        const w_gnx = this._moreUriToStr(p_uri);

        if (this._openedBodiesGnx.includes(w_gnx)) {
            this._openedBodiesGnx.splice(this._openedBodiesGnx.indexOf(w_gnx), 1);
            delete this._openedBodiesInfo[w_gnx];
        }

        let w_dirname = p_uri.with({ path: path.posix.dirname(p_uri.path) }); // dirname is just a slash "/"

        this._fireSoon(
            { type: vscode.FileChangeType.Changed, uri: w_dirname },
            { uri: p_uri, type: vscode.FileChangeType.Deleted }
        );
    }

    public copy(p_uri: vscode.Uri): void {
        console.error('MORE fs copy Should not be called');
    }

    public createDirectory(p_uri: vscode.Uri): void {
        console.error('MORE fs createDirectory Should not be called');
    }

    private _moreUriToStr(p_uri: vscode.Uri): string {
        // For now, just remove the '/' (or backslash on Windows) before the path string
        return p_uri.fsPath.substr(1);
    }

    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    private _fireSoon(...p_events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...p_events);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._onDidChangeFileEmitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0; // clearing events array
        }, 5);
    }

}
