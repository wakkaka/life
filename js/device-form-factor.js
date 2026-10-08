/**
 * Device form-factor detection for foldables, wide screens, and iPhone Duo.
 *
 * Native APIs can tell you the CURRENT spanning / posture state. They cannot
 * reliably answer "is this hardware a foldable?" when the device is used as a
 * single flat screen. Safari does not implement Viewport Segments or Device
 * Posture, so iPhone Duo must be inferred from viewport shape.
 */

/** @type {number} Pixel slack for browser chrome / rounding on known devices. */
var IPHONE_DUO_SIZE_TOLERANCE = 24;

/**
 * Published iPhone Duo CSS viewports (points) at 3x DPR.
 * Folded cover: 466 x 678. Unfolded inner: 890 x 626 (already wider than tall).
 *
 * @type {Array<{id: string, shortEdge: number, longEdge: number, dpr: number}>}
 */
var IPHONE_DUO_PROFILES = [
  { id: 'folded', shortEdge: 466, longEdge: 678, dpr: 3 },
  { id: 'unfolded', shortEdge: 626, longEdge: 890, dpr: 3 }
];

/** Default aspect ratio used for "widescreen" (16:9). */
var DEFAULT_WIDE_ASPECT_RATIO = 16 / 9;

/**
 * Returns whether a value is within +/- tolerance of a target.
 *
 * @param {number} value
 * @param {number} target
 * @param {number} tolerance
 * @returns {boolean}
 */
function nearlyEqual(value, target, tolerance) {
  return Math.abs(value - target) <= tolerance;
}

/**
 * Reads the current CSS viewport size from a window-like object.
 *
 * @param {Window} [win]
 * @returns {{width: number, height: number}}
 */
function getViewportSize(win) {
  var target = win || (typeof window !== 'undefined' ? window : null);
  if (!target) {
    return { width: 0, height: 0 };
  }

  // Prefer visualViewport: it tracks fold / split-view resizes more accurately.
  var visual = target.visualViewport;
  if (visual && visual.width && visual.height) {
    return { width: Math.round(visual.width), height: Math.round(visual.height) };
  }

  return { width: target.innerWidth || 0, height: target.innerHeight || 0 };
}

/**
 * Collects viewport segments from current, legacy, and deprecated APIs.
 *
 * @param {Window} [win]
 * @returns {Array<{x: number, y: number, width: number, height: number}>}
 */
function getViewportSegments(win) {
  var target = win || (typeof window !== 'undefined' ? window : null);
  if (!target) {
    return [];
  }

  // Chrome 138+: window.viewport.segments
  if (target.viewport && Array.isArray(target.viewport.segments)) {
    return target.viewport.segments;
  }

  // Earlier Chromium / Surface Duo: visualViewport.segments
  if (target.visualViewport && Array.isArray(target.visualViewport.segments)) {
    return target.visualViewport.segments;
  }

  // Deprecated Surface Duo API
  if (typeof target.getWindowSegments === 'function') {
    return target.getWindowSegments();
  }

  return [];
}

/**
 * Returns the Device Posture type when the API exists.
 *
 * @param {Window} [win]
 * @returns {'folded'|'continuous'|null}
 */
function getDevicePosture(win) {
  var target = win || (typeof window !== 'undefined' ? window : null);
  var nav = target && target.navigator;
  if (!nav || !nav.devicePosture) {
    return null;
  }
  return nav.devicePosture.type || null;
}

/**
 * Heuristic: a coarse-pointer / touch environment is treated as mobile-like.
 * User-Agent is not used here because iPhone Duo still reports as iPhone.
 *
 * @param {Window} [win]
 * @returns {boolean}
 */
function isMobileLike(win) {
  var target = win || (typeof window !== 'undefined' ? window : null);
  if (!target || typeof target.matchMedia !== 'function') {
    return false;
  }

  // Primary signal: touch phone / tablet, not a mouse desktop.
  if (target.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    return true;
  }

  var nav = target.navigator;
  if (nav && (nav.maxTouchPoints > 0 || nav.msMaxTouchPoints > 0)) {
    return true;
  }

  return 'ontouchstart' in target;
}

/**
 * Returns whether the user agent looks like an iPhone (Duo still uses this UA).
 *
 * @param {Window} [win]
 * @returns {boolean}
 */
function isIphoneUserAgent(win) {
  var target = win || (typeof window !== 'undefined' ? window : null);
  var ua = target && target.navigator ? target.navigator.userAgent : '';
  return /iPhone/.test(ua);
}

/**
 * Matches a viewport against published iPhone Duo folded / unfolded sizes.
 * Comparison is orientation-independent (short vs long edge).
 *
 * @param {number} width
 * @param {number} height
 * @param {number} [devicePixelRatio]
 * @param {number} [tolerance]
 * @returns {{matched: boolean, profile: string|null, isLandscape: boolean}}
 */
function matchIphoneDuoViewport(width, height, devicePixelRatio, tolerance) {
  var shortEdge = Math.min(width, height);
  var longEdge = Math.max(width, height);
  var slack = tolerance == null ? IPHONE_DUO_SIZE_TOLERANCE : tolerance;
  var isLandscape = width > height;
  var i;

  for (i = 0; i < IPHONE_DUO_PROFILES.length; i++) {
    var profile = IPHONE_DUO_PROFILES[i];
    var sizeMatches =
      nearlyEqual(shortEdge, profile.shortEdge, slack) &&
      nearlyEqual(longEdge, profile.longEdge, slack);

    // DPR is a strong filter against a desktop window resized to a similar size.
    var dprMatches =
      devicePixelRatio == null || nearlyEqual(devicePixelRatio, profile.dpr, 0.15);

    if (sizeMatches && dprMatches) {
      return { matched: true, profile: profile.id, isLandscape: isLandscape };
    }
  }

  return { matched: false, profile: null, isLandscape: isLandscape };
}

