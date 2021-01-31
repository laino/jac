import * as jac from 'jac';
import { calculateError } from 'cloud';

const KEPT_POINTS = 100;
const ADDED_POINTS = 1000;
const SAMPLE_AREAS = 1000;
const RUNS = 100;

run();

function measureErrors() {
    const cloudA = new jac.JAC({maxPoints: KEPT_POINTS}, 'v', 'x', 'y');
    const cloudB = new jac.JAC({maxPoints: ADDED_POINTS}, 'v', 'x', 'y');

    for (let i = 0; i < ADDED_POINTS; i++) {
        const data = {
            v: Math.random() * 200 - 100,
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100
        };

        cloudA.add(data);
        cloudB.add(data);
    }
    
    const measureAt = Array(SAMPLE_AREAS).fill(0).map(() => {
        const a = Math.random() * 201 - 101;
        const b = Math.random() * 201 - 101;

        return [,
            [a, a + 1],
            [b, b + 1]
        ];
    });;

    function takeMeasurements<K extends string>(cloud: jac.JAC<K>) {
        return measureAt.map(k => cloud.cloud.ranges(k));
    }

    const expected = takeMeasurements(cloudB);
    const measured = takeMeasurements(cloudA);

    return measured.map((a, i) => calculateError(expected[i], a, 3));
}

function run() {
    console.log(`--- Measuring Error ---`);
    console.log(`Saving ${ADDED_POINTS} random data points as ${KEPT_POINTS} data points.`);
    console.log(`Comparing ${SAMPLE_AREAS} randomly selected areas to reference.`);
    console.log(`Repeating test ${RUNS} times...`);
    console.log();

    const min = new Float64Array(3);
    const max = new Float64Array(3);
    const sum = new Float64Array(3);
    const change = new Float64Array(3);

    let totalNumber = 0;

    for (let i = 0; i < RUNS; i++) {
        const error = measureErrors();

        if ((i + 1) % 10 === 0) {
            console.log(i + 1, '/', RUNS);
        }

        for (const E of error) {
            min.set(E.map((e, i) => Math.min(Math.abs(e), min[i])));
            max.set(E.map((e, i) => Math.max(Math.abs(e), max[i])));
            sum.set(E.map((e, i) => Math.abs(e) + sum[i]));
            change.set(E.map((e, i) => e + change[i]));
            totalNumber++;
        }
    }

    function printError(label: string, data: Float64Array) {
        console.log();
        console.log(label);
        console.log(... [...data].map(c => {
            return (c * 100).toFixed(1) + '%'
        }));
    }
    
    printError("Average Change", change.map(c => c / totalNumber));
    printError("Average Error (+/-)", sum.map(c => c / totalNumber));
    printError("Min Error (+/-)", min);
    printError("Max Error (+/-)", max);
    
    console.log();
}

