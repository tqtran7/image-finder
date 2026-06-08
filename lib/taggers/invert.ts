import sharp from "sharp";

/**
 * Inverts an image's RGB channels while preserving transparency, returning PNG bytes.
 *
 * Used for auto-tagging white/light artwork on a transparent background: vision models
 * render transparency as white, so a white-on-transparent image reads as all-white and
 * is invisible. Inverting turns it into a dark shape on transparent, which the model can
 * actually see. `alpha: false` keeps the alpha channel untouched.
 */
export async function invertImage(buf: Buffer): Promise<Buffer> {
  return sharp(buf).negate({ alpha: false }).png().toBuffer();
}

/**
 * Composites the image onto a solid black background, removing transparency.
 *
 * White/light shapes on a transparent background become clearly visible on black,
 * since the vision model would otherwise render transparency as white — making
 * white-on-transparent artwork invisible.
 */
export async function flattenToBlack(buf: Buffer): Promise<Buffer> {
  return sharp(buf).flatten({ background: { r: 0, g: 0, b: 0 } }).png().toBuffer();
}
