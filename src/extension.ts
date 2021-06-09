import * as vscode from 'vscode';
import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;

function previousDelimiter(editor: vscode.TextEditor): vscode.Position  {
	const currentPosition = editor.selection.active
	for (let i = currentPosition.line; i >= 0; i--) {
		const line = editor.document.lineAt(i)
		if (line.text.startsWith('####')) {
			console.log(`Section starts at (${i+1},0)`)
			return new vscode.Position(i + 1, 0)
		}
		
	}
	console.log(`Section starts at (0,0)`)
	return new vscode.Position(0, 0)
}

function nextDelimiter(editor: vscode.TextEditor): vscode.Position  {
	const currentPosition = editor.selection.active
	const document = editor.document
	const lineCount = document.lineCount
	for (let i = currentPosition.line + 1; i < lineCount; i++) {
		const line = document.lineAt(i)
		if (line.text.startsWith('####')) {
			console.log(`Section ends at (${i},0)`)
			return new vscode.Position(i, 0)
		}
	}
	console.log(`Section ends at (${lineCount},0)`)
	return new vscode.Position(lineCount, 0)
}

export function activate(context: vscode.ExtensionContext) {
	driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic('neo4j', 'pass'), {
		useBigInt: true
	});

	console.log('Congratulations, your extension "neo4j-cypher-runner" is now active!');

	let disposable = vscode.commands.registerCommand('neo4j-cypher-runner.run-query', async () => {
		const maybeEditor = vscode.window.activeTextEditor;
		const document = maybeEditor?.document;
		if (document && document?.fileName.endsWith('.cypher')) {
			const textEditor = maybeEditor!
			const query = document.getText(new vscode.Range(previousDelimiter(textEditor), nextDelimiter(textEditor)));
			const session = driver.session();
			try {
				const json: string = await session.writeTransaction(async tx => {
					const result = await tx.run(query);
					return JSON.stringify(
						result.records.map(x => x.toObject()),
						(_, value) => typeof value === 'bigint' ? `${value}n` : value,
						4
					);
				});

				const resultDocument = await vscode.workspace.openTextDocument({
					language: 'json',
					content: json
				});

				vscode.window.showTextDocument(resultDocument, 2, true);

			} finally {
				session.close();
			}

		}

	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
	driver.close()
		.catch(e => console.error('Error closing driver', e));
}
