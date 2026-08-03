const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function indexPagesIn(directory) {
  const absoluteDirectory = path.join(root, directory);

  return fs
    .readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name, "index.html"))
    .filter((file) => fs.existsSync(path.join(root, file)));
}

function pngDimensions(file) {
  const image = fs.readFileSync(path.join(root, file));
  const signature = image.subarray(0, 8).toString("hex");

  assert.equal(signature, "89504e470d0a1a0a", `${file} is not a PNG`);

  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
  };
}

test("every published page uses the same favicon family", () => {
  const pages = [
    "index.html",
    "index_v_mario.html",
    "resume.html",
    "projects/ai-agent-gateway-redacted/index.html",
    "projects/ai-contact-center-matching-redacted/index.html",
    "projects/anime-pics/index.html",
    "projects/event-bus/index.html",
    ...indexPagesIn("writing"),
  ];

  const expectedLinks = [
    /<link rel="icon" href="\/favicon\.ico\?v=6" sizes="any"\s*\/?\s*>/g,
    /<link rel="icon" type="image\/svg\+xml" href="\/assets\/brand\/ek-v3-mark\.svg\?v=6"\s*\/?\s*>/g,
    /<link rel="icon" type="image\/png" href="\/assets\/brand\/ek-v3-icon-32\.png\?v=6" sizes="32x32"\s*\/?\s*>/g,
    /<link rel="apple-touch-icon" href="\/assets\/brand\/ek-v3-apple-touch-icon\.png\?v=6"\s*\/?\s*>/g,
  ];

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");

    for (const expectedLink of expectedLinks) {
      assert.equal(html.match(expectedLink)?.length, 1, `${page} has inconsistent favicon markup`);
    }
  }
});

test("the root fallback is byte-for-byte identical to the branded ICO", () => {
  const rootIcon = fs.readFileSync(path.join(root, "favicon.ico"));
  const brandedIcon = fs.readFileSync(path.join(root, "assets/brand/ek-v3-favicon.ico"));

  assert.deepEqual(rootIcon, brandedIcon);

  const imageCount = rootIcon.readUInt16LE(4);
  const sizes = Array.from({ length: imageCount }, (_, index) => {
    const width = rootIcon.readUInt8(6 + index * 16);
    return width === 0 ? 256 : width;
  });

  assert.deepEqual(sizes.sort((a, b) => a - b), [16, 32, 48]);
});

test("generated PNG fallbacks have the declared dimensions", () => {
  assert.deepEqual(pngDimensions("assets/brand/ek-v3-icon-32.png"), { width: 32, height: 32 });
  assert.deepEqual(pngDimensions("assets/brand/ek-v3-apple-touch-icon.png"), { width: 180, height: 180 });
  assert.deepEqual(pngDimensions("assets/brand/ek-v3-icon-192.png"), { width: 192, height: 192 });
  assert.deepEqual(pngDimensions("assets/brand/ek-v3-icon-512.png"), { width: 512, height: 512 });
});

test("v3 preserves the v1 lettering and only nudges it right", () => {
  const v1Mark = fs.readFileSync(path.join(root, "assets/brand/ek-v1-mark.svg"), "utf8");
  const v3Mark = fs.readFileSync(path.join(root, "assets/brand/ek-v3-mark.svg"), "utf8");
  const v1Preview = fs.readFileSync(path.join(root, "assets/brand/ek-v1-social-preview.svg"), "utf8");
  const v3Preview = fs.readFileSync(path.join(root, "assets/brand/ek-v3-social-preview.svg"), "utf8");
  const paths = (svg) => [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(paths(v3Mark), paths(v1Mark));
  assert.deepEqual(paths(v3Preview), paths(v1Preview));
  assert.match(v1Mark, /translate\(-25 0\)/);
  assert.match(v3Mark, /translate\(-17 0\)/);
  assert.match(v1Preview, /translate\(206 -43\) scale\(1\.4\)/);
  assert.match(v3Preview, /translate\(206\.6 -43\) scale\(1\.4\)/);
});