/**
 * Detects a fold/hinge that currently splits the viewport into 2+ segments.
 *
 * @param {Array<{width: number, height: number}>} segments
 * @param {'folded'|'continuous'|null} posture
 * @param {{matchMedia?: Function}|null} [media]
 * @returns {{spanning: boolean, foldedPosture: boolean, segmentCount: number, source: string}}
 */
function classifyFoldableState(segments, posture, media) {
  var segmentCount = Array.isArray(segments) ? segments.length : 0;
  var spanning = segmentCount > 1;
  var foldedPosture = posture === 'folded';
  var source = 'none';

  if (spanning) {
    source = 'viewport-segments';
  } else if (foldedPosture) {
    source = 'device-posture';
  } else if (media && typeof media.matchMedia === 'function') {
    // CSS fallbacks used by Chromium foldables and older Surface Duo builds.
    var spanningMedia =
      media.matchMedia('(horizontal-viewport-segments: 2)').matches ||
      media.matchMedia('(vertical-viewport-segments: 2)').matches ||
      media.matchMedia('(device-posture: folded)').matches;
    if (spanningMedia) {
      spanning = true;
      source = 'css-media';
    }
  }

  return {
    spanning: spanning,
    foldedPosture: foldedPosture,
    segmentCount: spanning ? Math.max(segmentCount, 2) : Math.max(segmentCount, 1),
    source: source
  };
}

/**
 * Classifies a viewport as landscape / widescreen without device APIs.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} [minWideAspectRatio]
 * @returns {{isLandscape: boolean, isWideScreen: boolean, aspectRatio: number}}
 */
function classifyWideViewport(width, height, minWideAspectRatio) {
  var ratio = height === 0 ? 0 : width / height;
  var threshold = minWideAspectRatio == null ? DEFAULT_WIDE_ASPECT_RATIO : minWideAspectRatio;

  return {
    isLandscape: width > height,
    isWideScreen: ratio >= threshold,
    aspectRatio: ratio
  };
}

/**
 * Builds a snapshot of foldable / wide / iPhone Duo signals for a window.
 *
 * @param {Window} [win]
 * @param {{minWideAspectRatio?: number, duoTolerance?: number}} [options]
 * @returns {object}
 */
function detectDeviceFormFactor(win, options) {
  var target = win || (typeof window !== 'undefined' ? window : null);
  var opts = options || {};
  var size = getViewportSize(target);
  var segments = getViewportSegments(target);
  var posture = getDevicePosture(target);
  var mobile = isMobileLike(target);
  var dpr = target && target.devicePixelRatio ? target.devicePixelRatio : 1;
  var foldable = classifyFoldableState(segments, posture, target);
  var wide = classifyWideViewport(size.width, size.height, opts.minWideAspectRatio);
  var duoMatch = matchIphoneDuoViewport(
    size.width,
    size.height,
    dpr,
    opts.duoTolerance
  );

  // Duo UA is identical to a regular iPhone; require mobile + iPhone UA + size.
  var isIphoneDuo =
    duoMatch.matched &&
    mobile &&
    (isIphoneUserAgent(target) || dpr >= 2.5);

  return {
    width: size.width,
    height: size.height,
    aspectRatio: Number(wide.aspectRatio.toFixed(3)),
    devicePixelRatio: dpr,
    isMobileLike: mobile,
    isLandscapeMobile: mobile && wide.isLandscape,
    // Widescreen is an aspect-ratio signal, not a device class.
    isWideScreen: wide.isWideScreen,
    isFoldableSpanning: foldable.spanning,
    isFoldedPosture: foldable.foldedPosture,
    foldableSource: foldable.source,
    segmentCount: foldable.segmentCount,
    segments: segments,
    isIphoneDuo: isIphoneDuo,
    iphoneDuoProfile: isIphoneDuo ? duoMatch.profile : null,
    isIphoneDuoLandscape: isIphoneDuo && wide.isLandscape
  };
}

/**
 * Subscribes to resize, visualViewport, and posture changes.
 *
 * @param {(snapshot: object) => void} listener
 * @param {Window} [win]
 * @param {{minWideAspectRatio?: number, duoTolerance?: number}} [options]
 * @returns {function(): void} Unsubscribe function.
 */
function subscribeDeviceFormFactor(listener, win, options) {
  var target = win || window;

  /**
   * Pushes a fresh snapshot to the caller.
   */
  function emit() {
    listener(detectDeviceFormFactor(target, options));
  }

  target.addEventListener('resize', emit);
  target.addEventListener('orientationchange', emit);

  if (target.visualViewport) {
    target.visualViewport.addEventListener('resize', emit);
  }

  if (target.navigator && target.navigator.devicePosture) {
    target.navigator.devicePosture.addEventListener('change', emit);
  }

  emit();

  return function unsubscribe() {
    target.removeEventListener('resize', emit);
    target.removeEventListener('orientationchange', emit);
    if (target.visualViewport) {
      target.visualViewport.removeEventListener('resize', emit);
    }
    if (target.navigator && target.navigator.devicePosture) {
      target.navigator.devicePosture.removeEventListener('change', emit);
    }
  };
}

export {
  IPHONE_DUO_PROFILES,
  IPHONE_DUO_SIZE_TOLERANCE,
  DEFAULT_WIDE_ASPECT_RATIO,
  getViewportSize,
  getViewportSegments,
  getDevicePosture,
  isMobileLike,
  matchIphoneDuoViewport,
  classifyFoldableState,
  classifyWideViewport,
  detectDeviceFormFactor,
  subscribeDeviceFormFactor
};
