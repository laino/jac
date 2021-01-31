
export type NumberArrayLike = Float64Array | number[];
export type Point = Float64Array;
/*
 * How many decimal digits are guaranteed to be accurate
 * for floating point numbers.
 */
export const DECIMAL_PRECISION = 15;

export const POW_10_MAP = [];
for (let i = 0; i < 100; i++) {
    POW_10_MAP.push(Math.pow(10, i - 50));
}

/*
 * Rounds to a number that can be accurately represented as a float.
 */
export function round(num: number): number {
    if (num === 0) {
        return 0;
    }

    const abs = Math.abs(num);

    let m = DECIMAL_PRECISION;

    if (abs > 1) {
        m -= Math.floor(Math.log10(abs)) + 1;
    }

    let n: number;

    if (m < 50 && m > -51) {
        n = POW_10_MAP[m + 50];
    } else {
        n = Math.pow(10, m);
    }

    return Math.round(num * n + Number.EPSILON) / n;
}

/*
 * Maximum error is 0.005
 * https://www.dsprelated.com/showarticle/1052.php
 */
export function approximateAtan (num: number) {
    const n1 = 0.97239411;
    const n2 = -0.19194795;
    return (n1 + n2 * num * num) * num;
}

export function dot(A: NumberArrayLike, B: NumberArrayLike) {
    let dot = 0;

    for (let i = A.length - 1; i >= 0; i--) {
        dot += A[i] * B[i];
    }

    return dot;
}

// Area of a 2D polygon defined by P in form [x1,y1,x2,y2,...]
// using the shoelace formula
export function area(P: NumberArrayLike, start: number, end: number) {
    let sum = P[end - 2] * P[start + 1] - P[start] * P[end - 1];

    for (let i = end - 4; i>=start; i-=2) {
        const x0 = P[i];
        const y0 = P[i+1];
        const x1 = P[i+2];
        const y1 = P[i+3];

        sum += x0*y1 - x1*y0;
    }

    return sum / 2;
}


export function norm(A: NumberArrayLike) {
    return Math.sqrt(dot(A,A));
}

/*
 * Unit vector
 */
export function unit(A: NumberArrayLike) {
    const n = 1 / norm(A);

    let r = A.slice(0);

    for (let i = A.length - 1; i >= 0; i--) {
        r[i] *= n;
    }

    return r;
}

/*
 * Cosine of the angle between two vectors
 */
export function angleCos(A: NumberArrayLike, B: NumberArrayLike) {
    return dot(unit(A), unit(B));
}

/*
 * Angle between two vectors.
 */
export function angle(A: NumberArrayLike, B: NumberArrayLike) {
    return Math.acos(angleCos(A, B));
}

