
import {abcLine, lineEq, dL, Point, cmpSign, intersection, triArea} from './math';

export function simplifyPolyline(line: Point[]) {

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
            displacement: triArea(A, B, E)
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

    if (cmpSign(dBAD, dCAD)) {
        // B and C are on the same side

        if (dBAD > dCAD === (dBAD > 0)) {
            // distance of B greater than distance of C
            const E = intersection(El, lineEq(A, B));

            return {
                point: E,
                displacement: fastDisplacement(D, E, B, C)
            };
        }

        // distance of B smaller than distance of C
        const E = intersection(El, lineEq(C, D));

        return {
            point: E,
            displacement: fastDisplacement(A, E, C, B)
        };
    }

    if (cmpSign(dBAD, h)) {
        // B and E are on the same side
        const E = intersection(El, lineEq(A, B));

        return {
            point: E,
            displacement: fastDisplacement(D, E, B, C)
        };
    }

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
    return Math.abs(triArea(A, D, intersection(lineEq(A, B), lineEq(C, D))));
}

// Defines the line E
function Eline(A: Point, B: Point, C: Point, D: Point): abcLine {
    return {
        a: D.y - A.y,
        b: A.x - D.x,
        c: -(B.y * A.x) + (A.y - C.y) * B.x + (B.y - D.y) * C.x + (C.y * D.x)
    };
}
