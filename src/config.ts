import * as vscode from 'vscode';
import { AuthToken } from 'neo4j-driver';

export interface Environment {
  name: string,
  url: string,
  authToken: AuthToken,
  database?: string
}

export interface Config {
  readonly environments: Environment[]
  readonly showResultSummary: boolean
  readonly queryDelimiter: string
}

export function getConfig(key: string = 'neo4j-cypher-runner'): Config {
  const rawConfig = vscode.workspace.getConfiguration(key);

  return {
    get environments(): Environment[] {
      return rawConfig.get('environments') || [] as Environment[];
    },
    get showResultSummary(): boolean {
      return rawConfig.get('showResultSummary') || false;
    },
    get queryDelimiter(): string {
      return rawConfig.get('queryDelimiter') || '####'
    }
  };
}
