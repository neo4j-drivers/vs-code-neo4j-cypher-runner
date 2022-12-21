import { window } from "vscode";
import { Environment, getConfig } from "./config";
import { ExtensionState } from "./extension-state";

export default async function performEnvironmentSelection(this: ExtensionState): Promise<Environment> {
	const { environments } = getConfig();
	if (environments.length === 0) {
		window.showErrorMessage('No environment configured');
		throw new Error('No environment configured');
	}
	const pickedConfig = await window.showQuickPick(
		environments.map(env => env.name),
		{
			canPickMany: false,
			title: 'Select Neo4j Environment',
		}
	);
	const environment: Environment = environments.find(db => db.name === pickedConfig)!;
	this.set("environment", environment);
	return environment;
}
