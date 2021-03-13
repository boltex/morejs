import * as path from 'path';
import * as vscode from "vscode";
import { MoreOutlineProvider } from './moreOutline';

/**
 * * Body panes implementation as a file system using "leo" as a scheme identifier
 * TODO : Replace save/rename procedure to overcome API change for undos.
 * Saving and renaming prevents flickering and prevents undos to 'traverse through' different gnx
 */
export class JsBodyProvider implements vscode.FileSystemProvider {

    // * An event to signal that a resource has been changed
    // * It should fire for resources that are being [watched](#FileSystemProvider.watch) by clients of this provider
    private _onDidChangeFileEmitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFileEmitter.event;

    constructor(private _jsOutline: MoreOutlineProvider) {
        //
    }

    public readDirectory(p_uri: vscode.Uri): Thenable<[string, vscode.FileType][]> {
        console.log("readDirectory", p_uri.fsPath);

        const w_directory: [string, vscode.FileType][] = [];
        return Promise.resolve(w_directory);
    }

    public readFile(p_uri: vscode.Uri): Thenable<Uint8Array> {
        console.log("read", p_uri.fsPath, "body", this._jsOutline.bodies[this._moreUriToStr(p_uri)]);

        return Promise.resolve(Buffer.from(this._jsOutline.bodies[this._moreUriToStr(p_uri)]));
    }

    public stat(p_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        console.log("stat", p_uri);
        return Promise.resolve(
            {
                type: vscode.FileType.File,
                ctime: 0,
                mtime: 0,
                // Buffer.byteLength(this._jsOutline.bodies[this._moreUriToStr(p_uri)], 'utf8')
                // size: this._jsOutline.bodies[this._moreUriToStr(p_uri)].length
                size: Buffer.byteLength(this._jsOutline.bodies[this._moreUriToStr(p_uri)], 'utf8')
            }
        );
    }

    public watch(p_resource: vscode.Uri): vscode.Disposable {
        console.log("watch", p_resource.fsPath);

        // const w_gnx = utils.leoUriToStr(p_resource);
        // if (!this._openedBodiesGnx.includes(w_gnx)) {
        //     this._openedBodiesGnx.push(w_gnx); // add gnx
        // }
        // return new vscode.Disposable(() => {
        //     const w_position = this._openedBodiesGnx.indexOf(w_gnx); // find and remove it
        //     if (w_position > -1) {
        //         this._openedBodiesGnx.splice(w_position, 1);
        //     }
        // });
        const temp = p_resource.fsPath;
        return new vscode.Disposable(() => {
            console.log('Disposed of ', temp);
        });
    }

    public writeFile(p_uri: vscode.Uri, p_content: Uint8Array, p_options: { create: boolean, overwrite: boolean }): void {
        console.log("writeFile", p_uri.fsPath);

        //
        // this._fireSoon({ type: vscode.FileChangeType.Changed, uri: p_uri });
    }

    public rename(p_oldUri: vscode.Uri, p_newUri: vscode.Uri, p_options: { overwrite: boolean }): void {
        //
    }

    public delete(uri: vscode.Uri): void {
        let w_dirname = uri.with({ path: path.posix.dirname(uri.path) }); // dirname is just a slash "/"
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: w_dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    public copy(p_uri: vscode.Uri): void {
        //
    }

    public createDirectory(p_uri: vscode.Uri): void {
        //
    }

    private _moreUriToStr(p_uri: vscode.Uri): string {
        // For now, just remove the '/' (or backslash on Windows) before the path string
        return p_uri.fsPath.substr(1);
    }

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    private _fireSoon(...p_events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...p_events);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0; // clearing events array
        }, 5);
    }

}