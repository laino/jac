
// Line equation in the form ax + bx + c = 0;
export interface abcLine {
    a: number,
    b: number,
    c: number,
}

export interface Point {
    x: number,
    y: number
}

export function on(A: Point, B: Point, C: Point) {
   if (A.x == C.x) {
       return B.x == C.x;
   }
   if (A.y == C.y) {
       return B.y == C.y;
   }

   return (A.x - C.x)*(A.y - C.y) == (C.x - B.x)*(C.y - B.y);
}

// Signed distance of the line BC to A
export function d(A: Point, B: Point, C: Point) {
    return ((C.x - B.x) * (B.y - A.y) - (C.y - B.y) * (B.x - A.x)) /
            Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));
}

// Signed distance of the line L to A
export function dL(A: Point, L: abcLine) {
    return (L.a * A.x + L.b * A.y + L.c) / Math.sqrt(L.a * L.a + L.b * L.b);
}

export function lineEq(A: Point, B: Point): abcLine {
    return {
        a: A.y - B.y,
        b: B.x - A.x,
        c: A.x * B.y - B.x * A.y
    };
}

export function triArea(A: Point, B: Point, C: Point) {
    return (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2;
}

export function intersection(A: abcLine, B: abcLine) {
    const d = (A.b*B.a-A.a*B.b);

    if (d === 0) {
        return null;
    }

    const x = (A.c*B.b-A.b*B.c) / d;
    const y = (A.a*B.c-A.c*B.a) / d;

    return {
        x,
        y,
    };
}

export function cmpSign(a: number, b: number) {
    return (a < 0) === (b < 0);
}

const PRECISION = 10; // 15 is the guaranteed amount of accurate decimal digits
const PRECISION_N = Math.pow(10, PRECISION);

export function round(num: number): number {
    if (num === 0) {
        return 0;
    }

    if (num > PRECISION_N) {
        return Math.round(num);
    }

    const abs = Math.abs(num);

    let m = PRECISION - 1;

    if (abs > 1) {
        m -= Math.floor(Math.log10(abs));
    }

    const n = Math.pow(10, m);

    return Math.round(num * n + Number.EPSILON) / n;
}
