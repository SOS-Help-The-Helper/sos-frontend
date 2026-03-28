/**
 * Text measurement utilities using Pretext.
 * Provides pixel-perfect text sizing without DOM reflow.
 *
 * Pretext ships raw TypeScript — we dynamic-import to avoid type-check issues.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pretextModule: any = null;
let loadFailed = false;

async function getPretext() {
  if (loadFailed) return null;
  if (!pretextModule) {
    try {
      // Opaque string to prevent Turbopack from statically analyzing the import
      const pkg = '@chenglou/' + 'pretext';
      pretextModule = await (new Function('p', 'return import(p)'))(pkg);
    } catch {
      loadFailed = true;
      return null;
    }
  }
  return pretextModule;
}

/**
 * Measure text height for a given width.
 * Returns { height, lineCount } or null if measurement fails.
 */
export async function measureText(
  text: string,
  font: string = '16px Roboto, sans-serif',
  maxWidth: number = 320,
  lineHeight: number = 24
): Promise<{ height: number; lineCount: number } | null> {
  if (typeof window === 'undefined') return null; // SSR guard
  const pt = await getPretext();
  if (!pt) return null;
  try {
    const prepared = pt.prepare(text, font);
    return pt.layout(prepared, maxWidth, lineHeight);
  } catch {
    return null;
  }
}

/**
 * Get the tightest width that fits the text (shrink-wrap).
 * Useful for chat bubbles — find the widest line.
 */
export async function shrinkWrapWidth(
  text: string,
  font: string = '14px Roboto, sans-serif',
  maxWidth: number = 320,
  lineHeight: number = 20
): Promise<number> {
  if (typeof window === 'undefined') return maxWidth;
  const pt = await getPretext();
  if (!pt) return maxWidth;
  try {
    const prepared = pt.prepareWithSegments(text, font);
    let maxLineWidth = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pt.walkLineRanges(prepared, maxWidth, (line: any) => {
      if (line.width > maxLineWidth) maxLineWidth = line.width;
    });
    return Math.ceil(maxLineWidth);
  } catch {
    return maxWidth;
  }
}

/**
 * Auto-size text: returns the ideal font size to fit text in a container.
 * Tries sizes from max to min until it fits in maxLines.
 */
export async function autoFitFontSize(
  text: string,
  containerWidth: number,
  maxLines: number = 1,
  maxSize: number = 16,
  minSize: number = 10,
  fontFamily: string = 'Roboto, sans-serif'
): Promise<number> {
  if (typeof window === 'undefined') return maxSize;
  const pt = await getPretext();
  if (!pt) return maxSize;
  try {
    for (let size = maxSize; size >= minSize; size--) {
      const prepared = pt.prepare(text, `${size}px ${fontFamily}`);
      const result = pt.layout(prepared, containerWidth, size * 1.4);
      if (result.lineCount <= maxLines) return size;
    }
    return minSize;
  } catch {
    return maxSize;
  }
}

/**
 * Get lines for canvas/SVG rendering.
 */
export async function getTextLines(
  text: string,
  font: string = '14px Roboto, sans-serif',
  maxWidth: number = 320,
  lineHeight: number = 20
): Promise<Array<{ text: string; width: number }>> {
  if (typeof window === 'undefined') return [{ text, width: maxWidth }];
  const pt = await getPretext();
  if (!pt) return [{ text, width: maxWidth }];
  try {
    const prepared = pt.prepareWithSegments(text, font);
    const result = pt.layoutWithLines(prepared, maxWidth, lineHeight);
    return result.lines.map((l: any) => ({ text: l.text, width: l.width }));
  } catch {
    return [{ text, width: maxWidth }];
  }
}
