
import * as math from 'math';

const p1 = {x: 0, y: 0, z: 0};
const p2 = {x: 0, y: 1, z: 0};
const p3 = {x: 1, y: 0, z: 0};

const l1 = {x: 0, y: 2, z: 0};
const l2 = {x: 2, y: 2, z: 0};

console.log(math.lineUVs(l1, l2, p1, p2, p3));

//console.log(math.uv2(0, 0, p1, p2, p3));
