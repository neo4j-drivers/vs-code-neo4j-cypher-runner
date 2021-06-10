import { TextDocumentContentProvider, Uri } from 'vscode';


export default class ResultProvider implements TextDocumentContentProvider {
  private results: Map<string, string>;
  private cursor: number;

  constructor() {
    this.results = new Map<string, string>();  
    this.cursor = 0;
  }

  registerTextDocumentContent(content: string): string {
    const key = `/${++this.cursor}/result.json`;
    this.results.set(key, content);
    return key;
  }

  provideTextDocumentContent(uri: Uri): string {
    const result = this.results.get(uri.path) || "";
    this.results.delete(uri.path);
    return result;
  }
}