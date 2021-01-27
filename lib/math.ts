
import KDBush from 'kdbush';

const MAX_DIGITS = 13;
const MAX_VALUE = Math.pow(10, MAX_DIGITS - 1);
//const MAX_VALUE = 500;

const PRECISION = 15;
const PRECISION_N = Math.pow(10, PRECISION);;
const PRECISION_D = 1 / PRECISION_N;

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

export interface SimplifyOptions {
    maxPoints: number,
    maxTriangles: number
}

export function Edge(A: Point, B: Point): Edge {
    return {A, B};
}

export function Point(x: number, y: number, z: number): Point {
    return {x, y, z};
}

export function TriangleUV(u: number, v: number, A: Point, B: Point, C: Point): TriangleUV {
    return {u: round(u), v: round(v), A, B, C};
}

export function TriangleUVi(u: number, v: number, i: number, A: Point, B: Point, C: Point): TriangleUVi {
    return {u: round(u), v: round(v), A, B, C, i};
}

export function ETriangleUV(u: number, v: number, A: Point, B: Point, C: Point,
                            AB: Edge, BC: Edge, CA: Edge): ETriangleUV {
    return {u: round(u), v: round(v), A, B, C, AB, BC, CA};
}

export class Mesh {
    private points: Point[];

    private boundsA: Point;
    private boundsB: Point;
    private boundsC: Point;
    private boundsD: Point;

    public constructor() {
        this.boundsA = Point(-MAX_VALUE, -MAX_VALUE, 0)
        this.boundsB = Point(MAX_VALUE, -MAX_VALUE, 0)
        this.boundsC = Point(MAX_VALUE, MAX_VALUE, 0)
        this.boundsD = Point(-MAX_VALUE, MAX_VALUE, 0)
        
        this.points = [
            this.boundsA, this.boundsB, this.boundsC,
            this.boundsA, this.boundsC, this.boundsD
        ];
    }

    /*
     * Get points 
     */
    public getPoints(bounds: boolean): Point[] {
        if (bounds) {
            return this.points.slice(0);
        }

        const result: Point[] = [];

        const points = this.points;
        const length = points.length;

        bounds: for (let i = 0; i < length; i += 3) {
            for (let i2 = 0; i2 < 3; i2++) {
                const P = points[i + i2];

                if (P === this.boundsA || P === this.boundsB || P === this.boundsC || P === this.boundsD) {
                    continue bounds;
                }
            }

            result.push(points[i], points[i+1], points[i+2]);
        };

        return result;
    }



    /*
     * Add an area defined by triangle points.
     */
    public add(points: Point[]) {
        const cPoints = this.points;
        // We only update the Z coordinates at the end
        const insidePoints = new Map<Point, number>();
        
        // points from the overlapping area
        for (const P of cPoints) {
            if (insidePoints.has(P)) {
                continue;
            }

            const t = triangleAt(P.x, P.y, points);

            if (!t) {
                continue;
            }

            insidePoints.set(P, uvz(t) + P.z);
        }

        const insertedPoints = new Map<Point, Point>();

        for (let i = 0; i < points.length; i += 3) {
            const ins = [
                insertedPoints.get(points[i]),
                insertedPoints.get(points[i+1]),
                insertedPoints.get(points[i+2])
            ];

            for (let i2 = 0; i2 < 3; i2++) {
                let P = ins[i2];

                if (!P) {
                    const Ps = points[i + i2];
                    P = ins[i2] = this.insertPoint(Ps.x, Ps.y);
                    insidePoints.set(P, P.z + Ps.z);
                    insertedPoints.set(Ps, P);
                }
            }
            
            for (let i2 = 0; i2 < 3; i2++) {
                const A = points[i + i2];
                const B = points[i + (i2 + 1) % 3];

                for (const P of this.cutLine(A, B)) {
                    if (P === ins[0] || P === ins[1] || P === ins[2]) {
                        continue;
                    }

                    insidePoints.set(P, P.z + interpolatePoint(P, A, B));
                }
            }
        }

        const pL = cPoints.length;
        const disconnectedPoints = new Map<Point, Point>();

        // Find outline points and disconnect them
        for (let i = 0; i < pL; i += 3) {
            const has = [
                insidePoints.has(cPoints[i]),
                insidePoints.has(cPoints[i + 1]),
                insidePoints.has(cPoints[i + 2])
            ];
            
            if (has[0] && has[1] && has[2]) {
                // The whole triangle is inside
                continue;
            }

            for (let i2 = 0; i2 < 3; i2++) {
                if (!has[i2]) {
                    continue;
                }

                const P = cPoints[i + i2];
                let P2 = disconnectedPoints.get(P);

                if (!P2) {
                    P2 = Point(P.x, P.y, P.z);
                    disconnectedPoints.set(P, P2);
                }

                cPoints[i + i2] = P2;
            }
        }

        for (const [P, z] of insidePoints) {
            P.z = z;
        }
    }

