import * as vscode from 'vscode';
import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;

export function activate(context: vscode.ExtensionContext) {
	driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic('neo4j', 'pass'), {
		useBigInt: true
	});

	console.log('Congratulations, your extension "neo4j-cypher-runner" is now active!');

	let disposable = vscode.commands.registerCommand('neo4j-cypher-runner.run-query', async () => {
		const document = vscode.window.activeTextEditor?.document;
		if (document && document?.fileName.endsWith('.cypher')) {
			const query = document.getText();
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
