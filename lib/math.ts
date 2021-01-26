
const MAX_DIGITS = 15;
//const MAX_VALUE = Math.pow(10, MAX_DIGITS - 1);
const MAX_VALUE = 500;

export interface Point {
    x: number,
    y: number,
    z: number,
}

export interface Edge {
    A: Point,
    B: Point 
}

export interface TriangleUV {
    u: number,
    v: number,
    A: Point,
    B: Point,
    C: Point
}

export interface ETriangleUV extends TriangleUV {
    AB: Edge,
    BC: Edge,
    CA: Edge
}

export interface TriangleUVi extends TriangleUV {
    i: number
}

export function Edge(A: Point, B: Point): Edge {
    return {A, B};
}

export function Point(x: number, y: number, z: number): Point {
    return {x, y, z};
}

export function TriangleUV(u: number, v: number, A: Point, B: Point, C: Point): TriangleUV {
    return {u, v, A, B, C};
}

export function TriangleUVi(u: number, v: number, i: number, A: Point, B: Point, C: Point): TriangleUVi {
    return {u, v, A, B, C, i};
}

export function ETriangleUV(u: number, v: number, A: Point, B: Point, C: Point,
                            AB: Edge, BC: Edge, CA: Edge): ETriangleUV {
    return {u, v, A, B, C, AB, BC, CA};
}

export class Mesh {
    public points: Point[] = [];

    public constructor() {
        const A = Point(-MAX_VALUE, -MAX_VALUE, 0)
        const B = Point(MAX_VALUE, -MAX_VALUE, 0)
        const C = Point(MAX_VALUE, MAX_VALUE, 0)
        const D = Point(-MAX_VALUE, MAX_VALUE, 0)
        
        this.points = [A, B, C, A, C, D];
    }

    /*
     * Add an area defined by triangle points.
     * Its outline should have z = 0;
     */
    public add(points: Point[]) {
        // We only update the Z coordinates at the end
        const toUpdate = new Map<Point, number>();
        
        // points from the overlapping area
        for (const P of this.points) {
            if (toUpdate.has(P)) {
                continue;
            }

            const t = triangleAt(P.x, P.y, points);

            if (!t) {
                continue;
            }

            toUpdate.set(P, uvz(t) + P.z);
        }

        const insertedPoints = new Map<Point, Point>();

        for (let i = 0; i < points.length; i += 3) {
            const triA = points[i];
            const triB = points[i+1];
            const triC = points[i+2];

            let A = insertedPoints.get(triA);
            if (!A) {
                A = this.insertPoint(triA.x, triA.y);
                toUpdate.set(A, A.z + triA.z);
                insertedPoints.set(triA, A);
            }
            
            let B = insertedPoints.get(triB);
            if (!B) {
                B = this.insertPoint(triB.x, triB.y);
                toUpdate.set(B, B.z + triB.z);
                insertedPoints.set(triB, B);
            }
            
            let C = insertedPoints.get(triC);
            if (!C) {
                C = this.insertPoint(triC.x, triC.y);
                toUpdate.set(C, C.z + triC.z);
                insertedPoints.set(triC, C);
            }

            for (const P of this.cutLine(A, B)) {
                toUpdate.set(P, P.z + interpolatePoint(P, A, B));
            }
            
            for (const P of this.cutLine(B, C)) {
                toUpdate.set(P, P.z + interpolatePoint(P, B, C));
            }

            for (const P of this.cutLine(C, A)) {
                toUpdate.set(P, P.z + interpolatePoint(P, C, A));
            }
        }
    }

    private insertPoint(x: number, y: number) {
        const t = triangleAt(x, y, this.points);

        if (!t) {
            throw new Error('point outside bounds');
        }
        
        const P = Point(x, y, uvz(t));

        this.points[t.i] = P; // P B C
        this.points.push(P, t.C, t.A); // P C A
        this.points.push(P, t.A, t.B); // P A B

        return P;
    }
    
