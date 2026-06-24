// Optimise pizza images to web-friendly sizes
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const SRC_DIR = "/home/z/my-project/public/images";
const OUT_DIR = "/home/z/my-project/public/images";

async function main() {
  const files = (await fs.readdir(SRC_DIR)).filter((f) => f.endsWith(".png"));
  console.log(`Found ${files.length} PNGs`);

  for (const file of files) {
    const src = path.join(SRC_DIR, file);
    const out = path.join(OUT_DIR, file.replace(/\.png$/, ".webp"));
    const outFallback = path.join(OUT_DIR, file);

    const img = sharp(src);
    const meta = await img.metadata();
    const isLogo = file.includes("logo");
    const targetWidth = isLogo ? 600 : 800;

    // Save webp (preferred)
    await img
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: isLogo ? 90 : 80 })
      .toFile(out);

    // Save downsized png (fallback) — write to temp then rename
    const tmpPng = outFallback + ".tmp.png";
    await sharp(src)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(tmpPng);
    await fs.rename(tmpPng, outFallback);

    const origSize = (await fs.stat(src)).size;
    const newSize = (await fs.stat(out)).size;
    const pngSize = (await fs.stat(outFallback)).size;
    console.log(
      `${file}: ${meta.width}x${meta.height} → ${targetWidth}w | orig ${(origSize / 1024).toFixed(0)}KB → webp ${(newSize / 1024).toFixed(0)}KB, png ${(pngSize / 1024).toFixed(0)}KB`
    );
  }
  console.log("✅ Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
