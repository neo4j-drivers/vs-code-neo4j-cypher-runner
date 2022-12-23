import {  window, Range, TextEditor, Position, Uri, workspace, ViewColumn } from "vscode";
import { Environment, getConfig } from "./config";
import { ExtensionState } from "./extension-state";
import extractQueryAndParams from "./extract-query-and-params";
import performEnvironmentSelection from "./perform-environment-selection";
import ResultProvider from "./result-provider";

export async function performRunQuery(this: ExtensionState) {
  const environment: Environment = await this.getOrPutIfAbsent('environment', () => performEnvironmentSelection.apply(this));
  const delimiter = getConfig().queryDelimiter
  const textEditor = window.activeTextEditor!;
  const document = textEditor.document;
  const queryAndParams = document.getText(new Range(previousDelimiter(delimiter, textEditor), nextDelimiter(delimiter, textEditor)));
  const { query, params: parameters } = extractQueryAndParams(queryAndParams);
  const result = await this.queryExecutor.execute({ ...environment, query, parameters })
    .catch(e => e);
  
  await showResult(this.resultProvider, this.documentScheme,  result);
}


function previousDelimiter(delimiter: string, editor: TextEditor): Position {
  const currentPosition = editor.selection.active;
  for (let i = currentPosition.line; i >= 0; i--) {
    const line = editor.document.lineAt(i);
    if (line.text.startsWith(delimiter)) {
      return new Position(i + 1, 0);
    }

  }
  return new Position(0, 0);
}

function nextDelimiter(delimiter: string, editor: TextEditor): Position {
  const currentPosition = editor.selection.active;
  const document = editor.document;
  const lineCount = document.lineCount;
  for (let i = currentPosition.line + 1; i < lineCount; i++) {
    const line = document.lineAt(i);
    if (line.text.startsWith(delimiter)) {
      return new Position(i, 0);
    }
  }
  return new Position(lineCount, 0);
}

async function showResult(resultProvider: ResultProvider, docScheme: string, result: { summary: object, records: object[] } | Error) {
  const selectedPartOfResult = selectResult(result);
  const resultJson = JSON.stringify(
    selectedPartOfResult,
    (_, value) => typeof value === 'bigint' ? `${value}n` : value,
    4
  );
  const path = resultProvider.registerTextDocumentContent(resultJson);
  const uri = Uri.parse(`${docScheme}:${path}`);
  const doc = await workspace.openTextDocument(uri);
  await window.showTextDocument(doc, ViewColumn.Beside, true);
}

function selectResult (result: { summary: object, records: object[] } | Error): object {
  if (result instanceof Error) {
    return { ...result, message: result.message };
  }
  
  return getConfig().showResultSummary ? result : result.records;
}
