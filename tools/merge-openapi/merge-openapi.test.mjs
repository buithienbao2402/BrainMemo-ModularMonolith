import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mergeOpenApi } from './merge.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(__dirname, 'index.mjs');

const MINIMAL_ROOT_YAML = `openapi: 3.0.3
info:
  title: Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    Problem:
      type: object
  parameters:
    Id:
      name: id
      in: path
      required: true
      schema:
        type: string
`;

const tempDirs = [];

/**
 * Create an isolated temporary OpenAPI root + modules directory fixture.
 * @param {object} params
 * @param {string} [params.rootYaml]
 * @param {Record<string, string>} params.modules
 * @param {string} [params.existingOutput]
 */
async function createFixture({ rootYaml = MINIMAL_ROOT_YAML, modules, existingOutput }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'merge-openapi-test-'));
  tempDirs.push(dir);

  const rootPath = path.join(dir, 'openapi.root.yaml');
  const modulesDir = path.join(dir, 'modules');
  const outputPath = path.join(dir, 'openapi.yaml');

  await fs.writeFile(rootPath, rootYaml, 'utf8');
  await fs.mkdir(modulesDir, { recursive: true });
  for (const [name, content] of Object.entries(modules)) {
    await fs.writeFile(path.join(modulesDir, name), content, 'utf8');
  }
  if (existingOutput !== undefined) {
    await fs.writeFile(outputPath, existingOutput, 'utf8');
  }

  return { rootPath, modulesDir, outputPath };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe('mergeOpenApi', () => {
  it('merges the repository OpenAPI specs and verifies committed openapi.yaml is in sync', async () => {
    const result = await mergeOpenApi({
      rootPath: path.join(repoRoot, 'openapi', 'openapi.root.yaml'),
      modulesDir: path.join(repoRoot, 'openapi', 'modules'),
      outputPath: path.join(repoRoot, 'openapi', 'openapi.yaml'),
      write: false,
      check: true,
    });

    assert.equal(result.moduleCount, 11);
    assert.equal(result.inSync, true);
    assert.ok(result.pathCount >= 100);
    assert.ok(result.schemaCount >= 50);
    assert.ok(result.document.paths['/auth/login']);
    assert.ok(result.document.components.schemas.Problem);
  });

  it('rejects duplicate path across two module files', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths:
  /items:
    get:
      operationId: getItemsA
      responses:
        '200':
          description: OK
`,
        'b.yaml': `paths:
  /items:
    post:
      operationId: createItemB
      responses:
        '201':
          description: Created
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Duplicate path "\/items" defined in both modules\/a\.yaml and modules\/b\.yaml/
    );
  });

  it('rejects duplicate component schema name across two module files', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths: {}
components:
  schemas:
    CourseDto:
      type: object
`,
        'b.yaml': `paths: {}
components:
  schemas:
    CourseDto:
      type: object
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Duplicate components\.schemas "CourseDto" defined in both modules\/a\.yaml and modules\/b\.yaml/
    );
  });

  it('rejects module schema colliding with openapi.root.yaml schema', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths: {}
components:
  schemas:
    Problem:
      type: object
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Duplicate components\.schemas "Problem" defined in both openapi\.root\.yaml and modules\/a\.yaml/
    );
  });

  it('rejects duplicate non-schema components colliding across modules or root', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths: {}
components:
  parameters:
    Id:
      name: id
      in: path
      required: true
      schema:
        type: string
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Duplicate components\.parameters "Id" defined in both openapi\.root\.yaml and modules\/a\.yaml/
    );
  });

  it('rejects duplicate operationId across modules', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths:
  /one:
    get:
      operationId: sharedOp
      responses:
        '200':
          description: OK
`,
        'b.yaml': `paths:
  /two:
    get:
      operationId: sharedOp
      responses:
        '200':
          description: OK
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Duplicate operationId "sharedOp"/
    );
  });

  it('rejects unresolved local component $ref targets', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths:
  /items:
    get:
      operationId: listItems
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MissingDto'
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Unresolved \$ref "#\/components\/schemas\/MissingDto"/
    );
  });

  it('rejects duplicate YAML keys within a single file', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths:
  /dup:
    get:
      operationId: op1
      responses:
        '200':
          description: OK
  /dup:
    post:
      operationId: op2
      responses:
        '201':
          description: Created
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Invalid YAML in .*a\.yaml/
    );
  });

  it('rejects unexpected top-level keys inside module specs', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `openapi: 3.0.3
paths: {}
`,
      },
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false }),
      /Unexpected top-level key "openapi" in modules\/a\.yaml/
    );
  });

  it('fails check mode when bundled output is stale or missing', async () => {
    const fixture = await createFixture({
      modules: {
        'a.yaml': `paths:
  /ping:
    get:
      operationId: ping
      responses:
        '200':
          description: OK
`,
      },
      existingOutput: 'openapi: 3.0.3\n',
    });

    await assert.rejects(
      () => mergeOpenApi({ ...fixture, write: false, check: true }),
      /out of date/
    );
  });

  it('CLI --check exits cleanly on current repository bundle', async () => {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, '--check'], {
      cwd: repoRoot,
    });
    assert.match(stdout, /OpenAPI bundle is up to date \(11 modules/);
  });
});
