
import * as math from 'math';
import * as polylines from 'polylines';
import * as jap from 'jap';

console.log(math.round(-8.881784197001252e-16));
console.log(math.round(1.183961805967655e-14));

function p(x: number, y: number) {
    return {x, y};
}

const line = [
    p(0, 0),
    p(0, 1),
    p(1, 1),
    p(1, 0)
];

polylines.simplifyPolyline(line, {
    maxPoints: 3,
    orderedX: true
});

const plot = new jap.JapPlot({
    maxPoints: 50,
    positiveY: true
});

let totalVolume = 0;
let totalDisplacement = 0;

for (let i = 0; i <= 1000; i++) {
    const volume = Math.abs(5 - (i % 10));
    const result = plot.insert(i, volume);
    totalDisplacement += result.displacement;
    totalVolume += volume;
    console.log(volume, plot.data);
}

console.log(totalVolume, totalDisplacement);
console.log(plot.volume(-1, 10000));
console.log(plot.data);
