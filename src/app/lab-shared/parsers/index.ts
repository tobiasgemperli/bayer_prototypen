// Deterministic lab-report parsers — client-side (in-browser) router.
// One parser per lab template; the first whose detect() matches wins, and an
// unrecognized report is rejected rather than parsed into confident garbage.
import { Doc, ParseResult } from './core';
import * as aqua from './aqua';
import * as eurofins from './eurofins';
import * as orangedata from './orangedata';

export * from './core';

const PARSERS = [aqua, eurofins, orangedata];

export function route(doc: Doc): ParseResult {
  for (const p of PARSERS) if (p.detect(doc)) return p.parse(doc);
  throw new Error(`No parser matches this report (producer=${doc.producer || '?'})`);
}