    public simplify(options: SimplifyOptions) {
        // TODO: collapsing lines into points,
        // don't forget this may invalidate point collapses
        const points = this.points;
        const length = points.length;
        const collapse: Collapse[] = [];
        
        let displacement = 0;
        
        const bush = new KDBush(points, (p) => p.x, (p) => p.y);

        let realPoints = new Set<Point>();

        for (let i = 0; i < length; i+=3) {
            for (let i2 = 0; i2 < 3; i2++) {
                const Pi = i + i2;
                const P = points[Pi];

                if (realPoints.has(P)) {
                    continue;
                }

                realPoints.add(P);

                const onPoint = bush.within(P.x, P.y, PRECISION_D);

                for (const ni of onPoint) {
                    if (ni <= Pi) {
                        continue;
                    }
                    
                    const N = points[ni];

                    if (N === P) {
                        continue;
                    }
                    
                    if (realPoints.has(N)) {
                        // We already compared N and P
                        continue;
                    }
                    
                    if (Math.abs(N.z - P.z) < PRECISION_D) {
                        points[ni] = P;
                        continue;
                    }
  
                    collapse.push(calculateCollapse(points, N, P, onPoint));
                }
            }
        }

        collapse.sort((a, b) => a.displacement - b.displacement);

        for (let i = 0; i < collapse.length; i++) {
            if (realPoints.size <= options.maxPoints && length <= options.maxTriangles * 3) {
                break;
            }

            const c = collapse[i];

            displacement += c.displacement;

            if (c.type === 0) {
                const P = points[c.targets[0]];
                P.z = c.z;

                for (let pI of c.targets) {
                    const N = points[pI];
                    if (N !== P) {
                        realPoints.delete(points[pI]);
                    }
                    points[pI] = P;
                }
            }
        }

        return {displacement};
    }

    private insertPoint(x: number, y: number) {
        const t = triangleAt(x, y, this.points);

        if (!t) {
            throw new Error('point outside bounds');
        }

        if (t.u === 1) {
            return t.A;
        }
        
        if (t.v === 1) {
            return t.B;
        }
        
        if (t.u === 0 && t.v === 0) {
            return t.C;
        }

        const P = Point(x, y, uvz(t));

        if (t.u === 0) {
            // Lies on BC

            this.points[t.i + 2] = P; // A B P
            this.points.push(P, t.C, t.A); // P C A

            return P;
        }
        
        if (t.v === 0) {
            // Lies on AC

            this.points[t.i + 2] = P; // A B P
            this.points.push(P, t.B, t.C); // P B C

            return P;
        }
        
        if (t.u + t.v === 1) {
            // Lies on AB

            this.points[t.i] = P; // P B C
            this.points.push(t.A, P, t.C); // A P C

            return P;
        }

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

        // Makes sure we don't duplicate points on touching triangles
        // TODO: speedups?
        function getPoint(A: Point, B: Point, t: TriangleUV) {
            for (let i = 0; i < result.length; i++) {
                if (lineA[i] === A && lineB[i] === B || lineA[i] === B && lineB[i] === A) {
                    return result[i];
                }
            }

            const P = uvPoint(t);
            
            result.push(P);
            lineA.push(A);
            lineB.push(B);

            return P;
        }
        
        function addPoint(P: Point) {
            for (let i = 0; i < result.length; i++) {
                if (P === result[i]) {
                    return;
                }
            }
        
            result.push(P);
            lineA.push(null);
            lineB.push(null);
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
                addPoint(T1);

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
                        addPoint(B);
                        addPoint(C);
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
                        addPoint(A);
                        addPoint(C);
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
                    addPoint(A);
                    addPoint(B);
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

interface CollapseBase {
    displacement: number,
}

interface PointCollapse extends CollapseBase {
    type: 0,
    targets: number[],
    z: number,
}

interface LineCollapse extends CollapseBase {
    type: 1,
}

type Collapse = PointCollapse | LineCollapse;

function calculateCollapse(points: Point[], A: Point, B: Point, list: number[]): PointCollapse {
    const targets: number[] = [];

    let areaA = 0;
    let areaB = 0;

    for (let li = 0; li < list.length; li++) {
        const i = list[li];
        const P = points[i];

        if (P === A) {
            const ti = i - i%3;
            areaA += area(points[ti], points[ti+1], points[ti+2]);
            targets.push(i);
        } else if (P === B) {
            const ti = i - i%3;
            areaB += area(points[ti], points[ti+1], points[ti+2]);
            targets.push(i);
        }
    }

    const z = (A.z * areaA + B.z * areaB) / (areaA + areaB);
    const displacement = Math.abs(areaA * (A.z - z));

    return {
        type: 0,
        z,
        displacement,
        targets
    };
}

export function interpolatePoint(P: Point, A: Point, B: Point) {
    const dX = A.x - B.x;
    const dY = A.y - B.y;
    const dZ = A.z - B.z;

    if (Math.abs(dX) > Math.abs(dY)) {
        return A.z - dZ * (A.x - P.x) / dX;
    }

    return A.z - dZ * (A.y - P.y) / dY;
}

export function triangleAt(x: number, y: number, points: Point[]): TriangleUVi {
    return triangleAtRange(x, y, points, 0, points.length)
}

export function triangleAtRange(x: number, y: number, points: Point[], i: number, length: number): TriangleUVi {
    let r: TriangleUV;
    let rI: number;

    for (;i < length; i+=3) {
        const t = uv(x, y, points[i], points[i + 1], points[i + 2]);

        if (t && onUV(t) && (!r || uvz(t) >= uvz(r))) {
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
    let BC: TriangleUV;
    let AC: TriangleUV;
    let AB: TriangleUV;

    let uv1: TriangleUV;
    let uv2: TriangleUV;

    uv1 = uv(P1.x, P1.y, A, B, C);

    if (uv1) {
        uv2 = uv(P2.x, P2.y, A, B, C);

        if (uv2) {
            const uv1w = 1 - uv1.u - uv1.v;
            const uv2w = 1 - uv2.u - uv2.v;

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
        }
    }

    return {
        uv1,
        uv2,
        AB,
        AC,
        BC
    };
}

export function volume(A: Point, B: Point, C: Point) {
    return area(A, B, C) * (A.z + B.z + C.z) / 3;
}

export function area(A: Point, B: Point, C: Point) {
    return Math.abs((A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)) / 2);
}

export function uv(x: number, y: number, A: Point, B: Point, C: Point): TriangleUV {
    const det = ((B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y));

    if (det === 0) {
        return null;
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
