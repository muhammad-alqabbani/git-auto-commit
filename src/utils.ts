import path = require('path')
import * as vscode from 'vscode'
const fs = require('fs')
const os = require('os')
import { exec } from 'child_process'
export function getNow() {
    let dateTime
    let yy = new Date().getFullYear()
    let mm = new Date().getMonth() + 1
    let dd = new Date().getDate()
    let hh = new Date().getHours()
    let mf = new Date().getMinutes() < 10 ? '0' + new Date().getMinutes() : new Date().getMinutes()
    let ss = new Date().getSeconds() < 10 ? '0' + new Date().getSeconds() : new Date().getSeconds()
    dateTime = yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mf + ':' + ss
    return dateTime
}
export function getConfig<T = any>(key: string) {
    return vscode.workspace.getConfiguration().get<T>(`code-auto-commit.${key}`)
}

const errorType: {
    [propName: string]: string
} = {
    notRepository: 'fatal: not a git repository (or any of the parent directories): .git',
}
export const getIntoPath = (path: string): string => {
    const platform = os.platform()
    return `${platform === 'win32' ? `${path.slice(0, 2)} &&` : ''} cd ${path}`
}

export const checkIsRepository = async (path: string) => {
    const platform = os.platform()
    const cmd = `${platform === 'win32' ? `${path.slice(0, 2)} &&` : ''} cd ${path} && git worktree list`
    let res = true
    const outputChannel = vscode.window.createOutputChannel('Git Check')
    try {
        await runCommand(cmd)
    } catch (e) {
        const errorMessage = `Failed to run command "${cmd}": ${e}`
        console.error(errorMessage)
        outputChannel.appendLine(errorMessage)
        outputChannel.show()
        res = false
    }
    return res
}

export const throwErrorType = function (errMsg: string) {
    for (let key in errorType) {
        if (errMsg.includes(errorType[key])) {
            return key
        }
    }
    return errMsg
}
export const checkPathSafe = async (path?: readonly vscode.WorkspaceFolder[]) => {
    if (!path) {
        return 'Not a valid directory';
    }
    let isRepository = await checkIsRepository(path[0].uri.fsPath)
    if (!isRepository) {
        return 'Not a git managed project'
    }
    return null
}
export const runCommand = (cmd: string) => {
    return new Promise<string>((resolve, reject) => {
        exec(cmd, (err, stdout) => {
            if (err) {
                reject(err.message)
            } else {
                resolve(stdout)
            }
        })
    })
}
/**
 * Read HTML content from a certain HTML file that can be loaded by Webview
 * @param {string} context context
 * @param {string} templatePath relative path of the html file relative to the root directory of the plugin
 */
function getWebViewContent(context: vscode.ExtensionContext, templatePath: string) {
    const resourcePath = path.join(context.extensionPath, templatePath)
    const dirPath = path.dirname(resourcePath)
    let html: string = fs.readFileSync(resourcePath, 'utf-8')
    // vscode does not support direct loading of local resources, it needs to be replaced with its proprietary path format, here is just a simple replacement of the path of styles and JS
    html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m: string, $1: string, $2: string) => {
        return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"'
    })
    return html
}
