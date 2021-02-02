import * as jac from 'jac';
import { calculateError } from 'cloud';

const KEPT_POINTS = 300;
const ADDED_POINTS = 600;
const SAMPLE_AREAS = 500;
const RUNS = 100;
const DIMENSIONS = ['employees', 'money'];
const NUM_DIMENSIONS = DIMENSIONS.length + 1;

run();

function createCompanies() {
    const n = Math.random();

    const number = Math.floor(n * 100 + 1);

    // The lower the number of companies, the higher the chance they're large companies

    const employees = Math.ceil(Math.random() * 10 / Math.sqrt(n));
    
    const money = Math.pow(10 * Math.random(), Math.sqrt(employees));

    return {
        number,
        employees,
        money
    };
}

function measureErrors() {
    const cloudA = new jac.JAC({maxPoints: KEPT_POINTS}, 'number', ... DIMENSIONS);
    const cloudB = new jac.JAC({maxPoints: ADDED_POINTS}, 'number', ... DIMENSIONS);

    for (let i = 0; i < ADDED_POINTS; i++) {
        const data = createCompanies();

        cloudA.add(data);
        cloudB.add(data);
    }
    
    const measureAt = Array(SAMPLE_AREAS).fill(0).map(() => {
        const A = createCompanies();
        const B = createCompanies();

        const query = [null];

        for (const d of DIMENSIONS) {
            query.push([Math.min(A[d], B[d]), Math.max(A[d], B[d])]);
        }

        return query;
    });;

    function takeMeasurements<K extends string>(cloud: jac.JAC<K>) {
        return measureAt.map(k => cloud.cloud.ranges(k));
    }

    const expected = takeMeasurements(cloudB);
    const measured = takeMeasurements(cloudA);

    return measured.map((a, i) => calculateError(expected[i], a, NUM_DIMENSIONS));
}

function run() {
    console.log(`--- Measuring Error ---`);
    console.log(`Saving ${ADDED_POINTS} random data points as ${KEPT_POINTS} data points.`);
    console.log(`Comparing ${SAMPLE_AREAS} randomly selected areas to reference.`);
    console.log(`Repeating test ${RUNS} times...`);
    console.log();

    const max = new Float64Array(NUM_DIMENSIONS);
    const min = new Float64Array(NUM_DIMENSIONS);
    const sum = new Float64Array(NUM_DIMENSIONS);
    const change = new Float64Array(NUM_DIMENSIONS);

    min.fill(Infinity);
    max.fill(-Infinity);

    let totalNumber = 0;

    for (let i = 0; i < RUNS; i++) {
        const error = measureErrors();

        if ((i + 1) % 10 === 0) {
            console.log(i + 1, '/', RUNS);
        }

        for (const E of error) {
            min.set(E.map((e, i) => Math.min(e, min[i])));
            max.set(E.map((e, i) => Math.max(e, max[i])));
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
    printError("Min Error", min);
    printError("Max Error", max);
    
    console.log();
}

