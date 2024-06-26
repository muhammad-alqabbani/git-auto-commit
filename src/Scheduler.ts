let timer: NodeJS.Timeout
import * as vscode from 'vscode'
import { runCommand, getIntoPath } from './utils'
import { ReminderView } from './TextView'
export default class Scheduler {
    $option: Option
    constructor(prop: Option) {
        this.$option = { ...prop }
    }
    changeOptions(option: Option) {
        this.$option = option
    }
    changeListener(e: vscode.TextDocument) {
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            this.run()
            clearTimeout(timer)
        }, this.$option.commitTimeInterval)
    }
    private async _getDiff(path: string) {
        let cmd = `${getIntoPath(path)}&& git diff`
        return await runCommand(cmd)
    }
    private async _getUnCommitChange(path: string) {
        let cmd = `${getIntoPath(path)}`
        if (this.$option.autoPush) {
            cmd = cmd + ' && git push'
        } else {
            cmd = cmd + ' && git status'
        }
        return await runCommand(cmd)
    }
    async run() {
        if (this.$option.path) {
            // Verify if there are any differences before execution
            const diff = await this._getDiff(this.$option.path)
            if (diff !== '') {
                const cmd = `${getIntoPath(this.$option.path)} && git add . && git commit -n -m "auto-commit" `
                try {
                    const commitRes = await runCommand(cmd)
                    const unCommitChange = await this._getUnCommitChange(this.$option.path as string)
                    vscode.window.showInformationMessage('Code successfully auto-committed, do you want to view the log?', 'Yes', 'No').then((result) => {
                        if (result === 'Yes') {
                            ReminderView.show(this.$option.context, { diffRes: diff, commitRes, gitStatus: unCommitChange })
                        }
                    })
                } catch (e: any) {
                    ReminderView.show(this.$option.context, e)
                }
            }
        }
    }
    destroy() {
        clearTimeout(timer)
    }
}
