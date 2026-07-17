const assert = require("node:assert/strict");
const test = require("node:test");
const spec = require("../js/mario-level-spec.js");

function coordinatesFor(character) {
  const coordinates = [];
  spec.rows.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile === character) coordinates.push([x, y]);
    });
  });
  return coordinates;
}

test("uses the canonical 202 by 14 World 1-1 corpus geometry", () => {
  assert.equal(spec.rows.length, spec.height);
  assert.deepEqual([...new Set(spec.rows.map((row) => row.length))], [spec.width]);
  assert.deepEqual(spec.floorGaps, [
    [69, 70],
    [86, 88],
    [153, 154],
  ]);
  assert.deepEqual(coordinatesFor("<"), [
    [46, 9],
    [57, 9],
    [38, 10],
    [28, 11],
    [163, 11],
    [179, 11],
  ]);
  assert.deepEqual(coordinatesFor("E"), spec.enemies.map(({ x, y }) => [x, y]).sort((a, b) => a[1] - b[1] || a[0] - b[0]));
});

test("career sections are ordered, contiguous, and span the level", () => {
  assert.equal(spec.careerSections[0].start, 7);
  assert.equal(spec.careerSections.at(-1).end, spec.width);
  for (let index = 1; index < spec.careerSections.length; index += 1) {
    assert.equal(spec.careerSections[index - 1].end, spec.careerSections[index].start);
  }
});

test("career HUD transitions occur at their signs", () => {
  for (const section of spec.careerSections.slice(1)) {
    assert.equal(section.start, section.signX, `${section.label} must begin at its sign`);
  }
});

test("career signs have breathing room without changing content boundaries", () => {
  for (let index = 1; index < spec.careerSections.length; index += 1) {
    const distance = spec.careerSections[index].signX - spec.careerSections[index - 1].signX;
    assert.ok(distance >= 15, `${spec.careerSections[index].label} sign is only ${distance} tiles from the previous sign`);
  }
});

test("every career note is attached to a real question block in its company section", () => {
  for (const [coordinate, noteKey] of Object.entries(spec.questionNotes)) {
    const [x, y] = coordinate.split(",").map(Number);
    assert.match(spec.rows[y][x], /[?Q]/, `${coordinate} must be a question block`);
    const section = spec.careerSections.find((candidate) => x >= candidate.start && x < candidate.end);
    assert.ok(section, `${coordinate} must belong to a career section`);
    assert.ok(section.noteKeys.includes(noteKey), `${noteKey} at ${coordinate} must belong to ${section.label}`);
  }
});

test("hiQ and Curology content cannot leak across their boundary", () => {
  const hiq = spec.careerSections.find(({ key }) => key === "hiq");
  const curology = spec.careerSections.find(({ key }) => key === "curology");
  const hiqCoordinates = Object.entries(spec.questionNotes).filter(([, note]) => note === "hiq");
  const curologyCoordinates = Object.entries(spec.questionNotes).filter(([, note]) => note === "curology");
  assert.ok(hiqCoordinates.every(([coordinate]) => {
    const x = Number.parseInt(coordinate, 10);
    return x >= hiq.start && x < hiq.end;
  }));
  assert.ok(curologyCoordinates.every(([coordinate]) => {
    const x = Number.parseInt(coordinate, 10);
    return x >= curology.start && x < curology.end;
  }));
});

test("skill labels live in the career section that owns them", () => {
  assert.equal(spec.pipes.find(({ x }) => x === 38).label, "");
  assert.equal(spec.pipes.find(({ x }) => x === 57).label, "Infra");
  assert.equal(spec.pipes.find(({ x }) => x === 163).label, "");
  assert.ok(spec.pipes.every(({ label }) => label !== "ML"));
  const ml = spec.milestones.find(({ label }) => label === "ML");
  const section = spec.careerSections.find((candidate) => ml.x >= candidate.start && ml.x < candidate.end);
  assert.equal(section.key, "anime");
  assert.equal(ml.section, "anime");
});

test("Ethos sign leads into the Product and Infra pipes without overlap", () => {
  const ethos = spec.careerSections.find(({ key }) => key === "ethos");
  const product = spec.pipes.find(({ label }) => label === "Product");
  const infra = spec.pipes.find(({ label }) => label === "Infra");
  const unlabeledPipe = spec.pipes.find(({ x }) => x === 38);
  const signLeft = ethos.signX - 34 / 16;
  const signRight = ethos.signX + 40 / 16;

  assert.equal(ethos.start, ethos.signX);
  assert.ok(signLeft > unlabeledPipe.x + 2);
  assert.ok(signRight < product.x);
  assert.ok(ethos.signX < product.x && product.x < infra.x);
});
