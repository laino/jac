
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

export interface PointWeight {
    P: Point,
    w: number
}

export interface CloudSettings {
    maxPoints: number
}

function PointWeight(P: Point, w: number) {
    return {P, w};
}

function Point(v: number, di: number[]) {
    const d = [];

    for (const n of di) {
        d.push(round(n));
    }

    return {v: round(v), d};
}

export class Dimension {
    public points: Point[] = [];

    public constructor(public n: number) {
    }
    
    public add(point: Point) {
        this.points.push(point);
    }
    
    public update() {
        const n = this.n;

        this.points.sort((a, b) => {
            const dDiff = a.d[n] - b.d[n];

            if (dDiff !== 0) {
                return dDiff;
            }

            return a.v - b.v;
        });
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
    
    public range(x: number, y: number): PointWeight[] {
        const points = this.points;

        if (x - y === 0 || points.length < 2) {
            return [];
        }

        const weights: PointWeight[] = [];

        let min = this.indexLT(x);

        let max = min + 1;

        for (; max < points.length; max++) {
            const C = points[max];
            const Cv = C.d[this.n];

            // Last point
            if (Cv > y) {
                break;
            }

            weights.push(PointWeight(C, 1));
        }
            
        // Weights is now the list of fully enclosed points

        if (weights.length === 0) {
            // range encloses no points
            // TODO
            return weights;
        }

        // Interpolate between first point and the outside
        if (min > -1) {
            const ratio = this.interpolate(min, x);

            if (ratio >= 0.5) {
                let i = 0;
                const cmp = weights[i].P.d[this.n];
                for (; i < weights.length && cmp === weights[i].P.d[this.n]; i++) {
                    weights[i].w += 0.5 - ratio;
                }
            } else {
                let i = min;
                const cmp = points[i].d[this.n];
                for (; i >= 0 && cmp === points[i].d[this.n]; i--) {
                    weights.push(PointWeight(points[i], 0.5 - ratio));
                }
            }
        }
        
        // Interpolate between last point and the outside
        if (max < points.length) {
            const ratio = this.interpolate(max - 1, y);

            if (ratio > 0.5) {
                let i = max;
                const cmp = points[i].d[this.n];
                for (; i < points.length && cmp === points[i].d[this.n]; i++) {
                    weights.push(PointWeight(points[i], ratio - 0.5));
                }
            } else {
                let i = weights.length - 1;
                const cmp = weights[i].P.d[this.n];
                for (; i >= 0 && cmp === weights[i].P.d[this.n]; i--) {
                    weights[i].w -= 0.5 - ratio;
                }
            }
        }
            
        return weights;
    }

    private interpolate(a: number, x: number) {
        const points = this.points;
        
        if (a + 1 == points.length) {
            return -this.interpolate(a - 1, x);
        }
        
        if (a === -1) {
            return -this.interpolate(a + 1, x);
        }

        const A = points[a];
        const B = points[a + 1];

        const d = B.d[this.n] - A.d[this.n];

        // Linear interpolation
        // Using different functions yields different range selection behaviors
        return (x - A.d[this.n]) / d;
    }

    public indexLT(x: number): number {
        const points = this.points;

        let min = 0;
        let max = points.length;

        while (min < max) {
            const i = Math.floor((min + max) / 2);
            const v = points[i].d[this.n];

            if (v > x) {
                max = i - 1;
            } else if (v < x && (i + 1 === points.length || points[i + 1].d[this.n] >= x)) {
                return i;
            } else {
                min = i + 1;
            }
        }

        return -1;
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

    public range(from: number[], to: number[]): Point {
        this.update();

        let Rd: number[];
        let v: number = 0;
        
        Rd = []
        Rd.length = this.dimensions;
        Rd.fill(0);

        const selection = new Map<Point, number>();

        for (let i = 0; i < this.dimensions; i++) {
            const range = this.dims[i].range(from[i], to[i]);

            if (i === 0) {
                for (const {P, w} of range) {
                    selection.set(P, w);
                }
                continue;
            }

            const seen = new Set<Point>();

            for (const {P, w} of range) {
                seen.add(P);

                if (selection.has(P)) {
                    selection.set(P, selection.get(P) * w);
                }
            }

            for (const P of selection.keys()) {
                seen.delete(P);
            }
            
            for (const P of seen) {
                selection.delete(P);
            }
        }

        for (const [P, w] of selection.entries()) {
            v += P.v * w;
        }

        for (const [P, w] of selection.entries()) {
            for (let i = 0; i < this.dimensions; i++) {
                Rd[i] += P.d[i] * P.v * w / v;
            }
        }

        console.log(selection);

        return Point(v, Rd);
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
                        const V = P.v / sum * weights[i2];
                        const combinedV = P2.v + V;
                        
                        for (let i3 = 0; i3 < this.dimensions; i3++) {
                            const old = P2.d[i3];

                            P2.d[i3] = ((old * P2.v) + (P.d[i3] * V)) / combinedV;
                        }
                        
                        P2.v = combinedV;
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
        const pParam = Math.E;

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

function distance(A: number[], B: number[], dimensions: number) {
    let sum = 0;

    for (let i = 0; i < dimensions; i++) {
        sum += (B[i] - A[i]) * (B[i] - A[i]);
    }

    return Math.sqrt(sum);
}
