
import {round, abcLine, lineEq, dL, Point, cmpSign, intersection, triArea, on} from './math';

export interface SimplifyOptions {
    maxPoints: number,
    positiveY?: boolean,
    orderedX?: boolean
}

export interface SimplifyResult {
    displacement: number
}

export function simplifyPolyline(line: Point[], options: SimplifyOptions): SimplifyResult {
    const result: SimplifyResult = {
        displacement: 0
    };

    // TODO: this can be optimized
    while (line.length > options.maxPoints) {
        // remove superfluous points
        for (let i = 0; i < line.length - 1; i++) {
            const B = line[i];
            const C = line[i+1];

            if (B.x === C.x && B.y === C.y || (i > 1 && on(line[i - 1], B, C))) {
                line.splice(i, 1);
                i--;
                continue;
            }
        }

        if (line.length <= options.maxPoints) {
            break;
        }

        let best: (Placement & {i: number}) = null;

        for (let i = 0; i < line.length - 3; i++) {
            const A = line[i];
            const B = line[i+1];
            const C = line[i+2];
            const D = line[i+3];

            const {point, displacement} = placement(A, B, C, D);

            point.x = round(point.x);
            point.y = round(point.y);

            if (options.positiveY && point.y < 0) {
                continue;
            }
            
            if (options.orderedX && (point.x < A.x || point.x > D.x)) {
                continue;
            }
        
            if (!best || displacement > best.displacement) {
                best = {i,point, displacement};
            }
        }

        if (!best) {
            break;
        }
        
        result.displacement += best.displacement;
           
        line.splice(best.i + 1, 2, best.point);
    }

    return result;
}

export interface Placement {
    point: Point,
    displacement: number
}

/*
 * Based on:
 *
 * Kronenfeld, B. J., Stanislawski, L. V., Buttenfield, B. P., & Brockmeyer, T. (2019).
 * Simplification of polylines by segment collapse: minimizing areal displacement while preserving area.
 * International Journal of Cartography, 1–25.
 * doi:10.1080/23729333.2019.1631535
 */
export function placement(A: Point, B: Point, C: Point, D: Point): Placement {
    const AD = lineEq(A, D);
    const dBAD = dL(B, AD);
    const dCAD = dL(C, AD);

    // Picking a point on anywhere on E will preserve
    // the original area, but we use the criteria outlined in the
    // above paper to select a point that results in the
    // least amount of displacement
    const El = Eline(A, B, C, D);
    const h = dL(A, El);

    if (h === 0) {
        // E is on AD, use middle
        const E = {
            x: (A.x + D.x) / 2,
            y: (A.y + D.y) / 2,
        };

        return {
            point: E,
            displacement: Math.abs(triArea(A, B, E))
        };
    }

        
    if (dBAD === dCAD) {
        // AD and BC are parallel, use middle on E
        const iAB = intersection(El, lineEq(A, B));
        const iCD = intersection(El, lineEq(C, D));

        const E = {
            x: (iAB.x + iCD.x) / 2,
            y: (iAB.y + iCD.y) / 2,
        };

        return {
            point: E,
            displacement: fastDisplacement(A, iCD, C, B)
        };
    }

    if (dBAD > 0 && (cmpSign(dBAD, dCAD) && (dBAD > dCAD === (dBAD > 0)) || cmpSign(dBAD, h))) {
        // B and C are on the same side and B is further out, or
        // B and E are on the same side
        const E = intersection(El, lineEq(A, B));

        return {
            point: E,
            displacement: fastDisplacement(D, E, B, C)
        };
    }

    // B and C are on the same side and C is further out, or
    // C and E are on the same side
    const E = intersection(El, lineEq(C, D));

    return {
        point: E,
        displacement: fastDisplacement(A, E, C, B)
    };
}

// Assumption: 3 points and the new point form a crossed trapezoid 
// with two equal areas. AB and CD should intersect and A, D and B, C should
// lie on the same side (form a base).
//
// Needs formal proof and a simplified calculation
function fastDisplacement(A: Point, B: Point, C: Point, D: Point): number {
    const I = intersection(lineEq(A, B), lineEq(C, D));

    // special case where area is 0
    if (!I) {
        return 0;
    }

    return Math.abs(triArea(A, D, I));
}

// Defines the line E
function Eline(A: Point, B: Point, C: Point, D: Point): abcLine {
    return {
        a: D.y - A.y,
        b: A.x - D.x,
        c: -(B.y * A.x) + (A.y - C.y) * B.x + (B.y - D.y) * C.x + (C.y * D.x)
    };
}
