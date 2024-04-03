// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
// this method is called when your extension is activated
import Scheduler from './Scheduler'
import { checkPathSafe, getConfig } from './utils'

let instances: { [path: string]: Scheduler } = {}

export async function activate(context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
            let config: Option = {
                commitTimeInterval: getConfig<number>('commitTimeInterval') || 0,
                autoPush: getConfig<boolean>('autoPush') || false,
                context,
                path: folder.uri.fsPath,
            }
            let checkPathRes = await checkPathSafe([folder])
            if (checkPathRes) {
                vscode.window.showErrorMessage(checkPathRes)
                return
            } else {
                instances[folder.uri.fsPath] = new Scheduler(config)
            }
        }
    }

    vscode.window.showInformationMessage('git-auto-commit successfully enabled')

    vscode.workspace.onDidSaveTextDocument((e) => {
        const folder = vscode.workspace.getWorkspaceFolder(e.uri)
        if (folder) {
            instances[folder.uri.fsPath].changeListener(e)
        }
    })

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(() => {
            for (const path in instances) {
                let config: Option = {
                    commitTimeInterval: getConfig<number>('commitTimeInterval') || 0,
                    autoPush: getConfig<boolean>('autoPush') || false,
                    context,
                    path,
                }
                instances[path].changeOptions(config)
            }
        })
    )
}

// this method is called when your extension is deactivated
export function deactivate() {
    for (const path in instances) {
        instances[path].destroy()
    }
}
