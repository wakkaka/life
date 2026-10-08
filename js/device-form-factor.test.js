/**
 * Tests for the width > height viewport check.
 */
import { getViewportSize, isWidthGreaterThanHeight } from './device-form-factor.js';

var failed = 0;

/**
 * Asserts that actual equals expected and records failures.
 *
 * @param {string} name
 * @param {*} actual
 * @param {*} expected
 */
function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    failed += 1;
    console.error('FAIL ' + name + ': expected ' + expected + ', actual ' + actual);
    return;
  }
  console.log('PASS ' + name);
}

assertEqual('landscape inner size', isWidthGreaterThanHeight({ innerWidth: 890, innerHeight: 626 }), true);
assertEqual('portrait inner size', isWidthGreaterThanHeight({ innerWidth: 466, innerHeight: 678 }), false);
assertEqual('square is not width > height', isWidthGreaterThanHeight({ innerWidth: 600, innerHeight: 600 }), false);
assertEqual(
  'prefers visualViewport',
  isWidthGreaterThanHeight({
    innerWidth: 390,
    innerHeight: 844,
    visualViewport: { width: 844, height: 390 }
  }),
  true
);

var size = getViewportSize({ innerWidth: 890, innerHeight: 626 });
assertEqual('reports width', size.width, 890);
assertEqual('reports height', size.height, 626);

if (failed > 0) {
  console.error('\n' + failed + ' test(s) failed');
  process.exit(1);
}

console.log('\nAll tests passed');
