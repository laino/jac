
import * as math from 'math';
import * as polylines from 'polylines';

function p(x: number, y: number) {
    return {x, y};
}

const line = [
    p(0, 0),
    p(0, 1),
    p(1, 1),
    p(1, 0)
];

console.log(polylines.simplifyPolyline(line, {maxPoints: 3}));

console.log(line);
