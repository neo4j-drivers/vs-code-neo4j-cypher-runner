import * as vscode from 'vscode';
import neo4j, { Driver } from 'neo4j-driver';
import ResultProvider from './result-provider';

const DOC_SCHEME = 'neo4j-query-result';
const PARAM_REGEX = /\/\*\s*:params(.*?)\*\//gs;

let driver: Driver;
let selectedEnvironment: any;

function previousDelimiter(editor: vscode.TextEditor): vscode.Position {
	const currentPosition = editor.selection.active;
	for (let i = currentPosition.line; i >= 0; i--) {
		const line = editor.document.lineAt(i);
		if (line.text.startsWith('####')) {
			console.log(`Section starts at (${i + 1},0)`);
			return new vscode.Position(i + 1, 0);
		}

	}
	console.log(`Section starts at (0,0)`);
	return new vscode.Position(0, 0);
}

function nextDelimiter(editor: vscode.TextEditor): vscode.Position {
	const currentPosition = editor.selection.active;
	const document = editor.document;
	const lineCount = document.lineCount;
	for (let i = currentPosition.line + 1; i < lineCount; i++) {
		const line = document.lineAt(i);
		if (line.text.startsWith('####')) {
			console.log(`Section ends at (${i},0)`);
			return new vscode.Position(i, 0);
		}
	}
	console.log(`Section ends at (${lineCount},0)`);
	return new vscode.Position(lineCount, 0);
}

function extractQueryAndParams(queryAndParams: string): { params: any | undefined, query: string} {
	const { query, paramsStringList } = parseQueryAndParams(queryAndParams);
	const params = paramsStringList
		.map(evaluateParametersString)
		.reduce((left, right) => {
			return { ...left, ...right };
		}, undefined);

	return { query, params };

	function parseQueryAndParams(queryAndParams: string): { paramsStringList: string[], query: string} {
		let match;
		const matches: string[] = [];
		let query = queryAndParams;
		while ((match = PARAM_REGEX.exec(queryAndParams)) !== null) {
			if (match.index === PARAM_REGEX.lastIndex) {
				PARAM_REGEX.lastIndex++;
			}
			query = query.replace(match[0], '');
			matches.push(match[1]);
		}
		return { query: query.trim(), paramsStringList: matches };
	}

	function evaluateParametersString(paramString?: string): any | undefined {
		if (!paramString) {
			return undefined;
		}
		return eval(`const neo4j = require('neo4j-driver'); (function _() { return ${paramString.trim()}; })()`);
	}
}

export async function activate(context: vscode.ExtensionContext) {
	const resultProvider = new ResultProvider();
	function getConfig(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('neo4j-cypher-runner');
	}

	function getConfiguredEnvironments(): any[] {
		const config = getConfig();
		return config.get('environments') || [];
	}

	function getConfiguredShowResultSummary(): boolean {
		return getConfig().get('showResultSummary') || false;
	}

	async function performEnvironmentSelection() {
		const environments = getConfiguredEnvironments();
		if (environments.length == 0) {
			vscode.window.showErrorMessage('No environment configured');
			return;
		}
		const pickedConfig = await vscode.window.showQuickPick(
			environments.map(env => env.name),
			{
				canPickMany: false,
				title: 'Select Neo4j Enviroment',
			}
		);
		selectedEnvironment = environments.find(db => db.name === pickedConfig);
		configureDriver();

	}

	async function configureDriver() {
		if (driver) {
			await driver.close();
		}
		driver = neo4j.driver(selectedEnvironment.url, selectedEnvironment.authToken, { useBigInt: true });
	}

	async function showResult(result: { summary: object, records: object[] }) {
		const selectedPartOfResult = getConfiguredShowResultSummary() ? result : result.records;
		const resultJson = JSON.stringify(
			selectedPartOfResult,
			(_, value) => typeof value === 'bigint' ? `${value}n` : value,
			4
		);
		const path = resultProvider.registerTextDocumentContent(resultJson);
		const uri = vscode.Uri.parse(`${DOC_SCHEME}:${path}`);
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside, true);
	}

	console.log('Congratulations, your extension "neo4j-cypher-runner" is now active!');

	const disposable = vscode.commands.registerCommand('neo4j-cypher-runner.run-query', async () => {
		if (!driver) {
			await performEnvironmentSelection();
		}

		const textEditor = vscode.window.activeTextEditor!;
		const document = textEditor.document;
		const queryAndParams = document.getText(new vscode.Range(previousDelimiter(textEditor), nextDelimiter(textEditor)));
		const { query, params } = extractQueryAndParams(queryAndParams);
		const session = driver.session({ database: selectedEnvironment.database });
		try {
			const result = await session.writeTransaction(async tx => {
				const result = await tx.run(query, params);
				const records = result.records.map(x => x.toObject());
				const { updateStatistics, ...summary } = result.summary;
				return { summary, records };
			});

			await showResult(result);
		} finally {
			session.close();
		}
	});

	const disposableSelectDb = vscode.commands.registerCommand('neo4j-cypher-runner.select-environment', performEnvironmentSelection);
	const disposableDocProvider = vscode.workspace.registerTextDocumentContentProvider(DOC_SCHEME, resultProvider);

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposableSelectDb);
	context.subscriptions.push(disposableDocProvider);
}

export function deactivate() {
	driver.close()
		.catch(e => console.error('Error closing driver', e));
}
