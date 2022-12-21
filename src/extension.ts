import * as vscode from 'vscode';
import performEnvironmentSelection from './perform-environment-selection';
import ResultProvider from './result-provider';
import { QueryExecutor } from './query-executor';
import { performRunQuery } from './perform-run-query';
import { ExtensionState } from './extension-state';

const state = new ExtensionState({
	resultProvider: new ResultProvider(),
	queryExecutor: new QueryExecutor(),
	documentScheme: 'neo4j-query-result'
});

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "neo4j-cypher-runner" is now active!');

	const disposableRunQuery = vscode.commands.registerCommand('neo4j-cypher-runner.run-query', performRunQuery, state);
	const disposableSelectDb = vscode.commands.registerCommand('neo4j-cypher-runner.select-environment', performEnvironmentSelection, state);
	const disposableDocProvider = vscode.workspace.registerTextDocumentContentProvider(state.documentScheme, state.resultProvider);

	context.subscriptions.push(disposableRunQuery);
	context.subscriptions.push(disposableSelectDb);
	context.subscriptions.push(disposableDocProvider);
}

export function deactivate(context: vscode.ExtensionContext) {
	state.apply('queryExecutor', (queryExecutor: QueryExecutor) => queryExecutor.close())
		.catch(e => console.error('Error closing driver', e));
}