    private cutLine(P1: Point, P2: Point): Point[] {
        const points = this.points;
        const length = points.length;

        const result: Point[] = [];
        const lineA: Point[] = [];
        const lineB: Point[] = [];

        // Makes sure we don't duplicate points on touching trianges
        // TODO: speedups?
        function getPoint(A: Point, B: Point, t: TriangleUV) {
            for (let i = 0; i < result.length; i++) {
                if (lineA[i] === A && lineB[i] === B || lineA[i] === B && lineB[i] === A) {
                    return result[i];
                }
            }

            const P = uvPoint(t);

            addPoint(P, A, B);

            return P;
        }
        
        function addPoint(P: Point, A: Point, B: Point) {
            result.push(P);
            lineA.push(A);
            lineB.push(B);
        }
        
        for (let i = 0; i < length; i+=3) {
            const A = points[i];
            const B = points[i+1];
            const C = points[i+2];

            const { AB, AC, BC } = lineUVs(P1, P2, A, B, C);

            let C1: Point;
            let C2: Point;

            // Arranged so T1 is always the inner point
            // and C1 is on the line T1 -> T2
            let T1: Point;
            let T2: Point;
            let T3: Point;

            let cutsAB = AB ? onUV(AB) : false;
            let cutsAC = AC ? onUV(AC) : false;
            let cutsBC = BC ? onUV(BC) : false;

            if (cutsAB && cutsAC && cutsBC) {
                // It passes through a point and through a side
                if (AB.u === 1) {
                    // Cuts through A
                    C1 = getPoint(B, C, BC);
                    T1 = A;
                    T2 = B;
                    T3 = C;
                } else if (AB.u === 0) {
                    // Cuts through B
                    C1 = getPoint(A, C, AC);
                    T1 = B;
                    T2 = C;
                    T3 = A;
                } else if (AC.u === 0) {
                    // Cuts through C
                    C1 = getPoint(A, B, AB);
                    T1 = C;
                    T2 = A;
                    T3 = B;
                }
            
                // Add the point we passed through
                addPoint(T1, null, null);

                points[i] = T1;
                points[i+1] = C1;
                points[i+2] = T2;

                points.push(T1, T3, C1);

                continue;
            }

            if (cutsAB) {
                if (cutsAC) {
                    // AB -> AC
                    
                    if (AB.u === 1 && AC.u === 1) {
                        // Just touches A
                        continue;
                    }

                    if (AB.u === 0 && AC.u === 0) {
                        // Lies on BC
                        addPoint(B, null, null);
                        addPoint(C, null, null);
                        continue;
                    }

                    C1 = getPoint(A, B, AB);
                    C2 = getPoint(A, C, AC);
                    T1 = A;
                    T2 = B;
                    T3 = C;
                } else if (cutsBC) {
                    // AB -> BC

                    if (AB.v === 1 && BC.v === 1) {
                        // Just touches B
                        continue;
                    }

                    if (AB.v === 0 && BC.v === 0) {
                        // Lies on AC
                        addPoint(A, null, null);
                        addPoint(C, null, null);
                        continue;
                    }

                    C1 = getPoint(A, B, AB);
                    C2 = getPoint(B, C, BC);
                    T1 = B;
                    T2 = A;
                    T3 = C;
                } else {
                    continue;
                }
            } else if (cutsAC && cutsBC) {
                // AC -> BC

                if (AC.u === 0 && BC.v === 0) {
                    // Just touches C
                    continue;
                }
                    
                if (AC.u === 1 && BC.v === 1) {
                    // Lies on AB
                    addPoint(A, null, null);
                    addPoint(B, null, null);
                    continue;
                }

                C1 = getPoint(B, C, BC);
                C2 = getPoint(A, C, AC);
                T1 = C;
                T2 = B;
                T3 = A;
            } else {
                continue;
            }

            points[i] = T1;
            points[i+1] = C1;
            points[i+2] = C2;

            points.push(C1, C2, T3, C1, T3, T2);
        }

        return result;
    }

    public sample(x: number, y: number): number {
        const t = triangleAt(x, y, this.points);

        if (!t) {
            return 0;
        }

        return uvz(t);
    }
}

export function interpolatePoint(P: Point, A: Point, B: Point) {
    return 0;
}

export function triangleAt(x: number, y: number, points: Point[]): TriangleUVi {
    return triangleAtRange(x, y, points, 0, points.length)
}

export function triangleAtRange(x: number, y: number, points: Point[], i: number, length: number): TriangleUVi {
    let r: TriangleUV;
    let rI: number;

    for (;i < length; i+=3) {
        const t = uv(x, y, points[i], points[i + 1], points[i + 2]);

        if (onUV(t) && (!r || uvz(t) > uvz(r))) {
            r = t;
            rI = i;
        }
    }

    if (r) {
        return TriangleUVi(r.u, r.v, rI, r.A, r.B, r.C);
    }

    return null;
}

export function lineUVs(P1: Point, P2: Point, A: Point, B: Point, C: Point) {
    const uv1 = uv(P1.x, P1.y, A, B, C);
    const uv2 = uv(P2.x, P2.y, A, B, C);

    const uv1w = 1 - uv1.u - uv1.v;
    const uv2w = 1 - uv2.u - uv2.v;

    let BC: TriangleUV;
    let AC: TriangleUV;
    let AB: TriangleUV;

    // Parallel if these are 0
    const rU = uv2.u - uv1.u;
    const rV = uv2.v - uv1.v;
    const rW = uv2w - uv1w;

    // Crossing BC when u = 0
    if (rU != 0 && Math.sign(uv1.u) !== Math.sign(uv2.u)) {
        const vBC = uv1.v - rV * (uv1.u / rU);
        BC = TriangleUV(0, vBC, A, B, C);
    }
    
    // Crossing AC when v = 0;
    if (rV != 0 && Math.sign(uv1.v) !== Math.sign(uv2.v)) {
        const uAC = uv1.u - rU * (uv1.v / rV);
        AC = TriangleUV(uAC, 0, A, B, C);
    }
    
    // Crossing AB when w = 0;
    if (rW != 0 && Math.sign(uv1w) !== Math.sign(uv2w)) {
        const uAB = uv1.u - rU * (uv1w / rW);
        AB = TriangleUV(uAB, 1 - uAB, A, B, C);
    }

    return {
        uv1,
        uv2,
        AB,
        AC,
        BC
    };
}

