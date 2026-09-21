#!/usr/bin/env node
// Validates the delivery-owned keys of .devbook/config.json against
// resources/config.schema.json, and merges the gitignored overlays over it — up to three,
// applied in this order, each optional and absent by default:
//
//   <config dir>/config.local.json               this user, every repository
//   <config dir>/repos/<id>/config.local.json    this user, the repository `id` names
//   .devbook/config.local.json                   this checkout
//
// where <config dir> is $XDG_CONFIG_HOME/devbook when that variable is set, else
// %APPDATA%\devbook on Windows and ~/.config/devbook elsewhere. The first two survive a
// fresh worktree, which is what they are for; the last is found beside the committed file,
// never passed separately, because one config has one checkout overlay and naming them
// independently invites checking a pair that never meet at run time.
//
// An unknown key is an error, not a warning: a typo must never become a silently absent
// setting. That holds at the top level too: `components` is the one committed key the engine
// does not own, each component validating its own entry there, and `ext` is its machine-scope
// counterpart — `ext.<plugin>.<key>`, accepted in an overlay only, carried through the merge
// untouched and read by the plugin that owns the namespace, never by the engine. A top-level
// key that is none of these is a misspelling of one of them and is reported by name.
//
//   node check.mjs [path-to-config.json]
//
// Exit 0 when the files are valid or absent, 1 when they are not.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(HERE, '..', '..', 'resources', 'config.schema.json');

// What an overlay may not say. The committed file describes what this repository
// produces; an overlay describes how one machine runs it, and these four are the first
// kind wearing the second's clothes. Personal Validation is already `const` in the schema
// and is listed anyway, so the refusal names the invariant rather than a type error.
const LOCKED = [
    'policy.gate.personalValidation',
    'policy.pr.required',
    'policy.qa.ceiling',
];

/** Resolve a local `#/...` pointer against the schema root. */
function deref(node, root) {
    let seen = 0;
    while (node && node.$ref) {
        if (++seen > 20) throw new Error(`circular $ref at ${node.$ref}`);
        node = node.$ref.split('/').slice(1).reduce((acc, part) => acc?.[part], root);
    }
    return node;
}

function typeOf(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (Number.isInteger(value)) return 'integer';
    return typeof value;
}

function matchesType(value, expected) {
    const actual = typeOf(value);
    const allowed = Array.isArray(expected) ? expected : [expected];
    return allowed.some((t) => t === actual || (t === 'number' && actual === 'integer'));
}

/** Validate `value` against `schema`, appending human-readable problems to `errors`. */
function validate(value, schema, root, path, errors) {
    schema = deref(schema, root);
    if (!schema) return true;

    if (schema.oneOf) {
        const matched = schema.oneOf.some((branch) => validate(value, branch, root, path, []));
        if (!matched) errors.push(`${path}: no allowed shape matches ${JSON.stringify(value)}`);
        return matched;
    }

    const before = errors.length;

    if (schema.const !== undefined && value !== schema.const) {
        errors.push(`${path}: must be ${JSON.stringify(schema.const)}`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`${path}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
    }
    if (schema.type && !matchesType(value, schema.type)) {
        errors.push(`${path}: expected ${[schema.type].flat().join(' or ')}, got ${typeOf(value)}`);
        return errors.length === before;
    }
    if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
        // A `title` names the shape in words. Say that instead of the regex where one exists:
        // the point of the message is that the author can see what to write.
        errors.push(
            schema.title
                ? `${path}: ${JSON.stringify(value)} is not ${schema.title}`
                : `${path}: ${JSON.stringify(value)} does not match ${schema.pattern}`,
        );
    }
    if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
        errors.push(`${path}: must be at least ${schema.minimum}`);
    }
    if (schema.minLength !== undefined && typeof value === 'string' && value.length < schema.minLength) {
        errors.push(`${path}: must not be empty`);
    }

    if (typeOf(value) === 'object') {
        for (const key of schema.required ?? []) {
            if (!(key in value)) errors.push(`${path}: missing required key "${key}"`);
        }
        for (const [key, child] of Object.entries(value)) {
            const childSchema = schema.properties?.[key];
            if (childSchema) {
                validate(child, childSchema, root, `${path}.${key}`, errors);
            } else if (schema.additionalProperties === false) {
                errors.push(`${path}: unknown key "${key}"`);
            } else if (schema.additionalProperties) {
                validate(child, schema.additionalProperties, root, `${path}.${key}`, errors);
            }
        }
    }

    if (typeOf(value) === 'array' && schema.items) {
        value.forEach((item, i) => validate(item, schema.items, root, `${path}[${i}]`, errors));
    }

    return errors.length === before;
}

/**
 * Which top-level keys the engine owns — read from the schema rather than restated here, so
 * a key added to one is never missing from the other.
 */
function ownedKeys(schema) {
    return Object.keys(schema.properties ?? {});
}

/**
 * A `$`-prefixed key is a JSON annotation — `$schema`, and the `$comment` the template ships.
 * It belongs to nobody and configures nothing, so it is neither owned nor unknown.
 */
function isAnnotation(key) {
    return key.startsWith('$');
}

/**
 * `ext` is opaque to the engine: one object per owning plugin, each read by that plugin
 * alone. The only shape checked is the one that makes it addressable — an object of
 * objects — so a namespace nobody installed stays inert and a scalar at the top is caught.
 */
function checkExt(ext, errors) {
    if (!isPlainObject(ext)) {
        errors.push(`ext: expected an object keyed by plugin name, got ${typeOf(ext)}`);
        return;
    }
    for (const [plugin, keys] of Object.entries(ext)) {
        if (!isPlainObject(keys)) {
            errors.push(`ext.${plugin}: expected an object of that plugin's keys, got ${typeOf(keys)}`);
        }
    }
}

