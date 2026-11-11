import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeOpenApi } from './merge.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const args = new Set(process.argv.slice(2));
const check = args.has('--check');

const rootPath = path.join(repoRoot, 'openapi', 'openapi.root.yaml');
const modulesDir = path.join(repoRoot, 'openapi', 'modules');
const outputPath = path.join(repoRoot, 'openapi', 'openapi.yaml');

try {
  const result = await mergeOpenApi({
    rootPath,
    modulesDir,
    outputPath,
    write: !check,
    check,
  });

  if (check) {
    console.log(
      `OpenAPI bundle is up to date (${result.moduleCount} modules, ${result.pathCount} paths, ${result.schemaCount} schemas).`
    );
  } else {
    console.log(
      `Bundled openapi/openapi.yaml from ${result.moduleCount} modules (${result.pathCount} paths, ${result.schemaCount} schemas).`
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR [merge-openapi]: ${message}`);
  process.exitCode = 1;
}

