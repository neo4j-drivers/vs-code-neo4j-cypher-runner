const PARAM_REGEX = /\/\*\s*:params(.*?)\*\//gs;

export default function extractQueryAndParams(queryAndParams: string): { params: any | undefined, query: string } {
	const { query, paramsStringList } = parseQueryAndParams(queryAndParams);
	const params = paramsStringList
		.map(evaluateParametersString)
		.reduce((left, right) => {
			return { ...left, ...right };
		}, undefined);

	return { query, params };

	function parseQueryAndParams(queryAndParams: string): { paramsStringList: string[], query: string } {
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