/**
 * Validate one layer. `overlay: true` is what an overlay gets and the committed file does
 * not: `ext` is a machine's own state and has no place in a file a reviewer reads.
 */
export function checkStackConfig(config, schema, { overlay = false } = {}) {
    const errors = [];
    const owned = ownedKeys(schema);

    for (const key of owned) {
        if (key in config) validate(config[key], schema.properties[key], schema, key, errors);
    }

    if ('ext' in config) {
        if (overlay) checkExt(config.ext, errors);
        else {
            errors.push(
                'ext: machine-scope, so it belongs in an overlay and never in the committed ' +
                    'config. Move it to config.local.json at whichever layer is true of it.',
            );
        }
    }

    // Ownership, not a closed list: a component's entry lives under `components`, its
    // machine-scope state under `ext`, so anything else at this level is a misspelling.
    // Matching on "not owned and not one of the two" keeps every component working without
    // the engine knowing any of their names.
    for (const key of Object.keys(config)) {
        if (owned.includes(key) || key === 'components' || key === 'ext' || isAnnotation(key)) continue;
        errors.push(
            `unknown top-level key "${key}": the engine owns ${owned.join(', ')}, a ` +
                'component owns its own entry under `components` and its machine-scope state ' +
                'under `ext` in an overlay. Nothing reads this one.',
        );
    }

    return errors;
}

function isPlainObject(value) {
    return typeOf(value) === 'object';
}

/**
 * What an overlay is forbidden from saying, independent of whether it is well-typed.
 * Returns human-readable refusals; an empty array means the overlay is allowed to apply.
 */
export function checkLocalOverlay(local) {
    const errors = [];

    if ('components' in local) {
        errors.push(
            'components: a stamp is repo-scope and committed, and an overlay is neither. ' +
                "Remove it — the owning component's install skill writes it.",
        );
    }

    if ('id' in local) {
        errors.push(
            'id: names the repository, and is what found this overlay in the first place. ' +
                'It is set in the committed config or not at all.',
        );
    }

    for (const locked of LOCKED) {
        const [top, ...rest] = locked.split('.');
        const key = rest.join('.');
        if (isPlainObject(local[top]) && key in local[top]) {
            errors.push(
                `${locked}: locked. It describes what this repository produces, not how one ` +
                    'machine runs it, so it is set in the committed config or not at all.',
            );
        }
    }

    return errors;
}

/**
 * Merge an overlay over the config beneath it.
 *
 * Objects merge key by key and the overlay wins. Arrays replace wholesale rather than
 * concatenating, because an extension point's chore list is an ordered whole and half of
 * one from each file is a run nobody wrote down. `gates` is the deliberate exception: it
 * appends, so an overlay can add a checkpoint and has no way of spelling the removal of
 * one. `null` in an overlay is a value — deliberately unbound — and never a delete.
 *
 * The same rules apply at every layer, so `layers.reduce(mergeStackConfig, base)` is the
 * whole merge and no layer can undo what the one beneath it said about gates.
 */
