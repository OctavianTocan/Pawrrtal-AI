import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.next', '__tests__']);
const IGNORED_FILE_PATTERN =
	/(?:\/__tests__\/|\.(?:test|spec)\.[mc]?[jt]sx?$|\/dist\/|\/components\/ui\/)/;
const SOURCE_FILE_PATTERN = /\.[mc]?[jt]sx?$/;
const MAX_FILE_LINES = 400;

/**
 * pathToPosix
 *
 * Normalizes filesystem paths to POSIX separators for stable filtering and output.
 *
 * @param {string} filePath - Absolute or relative filesystem path.
 * @returns {string} Path using forward slashes.
 *
 * @example
 * pathToPosix('frontend/components/HomePage.tsx');
 */
function pathToPosix(filePath) {
	return filePath.split(path.sep).join('/');
}

/**
 * isIncludedFile
 *
 * Filters source files down to non-test JavaScript and TypeScript files.
 *
 * @param {string} relativePath - Project-relative path to evaluate.
 * @returns {boolean} True when the file should be checked for docstrings.
 *
 * @example
 * isIncludedFile('frontend/components/HomePage.tsx');
 */
function isIncludedFile(relativePath) {
	return SOURCE_FILE_PATTERN.test(relativePath) && !IGNORED_FILE_PATTERN.test(relativePath);
}

/**
 * collectSourceFiles
 *
 * Recursively collects source files from the frontend directory, skipping
 * node_modules, dist, .next, and __tests__ directories for performance.
 *
 * @param {string} directoryPath - Directory to scan.
 * @returns {Promise<string[]>} Absolute file paths beneath the directory.
 *
 * @example
 * await collectSourceFiles('/repo/pawrrtal/frontend');
 */
async function collectSourceFiles(directoryPath) {
	const entries = await fs.readdir(directoryPath, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(directoryPath, entry.name);
			if (entry.isDirectory()) {
				if (IGNORED_DIRS.has(entry.name)) return [];
				return collectSourceFiles(entryPath);
			}
			return [entryPath];
		})
	);
	return nested.flat();
}

/**
 * hasJsDoc
 *
 * Checks whether a TypeScript AST node carries at least one JSDoc block.
 *
 * @param {ts.Node} node - AST node to inspect.
 * @returns {boolean} True when the node has an attached JSDoc block.
 *
 * @example
 * hasJsDoc(node);
 */
function hasJsDoc(node) {
	return Array.isArray(node.jsDoc) && node.jsDoc.length > 0;
}

/**
 * hasVariableStatementJsDoc
 *
 * Checks whether a variable declaration inherits JSDoc from its enclosing statement.
 *
 * @param {ts.VariableDeclaration} node - Variable declaration to inspect.
 * @returns {boolean} True when the enclosing variable statement carries JSDoc.
 *
 * @example
 * hasVariableStatementJsDoc(node);
 */
function hasVariableStatementJsDoc(node) {
	const declarationList = node.parent;
	if (!declarationList || !ts.isVariableDeclarationList(declarationList)) {
		return false;
	}
	const statement = declarationList.parent;
	return Boolean(statement && ts.isVariableStatement(statement) && hasJsDoc(statement));
}
/**
 * hasFunctionLikeAncestor
 *
 * Detects whether a node is nested inside another function-like declaration.
 *
 * @param {ts.Node} node - AST node to inspect.
 * @returns {boolean} True when the node is nested within another function-like node.
 *
 * @example
 * hasFunctionLikeAncestor(node);
 */
function hasFunctionLikeAncestor(node) {
	let current = node.parent;
	while (current) {
		if (ts.isFunctionLike(current)) {
			return true;
		}
		current = current.parent;
	}
	return false;
}

/**
 * getMemberName
 *
 * Extracts a readable name for function-like members when possible.
 *
 * @param {ts.Node & { name?: ts.PropertyName }} node - Function-like AST node.
 * @param {ts.SourceFile} sourceFile - Source file containing the node.
 * @returns {string} Display name for the function-like node.
 *
 * @example
 * getMemberName(methodNode, sourceFile);
 */
