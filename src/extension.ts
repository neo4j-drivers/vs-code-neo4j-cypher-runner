import * as vscode from 'vscode';
import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver ; 

export function activate(context: vscode.ExtensionContext) {
	driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic('neo4j', 'pass'));

	console.log('Congratulations, your extension "neo4j-cypher-runner" is now active!');

	let disposable = vscode.commands.registerCommand('neo4j-cypher-runner.run-query', async () => {
		const session = driver.session();
		try {
			const json: string = await session.writeTransaction(async tx => {
				const result = await tx.run('RETURN 1 AS n');
				return JSON.stringify(result.records.map(x => x.toObject()));
			});

			vscode.window.showInformationMessage(json);

		} finally {
			session.close();
		}
		
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
	driver.close()
		.catch(e => console.error('Error closing driver', e));
}