export function mergeStackConfig(base, local) {
    const merged = { ...base };

    for (const [key, value] of Object.entries(local)) {
        if (key === 'gates') {
            merged.gates = [...(base.gates ?? []), ...(value ?? [])];
        } else if (isPlainObject(value) && isPlainObject(base[key])) {
            merged[key] = mergeStackConfig(base[key], value);
        } else {
            merged[key] = value;
        }
    }

    return merged;
}

/**
 * Where this user's devbook config lives. `XDG_CONFIG_HOME` wins on every platform when it
 * is set; otherwise Windows uses `%APPDATA%` and everything else `~/.config`, which is the
 * XDG default. Host-neutral on purpose: the reader of these files is this script, and
 * Copilot runs it as readily as Claude does.
 */
export function userConfigDir({ env = process.env, platform = process.platform, home = homedir() } = {}) {
    if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, 'devbook');
    if (platform === 'win32' && env.APPDATA) return join(env.APPDATA, 'devbook');
    return join(home, '.config', 'devbook');
}

/** `.devbook/config.json` -> `.devbook/config.local.json`. */
function localSiblingOf(path) {
    return join(dirname(path), basename(path).replace(/\.json$/, '.local.json'));
}

/**
 * Every overlay that applies to the config at `target`, outermost first — the order they
 * merge in, so the later a layer the more it wins. The repository layer exists only when
 * the committed file carries an `id`: a machine cannot key a folder on a name the
 * repository never chose.
 */
export function overlayPaths(target, id, options) {
    const user = userConfigDir(options);
    const layers = [{ scope: 'user', path: join(user, 'config.local.json') }];
    if (id) layers.push({ scope: 'repository', path: join(user, 'repos', id, 'config.local.json') });
    layers.push({ scope: 'checkout', path: localSiblingOf(target) });
    return layers;
}

/** Read and parse one config file. Returns null when absent, throws on bad JSON. */
function readConfig(path) {
    if (!existsSync(path)) return null;
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        throw new Error(`${path}: not valid JSON — ${error.message}`);
    }
}

function report(label, errors) {
    console.error(`${label}: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  ${error}`);
}

function main() {
    const target = resolve(process.argv[2] ?? join('.devbook', 'config.json'));
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

    let config;
    let layers;
    try {
        config = readConfig(target);
        layers = overlayPaths(target, typeof config?.id === 'string' ? config.id : null)
            .map((layer) => ({ ...layer, overlay: readConfig(layer.path) }))
            .filter((layer) => layer.overlay !== null);
    } catch (error) {
        console.error(error.message);
        return 1;
    }

    if (config === null) {
        // A user-scope overlay applies to every repository, including one that keeps no
        // stack config; only the checkout's own overlay is an orphan without one.
        const orphan = layers.find((layer) => layer.scope === 'checkout');
        if (orphan) {
            console.error(
                `${orphan.path}: an overlay with nothing under it. Write ${target} first — the ` +
                    "overlay adjusts a repository's wiring and cannot stand in for it.",
            );
            return 1;
        }
        console.log(`no stack config at ${target} — every point falls back to its default`);
        return 0;
    }

    let failed = false;

    const errors = checkStackConfig(config, schema);
    if (errors.length) {
        report(target, errors);
        failed = true;
    } else {
        console.log(`${target}: ok`);
    }

    // Each overlay is checked three times over: what it may not say, whether it is
    // well-typed on its own, and whether what it produces still validates. The third
    // catches the pair that is only wrong together, and runs after every layer so the
    // report names the layer that broke it. The merged result is an overlay's shape, not the
    // committed file's: it may carry `ext`.
    let merged = config;
    for (const { scope, path, overlay } of layers) {
        const localErrors = [...checkLocalOverlay(overlay), ...checkStackConfig(overlay, schema, { overlay: true })];
        if (localErrors.length) {
            report(path, localErrors);
            return 1;
        }
        console.log(`${path}: ok (${scope} overlay)`);

        merged = mergeStackConfig(merged, overlay);
        const mergedErrors = checkStackConfig(merged, schema, { overlay: true });
        if (mergedErrors.length) {
            report(`${target} + ${scope} overlay`, mergedErrors);
            return 1;
        }
    }
    if (layers.length) console.log('merged: ok');

    return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
    process.exit(main());
}
