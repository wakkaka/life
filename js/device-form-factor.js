/**
 * Viewport landscape check: width > height.
 */

/**
 * Reads CSS viewport size, preferring visualViewport when present.
 *
 * @param {Window} [win]
 * @returns {{width: number, height: number}}
 */
function getViewportSize(win) {
  var target = win || window;
  var visual = target.visualViewport;

  // visualViewport tracks fold / split-view resizes more accurately than innerWidth.
  if (visual && visual.width && visual.height) {
    return { width: visual.width, height: visual.height };
  }

  return { width: target.innerWidth || 0, height: target.innerHeight || 0 };
}

/**
 * Returns true when the viewport is wider than it is tall.
 *
 * @param {Window} [win]
 * @returns {boolean}
 */
function isWidthGreaterThanHeight(win) {
  var size = getViewportSize(win || (typeof window !== 'undefined' ? window : { innerWidth: 0, innerHeight: 0 }));
  return size.width > size.height;
}

/**
 * Calls listener whenever the width > height result may have changed.
 *
 * @param {(isLandscape: boolean) => void} listener
 * @param {Window} [win]
 * @returns {function(): void} Unsubscribe function.
 */
function subscribeWidthGreaterThanHeight(listener, win) {
  var target = win || window;

  /**
   * Pushes the current comparison result.
   */
  function emit() {
    listener(isWidthGreaterThanHeight(target));
  }

  target.addEventListener('resize', emit);
  target.addEventListener('orientationchange', emit);
  if (target.visualViewport) {
    target.visualViewport.addEventListener('resize', emit);
  }

  emit();

  return function unsubscribe() {
    target.removeEventListener('resize', emit);
    target.removeEventListener('orientationchange', emit);
    if (target.visualViewport) {
      target.visualViewport.removeEventListener('resize', emit);
    }
  };
}

export { getViewportSize, isWidthGreaterThanHeight, subscribeWidthGreaterThanHeight };
