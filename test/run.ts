
import * as math from 'math';
import * as polylines from 'polylines';
import * as jap from 'jap';

function p(x: number, y: number) {
    return {x, y};
}

const line = [
    p(0, 10),
    p(1, 20),
    p(2, 10),
    p(3, 20)
];

polylines.simplifyPolyline(line, {maxPoints: 3});

const plot = new jap.JapPlot({maxPoints: 10});

console.log(plot.insert(0, 10));

for (let i = 0; i < 100; i++) {
    console.log(plot.insert(i, 10));
}

console.log(plot.data);
