(function (root, factory) {
  const spec = factory();
  root.CareerLevelSpec = spec;
  if (typeof module === "object" && module.exports) module.exports = spec;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Processed World 1-1 geometry from The Video Game Level Corpus:
  // https://github.com/TheVGLC/TheVGLC/blob/master/Super%20Mario%20Bros/Processed/mario-1-1.txt
  const rows = [
    "----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
    "----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
    "----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
    "----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
    "----------------------------------------------------------------------------------E-----------------------------------------------------------------------------------------------------------------------",
    "----------------------Q---------------------------------------------------------SSSSSSSS---SSSQ--------------?-----------SSS----SQQS--------------------------------------------------------XX------------",
    "-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------XXX------------",
    "-------------------------------------------------------------------------------E----------------------------------------------------------------------------------------------------------XXXX------------",
    "-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------XXXXX------------",
    "----------------Q---S?SQS---------------------<>---------<>------------------S?S--------------S-----SS----Q--Q--Q-----S----------SS------X--X----------XX--X------------SSQS------------XXXXXX------------",
    "--------------------------------------<>------[]---------[]-----------------------------------------------------------------------------XX--XX--------XXX--XX--------------------------XXXXXXX------------",
    "----------------------------<>--------[]------[]---------[]----------------------------------------------------------------------------XXX--XXX------XXXX--XXX-----<>--------------<>-XXXXXXXX------------",
    "---------------------E------[]--------[]-E----[]-----E-E-[]------------------------------------E-E--------E-----------------EE-E-E----XXXX--XXXX----XXXXX--XXXX----[]---------EE---[]XXXXXXXXX--------X---",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  ];

  const careerSections = [
    { key: "hiq", label: "hiQ Labs", start: 7, end: 20, signX: 5, noteKeys: ["hiq"] },
    { key: "curology", label: "Curology", start: 20, end: 43, signX: 20, noteKeys: ["curology"] },
    { key: "ethos", label: "Ethos", start: 43, end: 96, signX: 43, noteKeys: ["ethos", "ethosPlatform"] },
    { key: "anime", label: "AnimePics", start: 96, end: 122, signX: 96, noteKeys: ["anime"] },
    { key: "intuit", label: "Intuit", start: 122, end: 192, signX: 122, noteKeys: ["intuit", "intuitMatching", "intuitGateway"] },
    { key: "finish", label: "Finish", start: 192, end: 202, signX: 192, noteKeys: [] },
  ];

  const questionNotes = {
    "16,9": "hiq",
    "21,9": "curology",
    "23,9": "curology",
    "78,9": "ethos",
    "94,5": "ethosPlatform",
    "106,9": "anime",
    "109,5": "anime",
    "129,5": "intuit",
    "130,5": "intuitMatching",
    "170,9": "intuitGateway",
  };

  const pipes = [
    { x: 28, topY: 11, height: 2, label: "Fullstack" },
    { x: 38, topY: 10, height: 3, label: "" },
    { x: 46, topY: 9, height: 4, label: "Product" },
    { x: 57, topY: 9, height: 4, label: "Infra" },
    { x: 163, topY: 11, height: 2, label: "" },
    { x: 179, topY: 11, height: 2, label: "AI systems" },
  ];

  const milestones = [{ x: 109, y: 5, label: "ML", section: "anime" }];

  const hiddenBlocks = [{ x: 64, y: 8, kind: "oneUp" }];

  const enemies = [
    [21, 12, "goomba"],
    [41, 12, "goomba"],
    [53, 12, "goomba"],
    [55, 12, "goomba"],
    [79, 7, "goomba"],
    [82, 4, "goomba"],
    [95, 12, "goomba"],
    [97, 12, "goomba"],
    [106, 12, "turtle"],
    [124, 12, "goomba"],
    [125, 12, "goomba"],
    [127, 12, "goomba"],
    [129, 12, "goomba"],
    [174, 12, "goomba"],
    [175, 12, "goomba"],
  ].map(([x, y, type]) => ({ x, y, type }));

  return Object.freeze({
    source: "TheVGLC/TheVGLC Super Mario Bros Processed mario-1-1.txt",
    width: 202,
    height: 14,
    rows: Object.freeze(rows),
    flagTileX: 198,
    playerStart: Object.freeze({ x: 3, y: 12 }),
    floorGaps: Object.freeze([
      [69, 70],
      [86, 88],
      [153, 154],
    ]),
    careerSections: Object.freeze(careerSections),
    questionNotes: Object.freeze(questionNotes),
    hiddenBlocks: Object.freeze(hiddenBlocks),
    pipes: Object.freeze(pipes),
    milestones: Object.freeze(milestones),
    enemies: Object.freeze(enemies),
  });
});
