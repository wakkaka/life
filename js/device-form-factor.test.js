/**
 * Node tests for the pure classification helpers in device-form-factor.js.
 */
import {
  matchIphoneDuoViewport,
  classifyFoldableState,
  classifyWideViewport,
  detectDeviceFormFactor
} from './device-form-factor.js';

var failed = 0;

/**
 * Asserts that actual equals expected and records failures.
 *
 * @param {string} name
 * @param {*} actual
 * @param {*} expected
 */
function assertEqual(name, actual, expected) {
  var actualText = JSON.stringify(actual);
  var expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    failed += 1;
    console.error('FAIL ' + name + '\n  expected ' + expectedText + '\n  actual   ' + actualText);
    return;
  }
  console.log('PASS ' + name);
}

var duoUnfolded = matchIphoneDuoViewport(890, 626, 3);
assertEqual('duo unfolded landscape', duoUnfolded, {
  matched: true,
  profile: 'unfolded',
  isLandscape: true
});

var duoFolded = matchIphoneDuoViewport(466, 678, 3);
assertEqual('duo folded portrait', duoFolded, {
  matched: true,
  profile: 'folded',
  isLandscape: false
});

var duoFoldedLandscape = matchIphoneDuoViewport(678, 466, 3);
assertEqual('duo folded landscape (width > height)', duoFoldedLandscape, {
  matched: true,
  profile: 'folded',
  isLandscape: true
});

assertEqual(
  'regular iPhone is not Duo',
  matchIphoneDuoViewport(393, 852, 3).matched,
  false
);

assertEqual(
  'desktop-sized window is not Duo',
  matchIphoneDuoViewport(890, 626, 1).matched,
  false
);

var spanning = classifyFoldableState(
  [{ width: 400, height: 600 }, { width: 400, height: 600 }],
  'continuous',
  null
);
assertEqual('segments > 1 is spanning', spanning.spanning, true);
assertEqual('segments source', spanning.source, 'viewport-segments');

var foldedOnly = classifyFoldableState([{ width: 800, height: 600 }], 'folded', null);
assertEqual('folded posture without segments', foldedOnly.foldedPosture, true);
assertEqual('folded posture is not spanning by itself', foldedOnly.spanning, false);

var flatPhone = classifyFoldableState([{ width: 390, height: 844 }], 'continuous', null);
assertEqual('flat phone is not foldable', flatPhone.spanning, false);

var landscapePhone = classifyWideViewport(844, 390);
assertEqual('landscape width > height', landscapePhone.isLandscape, true);
assertEqual('16:9 landscape is widescreen', landscapePhone.isWideScreen, true);

var duoInner = classifyWideViewport(890, 626);
assertEqual('duo unfolded is landscape', duoInner.isLandscape, true);
assertEqual('duo unfolded is not 16:9 widescreen', duoInner.isWideScreen, false);

var portraitPhone = classifyWideViewport(390, 844);
assertEqual('portrait is not landscape', portraitPhone.isLandscape, false);
assertEqual('portrait is not widescreen', portraitPhone.isWideScreen, false);

/**
 * Builds a minimal window-like object for detectDeviceFormFactor.
 *
 * @param {object} overrides
 * @returns {object}
 */
function mockWindow(overrides) {
  var base = {
    innerWidth: 390,
    innerHeight: 844,
    devicePixelRatio: 3,
    visualViewport: null,
    viewport: null,
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      maxTouchPoints: 5,
      devicePosture: null
    },
    matchMedia: function (query) {
      return { matches: query === '(hover: none) and (pointer: coarse)' };
    }
  };
  var result = Object.assign({}, base, overrides);
  if (overrides.navigator) {
    result.navigator = Object.assign({}, base.navigator, overrides.navigator);
  }
  return result;
}

var duoSnapshot = detectDeviceFormFactor(mockWindow({
  innerWidth: 890,
  innerHeight: 626
}));
assertEqual('detect duo landscape mobile', duoSnapshot.isIphoneDuoLandscape, true);
assertEqual('detect duo profile', duoSnapshot.iphoneDuoProfile, 'unfolded');
assertEqual('duo inner is landscape mobile', duoSnapshot.isLandscapeMobile, true);
assertEqual('duo inner is not 16:9 widescreen', duoSnapshot.isWideScreen, false);

var desktopWide = detectDeviceFormFactor(mockWindow({
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 1,
  navigator: { userAgent: 'Mozilla/5.0', maxTouchPoints: 0 },
  matchMedia: function () {
    return { matches: false };
  }
}));
assertEqual('desktop 16:9 is widescreen', desktopWide.isWideScreen, true);
assertEqual('desktop is not landscape mobile', desktopWide.isLandscapeMobile, false);

var spanningSnapshot = detectDeviceFormFactor(mockWindow({
  innerWidth: 800,
  innerHeight: 600,
  viewport: {
    segments: [
      { x: 0, y: 0, width: 390, height: 600 },
      { x: 410, y: 0, width: 390, height: 600 }
    ]
  }
}));
assertEqual('detect spanning foldable', spanningSnapshot.isFoldableSpanning, true);
assertEqual('detect segment count', spanningSnapshot.segmentCount, 2);

var cssFallback = classifyFoldableState(
  [{ width: 800, height: 600 }],
  'continuous',
  {
    matchMedia: function (query) {
      return { matches: query === '(horizontal-viewport-segments: 2)' };
    }
  }
);
assertEqual('css media fallback marks spanning', cssFallback.spanning, true);
assertEqual('css media fallback source', cssFallback.source, 'css-media');

if (failed > 0) {
  console.error('\n' + failed + ' test(s) failed');
  process.exit(1);
}

console.log('\nAll tests passed');
