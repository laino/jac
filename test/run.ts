
import * as jap from 'jap';

const plot = new jap.JapPlot({
    maxPoints: 100,
    positiveY: true
});

let now = Date.now();
let totalVolume = 0;
let totalDisplacement = 0;

for (let i = 0; i <= 1000; i++) {
    const volume = Math.abs(5 - (i % 10));
    const result = plot.insert(i, volume);
    totalDisplacement += result.displacement;
    totalVolume += volume;
}

console.log(Date.now() - now);

console.log(totalVolume, totalDisplacement);
console.log(plot.volume(-1, 10000));
console.log(plot.data);

//import * as math from 'math';
//import * as polylines from 'polylines';
//console.log(math.round(-8.881784197001252e-16));
//console.log(math.round(1.183961805967655e-14));