export function uv(x: number, y: number, A: Point, B: Point, C: Point): TriangleUV {
    const det = ((B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y));

    if (det === 0) {
        return TriangleUV(0, 0, A, B, C);
    }

    const u = ((B.y - C.y) * (x - C.x) + (C.x - B.x) * (y - C.y)) / det;
    const v = ((C.y - A.y) * (x - C.x) + (A.x - C.x) * (y - C.y)) / det;

    return TriangleUV(u, v, A, B, C);
}

export function uvPoint({u, v, A, B, C}: TriangleUV) {
    const w = 1 - u - v;

    return Point(
        A.x * u + B.x * v + C.x * w,
        A.y * u + B.y * v + C.y * w,
        A.z * u + B.z * v + C.z * w,
    );
}

export function uvz({u, v, A, B, C}: TriangleUV) {
    return A.z * u + B.z * v + C.z * (1 - u - v);
}

function onUV(t: TriangleUV) {
    return !(t.u < 0 || t.v < 0 || t.u + t.v > 1);
}

/*
function onLine1D(p: number, a: number, b: number) {
    if (a > b) {
        return p >= b && p <= a;
    }
        
    return p >= a && p <= b;
}
*/

/*
export function uv2(x: number, y: number, A: Point, B: Point, C: Point): TriangleUV {
    const v0x = C.x - A.x;
    const v0y = C.y - A.y;
    
    const v1x = B.x - A.x;
    const v1y = B.y - A.y;
    
    const v2x = x - A.x;
    const v2y = y - A.y;
    
    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);

    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    
    const z = A.z * (1 - u - v) + B.z * v + C.z * u;

    return TriangleUV(u, v, z, A, B, C);
}
*/

/*
export function triangleAtE(x: number, y: number, edges: Edge[]): ETriangleUV {
    const cEdges: Edge[] = [];
    const results: ETriangleUV[] = [];

    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        
        // Find 2 edges that touch each other and
        // each pass the point on either axis
        if (onLine1D(x, edge.A.x, edge.B.x) || onLine1D(y, edge.A.y, edge.B.y)) {
            for (const edge2 of cEdges) {
                let t: TriangleUV;

                // Arrange so B in result object is the touching side
                if (edge.A === edge2.A) {
                    t = uv(x, y, edge.B, edge.A, edge2.B);
                } else if (edge.B === edge2.A) {
                    t = uv(x, y, edge.A, edge.B, edge2.B);
                } else if (edge.B === edge2.B) {
                    t = uv(x, y, edge.A, edge.B, edge2.A);
                } else if (edge.A === edge2.B) {
                    t = uv(x, y, edge.B, edge.A, edge2.A);
                } else {
                    continue;
                }

                // Tests whether the point is actually in the triangle
                if ((t.u < 0) || (t.v < 0) || (t.u + t.v > 1)) {
                    continue;
                }

                // Find the third edge
                for (let i2 = 0; i2 < edges.length; i2++) {
                    const edge3 = edges[i2];

                    if ((edge3.A != t.A || edge3.B != t.C) && (edge3.A !== t.C || edge3.B !== t.A)) {
                        continue;
                    }

                    // If this triangle is contained in another triangle, replace it
                    // If this triangle contains another triangle, skip it

                    for (let i3 = 0; i < results.length; i++) {
                        // TODO

                    }

                    results.push(ETriangleUV(t.u, t.v, t.z, t.A, t.B, t.C, edge, edge2, edge3));
                }
            }

            cEdges.push(edge);
        }
    }

    // If there are triangles contained in larger ones,
    // we only care about the smallest one
    // To get multiple results, the resulting triangles
    // must either be contained in each other in some way,
    // so at least one of the points of one triangle
    // must be lying in the other one, or there are multiple
    // triangles overlapping on the Z-level.

    return null;
}

export function pointEdges(edges: Edge[]) {
    const pointEdges = new Map<Point, Edge[]>();

    for (const edge of edges) {
        const Aedges = pointEdges.get(edge.A);

        if (!Aedges) {
            pointEdges.set(edge.A, [edge]);
        }

        Aedges.push(edge);
        
        const Bedges = pointEdges.get(edge.B);

        if (!Bedges) {
            pointEdges.set(edge.B, [edge]);
        }

        Bedges.push(edge);
    }

    return pointEdges;
}
*/
