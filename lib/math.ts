
//const MAX_DIGITS = 13;
//const MAX_VALUE = Math.pow(10, MAX_DIGITS - 1);
//const MAX_VALUE = 500;

const PRECISION = 15;
const PRECISION_N = Math.pow(10, PRECISION);;

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
    v: number,
    d: number[]
}

export interface CloudSettings {
    maxPoints: number
}

function Point(v: number, di: number[]) {
    const d = [];

    for (const n of di) {
        d.push(round(n));
    }

    return {v: round(v), d};
}

export class Dimension {
    private points: Point[] = [];


    public constructor(public index: number) {
    }
    
    public add(point: Point) {
        this.points.push(point);
    }
    
    public update() {
        const index = this.index;

        this.points.sort((a, b) => a.d[index] - b.d[index]);
    }
    
    public remove(p: Point): boolean {
        const points = this.points;

        for (let i = 0; i < points.length; i++) {
            if (points[i] === p) {
                points.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    public isBounds(p: Point) {
        const points = this.points;

        return points[0] === p || points[points.length - 1] === p;
    }

    public sample(x: number): number {
        const index = this.index;
        const points = this.points;

        if (points[0].d[index] > x) {
            return 0;
        }
        
        if (points[points.length - 1].d[index] < x) {
            return 0;
        }

        let i = 0;

        let lX = 0;
        let rX = 0;
        
        let lsum = 0;
        let rsum = 0;

        for (; i < points.length; i++) {
            const p = points[i];
            const v = p.d[index];

            if (v <= x) {
                lX = v;
                break;
            }
        }

        for (; i < points.length; i++) {
            const p = points[i];
            const v = p.d[index];

            if (v !== lX) {
                rX = v;
                break;
            }

            lsum += p.v;
        }
        
        for (; i < points.length; i++) {
            const p = points[i];
            const v = p.d[index];

            if (v !== rX) {
                break;
            }

            rsum += p.v;
        }

        const inter = (x - lX) / (rX - lX);

        return lsum * (1 - inter) + rsum * inter;
    }
}

export class Cloud {
    private points: Point[] = [];
    private dims: Dimension[] = [];
    private needsUpdate = false;

    public constructor(private dimensions: number, private settings: CloudSettings) {
        for (let i = 0; i < dimensions; i++) {
            this.dims.push(new Dimension(i));
        }
    }

    public getPoints(): Point[] {
        this.update();

        return this.points;
    }

    public add(volume: number, d: number[]) {
        this.needsUpdate = true;

        if (volume <= 0) {
            return;
        }

        const P = Point(volume, d);

        this.points.push(P);
        
        for (const d of this.dims) {
            d.add(P);
        }
    }

    public sample(d: number[]): Point {
        this.update();

        const points = this.points;

        const {sum, weights} = this.weights(d);

        const wInv = sum ? (1 / sum) : 1;
        
        let Rd: number[];
        let v: number = 0;
        
        if (sum) {
            Rd = []
            Rd.length = this.dimensions;
            Rd.fill(0);
        } else {
            Rd = d;
        }

        for (let i = 0; i < points.length; i++) {
            const P = points[i];
            const w = weights[i] * wInv;

            v += P.v * w;

            if (sum) {
                for (let i2 = 0; i2 < this.dimensions; i2++) {
                    Rd[i2] += P.d[i2] * w;
                }
            }
        }
        
        const R = Point(v, Rd);

        return R;
    }
    
    private simplify() {
        const points = this.points;

        let displacement = 0;

        outer: do {
            for (let i = 0; i < points.length; i++) {
                const P = points[i];

                if (this.isBounds(P)) {
                    continue;
                }

                const {sum, weights} = this.weights(P.d, P);

                if (sum === 0) {
                    for (let i2 = points.length - 1; i2 >= 0; i2--) {
                        if (weights[i2] !== 1) {
                            continue;
                        }

                        const P2 = points[i2];

                        P.v += P2.v;

                        this.removeAt(i2);
                    }
                } else if (points.length > this.settings.maxPoints) {
                    for (let i2 = points.length - 1; i2 >= 0; i2--) {
                        const P2 = points[i2];
                        const v = P.v * weights[i2] / sum;

                        const vR = v / (v + P2.v);

                        P2.v += v;
                        
                        for (let i3 = 0; i3 < this.dimensions; i3++) {
                            P2.d[i3] = round((P2.d[i3] * (1 - vR) + P.d[i3] * vR));
                        }
                    }

                    displacement += P.v;

                    this.removeAt(i);
                } else {
                    continue;
                }

                continue outer;
            }

            break;
        } while (points.length > this.settings.maxPoints);

        return {displacement};
    }
    
    
    private update() {
        if (!this.needsUpdate) {
            return;
        }

        this.simplify();

        this.needsUpdate = false;

        for (const d of this.dims) {
            d.update();
        }

        this.points.sort((a, b) => a.v - b.v);
    }


    public removeAt(i: number, n = 1) {
        this.needsUpdate = true;

        const P = this.points[i];

        this.points.splice(i, n);

        for (const d of this.dims) {
            d.remove(P);
        }
    }
    
    private isBounds(P: Point) {
        for (const d of this.dims) {
            if (d.isBounds(P)) {
                return true;
            }
        }
    }

    private weights(d: number[], exclude?: Point) {
        const points = this.points;
        const weights: number[] = [];
        const pParam = 2;

        let sum = 0;

        let distWasZero = false;

        for (const p of this.points) {
            if (p === exclude) {
                weights.push(0);
                continue;
            }

            const dist = distance(p.d, d, this.dimensions);

            if (dist === 0) {
                distWasZero = true;
                weights.push(0);
            } else {
                const w = 1 / Math.pow(dist, pParam);
                weights.push(w);
                sum += w;
            }
        }

        if (distWasZero) {
            sum = 0;

            for (let i = 0; i < points.length; i++) {
                if (weights[i] !== 0) {
                    weights[i] = 0;
                } else if (points[i] !== exclude) {
                    weights[i] = 1;
                }
            }
        }

        return {
            sum, weights
        };
    }    
}

function average(A: Point, B: Point, dimensions: number) {
    const d: number[] = [];

    const v = A.v + B.v;

    const Ad = A.d;
    const Bd = B.d;

    const Ar = A.v / v;
    const Br = B.v / v;

    for (let i = 0; i < dimensions; i++) {
        d.push(Ad[i] * Ar + Bd[i] * Br);
    }

    return Point(v, d);
}

function distance(A: number[], B: number[], dimensions: number) {
    let sum = 0;

    for (let i = 0; i < dimensions; i++) {
        sum += (B[i] - A[i]) * (B[i] - A[i]);
    }

    return Math.sqrt(sum);
}

/*

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
