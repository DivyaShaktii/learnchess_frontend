const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: true}}).outputText, file);
const {getRandomRoast, getRoastCategoryForMove, ROAST_CATEGORIES} = require('./src/data/roastDialogues.ts');
const {roastForMove} = require('./src/utils/roastContext.ts');
const {Chess} = require('chess.js');
assert.equal(getRoastCategoryForMove('Best', 0, true), 'BRILLIANT_MOVES');
assert.equal(getRoastCategoryForMove('Blunder', 900, true), 'MAJOR_BLUNDERS');
for (const [category, lines] of Object.entries(ROAST_CATEGORIES)) {
  assert.ok(lines.length >= 12);
  const recent = [];
  for (let i = 0; i < 100; i++) {
    const line = getRandomRoast(category);
    assert.ok(!recent.includes(line), category + ' repeats within last five');
    recent.push(line); if (recent.length > 5) recent.shift();
  }
}
const fen = new Chess().fen();
assert.match(roastForMove({fen, move:'e2e4', label:'Good', cpLoss:0}), /Center pawn/);
assert.match(roastForMove({fen, move:'g1h3', label:'Inaccuracy', cpLoss:30}), /Knight on the rim/);
assert.match(roastForMove({fen, move:'h2h4', label:'Inaccuracy', cpLoss:30}), /flank pawn/);
assert.ok(ROAST_CATEGORIES.BRILLIANT_MOVES.includes(roastForMove({fen, move:'e2e4', label:'Best', cpLoss:0})));
assert.ok(ROAST_CATEGORIES.GOOD_MOVES.includes(roastForMove({fen:'bad fen', move:'x', label:'Good'})));
assert.match(roastForMove({fen:'4k3/8/8/3p4/8/8/4Q3/4K3 w - - 0 10', move:'e2e4', label:'Blunder', cpLoss:900, reply:'d5e4'}), /wins your queen/);
assert.match(roastForMove({fen:'4k3/8/8/8/8/8/8/R3K2R w KQ - 0 10', move:'e1g1', label:'Good', cpLoss:0}), /Castled/);
assert.match(roastForMove({fen:'4k3/8/8/8/8/8/4P3/4K3 w - - 0 2', move:'e1f1', label:'Inaccuracy', cpLoss:30}), /King out early/);
console.log('PASS: category priority, context selection, invalid-position fallback, and 1,300 non-repeat draws');