function getMemberName(node, sourceFile) {
	return node.name ? node.name.getText(sourceFile) : '<anonymous>';
}

/**
 * collectFileWarnings
 *
 * Finds file-level policy violations that are not covered by Biome.
 *
 * Additional details:
 * - Warns when a file exceeds the maximum physical line count
 * - Skips tests and dist files via the file collector
 * - Emits warning-formatted strings so lint can remain non-blocking
 *
 * @param {string} fileText - Raw file contents.
 * @param {string} relativePath - Project-relative file path for reporting.
 * @returns {string[]} Warning lines for file-level policy violations.
 *
 * @example
 * collectFileWarnings(fileText, 'frontend/components/HomePage.tsx');
 */
function collectFileWarnings(fileText, relativePath) {
	const warnings = [];
	const lineCount = fileText.split(/\r?\n/).length;
	if (lineCount > MAX_FILE_LINES) {
		warnings.push(
			`${relativePath}:1:1 warn File exceeds ${MAX_FILE_LINES} lines (${lineCount})`
		);
	}
	return warnings;
}

/**
 * collectDocstringWarnings
 *
 * Finds named function-like declarations that are missing JSDoc docstrings.
 *
 * Additional details:
 * - Checks function declarations, named function expressions, variable-assigned arrow/functions, and class/object accessors or methods
 * - Skips tests and dist files via the file collector
 * - Emits warning-formatted strings so lint can remain non-blocking
 *
 * @param {ts.SourceFile} sourceFile - Parsed source file to inspect.
 * @param {string} relativePath - Project-relative file path for reporting.
 * @returns {string[]} Warning lines for missing docstrings.
 *
 * @example
 * collectDocstringWarnings(sourceFile, 'frontend/components/HomePage.tsx');
 */
function collectDocstringWarnings(sourceFile, relativePath) {
	const warnings = [];
	const pushWarning = (node, name, kind) => {
		const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
		warnings.push(
			`${relativePath}:${start.line + 1}:${start.character + 1} warn Missing JSDoc docstring on ${kind} ${name}`
		);
	};

	const visit = (node) => {
		if (
			ts.isFunctionDeclaration(node) &&
			node.name &&
			node.body &&
			!hasJsDoc(node) &&
			!hasFunctionLikeAncestor(node)
		) {
			pushWarning(node, node.name.text, 'function');
		}
		if (
			(ts.isMethodDeclaration(node) ||
				ts.isGetAccessorDeclaration(node) ||
				ts.isSetAccessorDeclaration(node)) &&
			node.body &&
			!hasJsDoc(node) &&
			!hasFunctionLikeAncestor(node)
		) {
			pushWarning(node, getMemberName(node, sourceFile), 'method');
		}
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			(ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
			!hasJsDoc(node) &&
			!hasVariableStatementJsDoc(node) &&
			!hasJsDoc(node.initializer) &&
			!hasFunctionLikeAncestor(node)
		) {
			pushWarning(node, node.name.text, 'variable-assigned function');
		}
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return warnings;
}

/**
 * main
 *
 * Runs the Pawrrtal policy checker and prints warning diagnostics.
 *
 * @returns {Promise<void>} Completion signal once warnings are printed.
 *
 * @example
 * await main();
 */
async function main() {
	const rootPath = process.cwd();
	const frontendRoot = path.join(rootPath, 'frontend');
	const files = (await collectSourceFiles(frontendRoot)).filter((filePath) =>
		isIncludedFile(pathToPosix(path.relative(rootPath, filePath)))
	);
	const warnings = [];
	for (const filePath of files) {
		const relativePath = pathToPosix(path.relative(rootPath, filePath));
		const fileText = await fs.readFile(filePath, 'utf8');
		warnings.push(...collectFileWarnings(fileText, relativePath));
		const sourceFile = ts.createSourceFile(
			relativePath,
			fileText,
			ts.ScriptTarget.Latest,
			true,
			filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
		);
		warnings.push(...collectDocstringWarnings(sourceFile, relativePath));
	}
	if (warnings.length > 0) {
		console.warn(warnings.join('\n'));
		console.warn(`Policy warnings: ${warnings.length}`);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
