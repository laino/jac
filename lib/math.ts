
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
    dimensions: number,
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

    public min = 0;
    public max = 0;

    public constructor(public n: number) {
    }
    
    public add(P: Point) {
        this.points.push(P);
    }
    
    public update() {
        const points = this.points;
        const n = this.n;

        points.sort((a, b) => {
            const aD = a.d;
            const bD = b.d;

            const dDiff = aD[n] - bD[n];

            if (dDiff !== 0) {
                return dDiff;
            }

            for (let i = 0; i < aD.length; i++) {
                if (i === n) {
                    continue;
                }

                const dDiff = aD[i] - bD[i];

                if (dDiff !== 0) {
                    return dDiff;
                }
            }

            return 0;
        });

        if (points.length) {
            this.min = points[0].d[n];
            this.max = points[points.length - 1].d[n];
        } else {
            this.min = 0;
            this.max = 0;
        }
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

        if (x - y === 0 || points.length < 1) {
            return [];
        }

        const weights: PointWeight[] = [];

        let min = this.indexLT(x);
        let max = min + 1;

        // Add fully enclosed points and calculated max
        for (; max < points.length; max++) {
            const C = points[max];
            const Cv = C.d[this.n];

            // Last point
            if (Cv > y) {
                break;
            }

            weights.push(PointWeight(C, 1));
        }
            
        // We didn't enclose any point
        if (weights.length === 0) {
            const ratioA = this.interpolate(min, x);
            const ratioB = this.interpolate(min, y);

            if (min === -1) {
                weights.push(PointWeight(points[0], ratioA - ratioB));
            } else if (max === points.length) {
                weights.push(PointWeight(points[points.length - 1], ratioB - ratioA));
            }

            if (ratioA < 0.5) {
                if (ratioB < 0.5) {
                    weights.push(PointWeight(points[min], ratioB - ratioA));
                } else {
                    weights.push(PointWeight(points[min], 0.5 - ratioA));
                }
            }
            
            if (ratioB > 0.5) {
                if (ratioA > 0.5) {
                    weights.push(PointWeight(points[min], ratioB - ratioA));
                } else {
                    weights.push(PointWeight(points[min], ratioB - 0.5));
                }
            }

            return weights;
        }

        // Interpolate between first point and the outside
        let ratio = this.interpolate(min, x);

        if (ratio >= 0.5) {
            let i = 0;
            const cmp = weights[i].P.d[this.n];
            for (; i < weights.length && cmp === weights[i].P.d[this.n]; i++) {
                weights[i].w += 0.5 - ratio;
            }
        } else if (min > -1) {
            let i = min;
            const cmp = points[i].d[this.n];
            for (; i >= 0 && cmp === points[i].d[this.n]; i--) {
                weights.push(PointWeight(points[i], 0.5 - ratio));
            }
        }
        
        // Interpolate between last point and the outside
        ratio = this.interpolate(max - 1, y);

        if (ratio <= 0.5) {
            let i = weights.length - 1;
            const cmp = weights[i].P.d[this.n];
            for (; i >= 0 && cmp === weights[i].P.d[this.n]; i--) {
                weights[i].w -= 0.5 - ratio;
            }
        } else if (max < points.length) {
            let i = max;
            const cmp = points[i].d[this.n];
            for (; i < points.length && cmp === points[i].d[this.n]; i++) {
                weights.push(PointWeight(points[i], ratio - 0.5));
            }
        }

        return weights;
    }

    private interpolate(a: number, x: number): number {
        const points = this.points;
        
        if (a === -1) {
            return 1 + this.interpolate(a + 1, x);
        }

        if (a + 1 == points.length) {
            return this.interpolate(a - 1, x) - 1;
        }

        const A = points[a];
        const B = points[a + 1];

        const d = B.d[this.n] - A.d[this.n];

        // Linear interpolation
        // Using different functions yields different range selection behaviors
        return (x - A.d[this.n]) / d;
    }
    
    public getAt(x: number): Point[] {
        const points = this.points;
        const results: Point[] = [];

        let i = this.indexLT(x) + 1;

        for (; i < points.length; i++) {
            const P = points[i];

            if (P.d[this.n] !== x) {
                break;
            }

            results.push(P);
        }

        return results;
    }

    public indexLT(x: number): number {
        const points = this.points;

        if (x <= this.min) {
            return -1;
        }

        if (x > this.max) {
            return points.length - 1;
        }

        let min = 0;
        let max = points.length - 1;

        while (min <= max) {
            const i = Math.floor((min + max) / 2);
            const v = points[i].d[this.n];

            if (x < v) {
                max = i - 1;
            } else if (x > v && (i + 1 === points.length || x <= points[i + 1].d[this.n])) {
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
    private dimensions: number;

    public needsUpdate = false;

    public displacement: number;
    public readonly settings: CloudSettings;

    public constructor(settings: CloudSettings) {
        this.dimensions = settings.dimensions;

        this.settings = Object.freeze(Object.assign({}, settings));

        for (let i = 0; i < this.dimensions; i++) {
            this.dims.push(new Dimension(i));
        }
    }

    public getPoints(): Point[] {
        return this.points;
    }

    public add(volume: number, d: number[]) {
        if (volume <= 0) {
            return;
        }
        
        this.needsUpdate = true;
 
        const P = Point(volume, d);

        this.points.push(P);
        
        for (const d of this.dims) {
            d.add(P);
        }
    }

    public range(from: number[], to: number[]): Selection { 
        this.update();

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
                if (!selection.has(P)) {
                    continue;
                }

                const sw = selection.get(P) * w;

                seen.add(P);

                selection.set(P, sw);
            }

            for (const P of selection.keys()) {
                if (!seen.has(P)) {
                    selection.delete(P);
                }
            }
        }
        
        return new Selection(this, selection);
    }

    public point(d: number[]): Selection {
        this.update();

        const points = this.points;

        const weights = this.weights(d);

        const selection = new Map<Point, number>();

        for (let i = 0; i < points.length; i++) {
            const P = points[i];
            const w = weights[i];

            selection.set(P, w);
        }
        
        return new Selection(this, selection);
    }

    private removeDuplicates() {
        const dPoints = this.dims[0].points;

        let removedAny = false;

        // Find duplicate points
        outer: for (let i = dPoints.length - 1; i > 0; i--) {
            const P = dPoints[i - 1];
            const N = dPoints[i];

            const Pd = P.d;
            const Nd = N.d;

            for (let i = 0; i < this.dimensions; i++) {
                if (Pd[i] !== Nd[i]) {
                    continue outer;
                }
            }

            P.v += N.v;

            this.removeAt(i);

            removedAny = true;
        }

        return removedAny;
    }
    
    private simplify() {
        const points = this.points;

        if (points.length <= this.settings.maxPoints) {
            return false;
        }

        // TODO: with this.weights this is O(n^2)
        for (let i = 0; i < points.length; i++) {
            const P = points[i];

            if (this.isBounds(P)) {
                continue;
            }

            const weights = this.weights(P.d, P);

            for (let i2 = points.length - 1; i2 >= 0; i2--) {
                const P2 = points[i2];
                const V = P.v * weights[i2];

                if (V === 0) {
                    continue;
                }

                const combinedV = P2.v + V;
                
                for (let i3 = 0; i3 < this.dimensions; i3++) {
                    const old = P2.d[i3];

                    P2.d[i3] = ((old * P2.v) + (P.d[i3] * V)) / combinedV;
                }
                
                P2.v = combinedV;
            }

            this.displacement += P.v;

            this.removeAt(i);

            return true;
        }

        return false;
    }
    
    private update() {
        if (!this.needsUpdate) {
            return;
        }

        this.needsUpdate = false;

        do  {
            for (const d of this.dims) {
                d.update();
            }

            this.points.sort((a, b) => a.v - b.v);
        } while (this.removeDuplicates() || this.simplify())
    }

    private removeAt(i: number, n = 1) {
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

        let zeros = 0;
        let sum = 0;

        for (const P of this.points) {
            if (P === exclude) {
                weights.push(0);
                continue;
            }

            const dist = this.distance(P.d, d);

            if (dist === 0) {
                zeros++;
                weights.push(0);
            } else {
                const w = 1 / dist;
                weights.push(w);
                sum += w;
            }
        }

        if (zeros) {
            const zerosInv = 1 / zeros;

            for (let i = 0; i < points.length; i++) {
                if (weights[i] !== 0) {
                    weights[i] = 0;
                } else if (points[i] !== exclude) {
                    weights[i] = zerosInv;
                }
            }
        } else {
            const sumInv = 1 / sum;
            for (let i = 0; i < points.length; i++) {
                weights[i] *= sumInv;
            }
        }

        return weights;
    }

    private distance(a: number[], b: number[]) {
        // Simplified because we only use this
        // for relative comparisons anyways

        let dist = 0;

        for (let i = 0; i < this.dimensions; i++) {
            const d = this.dims[i];
            let rD = d.max - d.min;

            if (rD === 0) {
                continue;
            }

            const r = (a[i] - b[i]) / (d.max - d.min);

            dist += r * r;
        }

        return dist;
    }
}

class Selection {
    public constructor(
        private cloud: Cloud,
        private selection: Map<Point, number>) {
    }

    public sum() {
        const dimensions = this.cloud.settings.dimensions;
        const s = this.selection;

        let Rd: number[];
        let v: number = 0;
        
        Rd = [];
        Rd.length = dimensions;
        Rd.fill(0);

        for (const [P, w] of s.entries()) {
            v += P.v * w;
        }

        for (const [P, w] of s.entries()) {
            for (let i = 0; i < dimensions; i++) {
                Rd[i] += P.d[i] * P.v * w / v;
            }
        }

        return Point(v, Rd);
    }
}
