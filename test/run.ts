
import * as math from 'math';
import * as polylines from 'polylines';

function p(x: number, y: number) {
    return {x, y};
}

console.log(polylines.placement(p(0, 0), p(0, 1), p(1, 1), p(1, 0)));
