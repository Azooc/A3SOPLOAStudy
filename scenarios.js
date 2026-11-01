// Study scenarios, one aircraft each.
//
// Make one in the Build tab, hit Save, and paste the output in here.
//   sector    CRW, BLF, BKW, BOB or HNN. Study areas: North = BOB, CRW, HNN;
//             South = CRW, BLF; Combined = all of them
//   plane     x / y on the 833 x 843 sector map, hdg in degrees (0 = up),
//             vec = vector line length, dbx / dby = data block offset from the target
//   route     straight segments through these [x, y] points (can be empty)

window.SCENARIOS = [
{
  "id": "crw-1",
  "sector": "CRW",
  "question": "DAL1213 is on the PARQR STAR what altitude do they need?",
  "answer": "AOB FL300",
  "plane": { "x": 308, "y": 537, "hdg": 119, "vec": 40, "callsign": "DAL1214", "alt": "330", "cid": "022", "spd": "582", "line4": "KCLT", "dbx": 36, "dby": -65 },
  "route": [[343, 556], [447, 620], [514, 751]]
},
{
  "id": "crw-2",
  "sector": "CRW",
  "question": "DAL1213 is on the BTSEY STAR what altitude do they need?",
  "answer": "AOB FL330",
  "plane": { "x": 341, "y": 566, "hdg": 119, "vec": 40, "callsign": "DAL2211", "alt": "330", "cid": "018", "spd": "489", "line4": "KCLT", "dbx": 36, "dby": -65 },
  "route": [[375, 585], [441, 634], [514, 751]]
},
{
  "id": "crw-3",
  "sector": "CRW",
  "question": "What altitude does AAL224 need?",
  "answer": "AOB FL230",
  "plane": { "x": 258, "y": 588, "hdg": 153, "vec": 39, "callsign": "AAL224", "alt": "310", "cid": "060", "spd": "488", "line4": "KAVL", "dbx": 27, "dby": -51 },
  "route": [[275, 623], [324, 751]]
},
{
  "id": "blf-1",
  "sector": "BLF",
  "question": "What altitude does PDT1214 need?",
  "answer": "AOB FL370",
  "plane": { "x": 507, "y": 487, "hdg": 140, "vec": 39, "callsign": "PDT1214", "alt": "390", "cid": "022", "spd": "512", "line4": "KCAE", "dbx": 36, "dby": -49 },
  "route": [[533, 517], [660, 672], [746, 722]]
},
{
  "id": "blf-2",
  "sector": "BLF",
  "question": "What altitude does AAL117 need?",
  "answer": "AOB FL340",
  "plane": { "x": 497, "y": 486, "hdg": 168, "vec": 52, "callsign": "AAL117", "alt": "360", "cid": "021", "spd": "504", "line4": "KCHA", "dbx": -85, "dby": -7 },
  "route": [[507, 534], [551, 679], [638, 754]]
},
{
  "id": "crw-4",
  "sector": "CRW",
  "question": "What altitude does DAL223 need?",
  "answer": "AOB FL340",
  "plane": { "x": 434, "y": 545, "hdg": 200, "vec": 45, "callsign": "DAL223", "alt": "310", "cid": "013", "spd": "422", "line4": "KCHA", "dbx": 51, "dby": -74 },
  "route": [[419, 587], [378, 715], [363, 753]]
},
{
  "id": "crw-5",
  "sector": "CRW",
  "question": "What altitude does AAL224 need?",
  "answer": "AOB FL270",
  "plane": { "x": 356, "y": 582, "hdg": 111, "vec": 41, "callsign": "AAL224", "alt": "320", "cid": "021", "spd": "511", "line4": "KGSO", "dbx": 5, "dby": -69 },
  "route": [[394, 597], [503, 638], [531, 753]]
},
{
  "id": "crw-6",
  "sector": "CRW",
  "question": "What altitude does AAL1124 need?",
  "answer": "AOB FL270",
  "plane": { "x": 395, "y": 560, "hdg": 122, "vec": 42, "callsign": "AAL1124", "alt": "320", "cid": "028", "spd": "492", "line4": "KINT", "dbx": 5, "dby": -69 },
  "route": [[433, 584], [503, 638], [531, 753]]
},
];
