
import { ArraySortTree } from 'sort-tree';
import { Point, NumberArrayLike, round, area4 } from 'math';

/* When range selecting at the sides, assume the outer
 * points stretch this far beyond the side,
 * relative to the next inner point.
 */
const OVERHANG = 0.5;

export interface PointWeight {
    P: Point,
    w: number
}

export interface CloudSettings {
    maxPoints: number
}

export type Selection = Map<Point, number>;

export type DimensionCompare = (A: Point, B: Point) => number;

function PointWeight(P: Point, w: number) {
    return {P, w};
}

function nCompare(n: number): DimensionCompare {
    return (A: Point, B: Point) => {
        const dDiff = B[n] - A[n];

        if (dDiff !== 0) {
            return dDiff;
        }

        return 0;
    };
}

function fullCompare() {
    return (A: Point, B: Point) => {
        for (let i = 1; i < A.length; i++) {
            const dDiff = B[i] - A[i];

            if (dDiff !== 0) {
                return dDiff;
            }
        }

        return 0;
    };
}

export class Dimension {
    public tree: ArraySortTree<Point>;

    public constructor(
            public n: number,
            private cloud: Cloud,
            compare: DimensionCompare
    ) {

        this.tree = new ArraySortTree(cloud.points, compare);
    }
    
    public update(index: number) {
        this.tree.update(index);
    }
    
    public remove(index: number) {
        this.tree.remove(index);
    }

    public maxDistance() {
        const points = this.cloud.points;
        const tree = this.tree;
        const n = this.n;

        const min = points[tree.firstKey()][n];
        const max = points[tree.lastKey()][n];

        return max - min;
    }

    public isBounds(index: number) {
        const tree = this.tree;
        return tree.firstKey() === index || tree.lastKey() === index;
    }
    
    public range(X: Point, Y: Point): [number,number][] {
        const cloud = this.cloud;
        const tree = this.tree;
        const points = cloud.points;
        const n = this.n;

        const weights: [number,number][] = [];

        // list of weight indexes at which values change,
        // since the same value may be repeated
        const steps: number[] = [];
        let lastStep: Point;

        let start = tree.farKeyLeftOfValue(X);
        let end = tree.farKeyRightOfValue(Y);

        const XValue = X[n];
        const YValue = Y[n];

        // Selecting outside the range of keys
        // We need an extra value to calculate curves
        if (YValue < points[tree.firstKey()][n]) {
            end = tree.keyWithNextValue(end);
        } else if (XValue > points[tree.lastKey()][n]) {
            start = tree.keyWithPreviousValue(start);
        }

        for (const key of tree.keysFromKey(start, true)) {
            const P = points[key];

            if (!lastStep || lastStep[n] !== P[n]) {
                steps.push(weights.length);
                lastStep = P;
            }
             
            weights.push([key, 1]);

            if (key === end) {
                break;
            }
        }

        if (steps.length === 1) {
            // All points have the same value.
            for (let weight of weights) {
                const Pv = points[weight[0]][n];

                if (Pv < XValue || Pv > YValue) {
                    weight[1] = 0;
                }
            }

            return weights;
        }

        for (let i = 0; i < steps.length; i++) {
            const start = steps[i];
            const current = weights[start];

            let A: number;
            let C: number;
            const B = points[current[0]][n];
            
            let end = 0;

            if (i === 0) {
                end = steps[i+1];
                C = points[weights[end][0]][n];
                A = B + ((B - C) * OVERHANG);
            } else if (i + 1 === steps.length) {
                end = weights.length;
                A = points[weights[steps[i-1]][0]][n];
                C = B + ((B - A) * OVERHANG);
            } else {
                end = steps[i+1];
                A = points[weights[steps[i-1]][0]][n];
                C = points[weights[end][0]][n];
            }

            const volume = this.interpolate2(XValue, YValue, A, B, C);

            for (let i2 = start; i2 < end; i2++) {
                weights[i2][1] = volume;
            }
        }

        return weights;
    }

    /*
     * A, B, C are x-axis-values defining a curve that encloses a volume of 1 with the x-axis.
     * Returns the volume to the left of x.
     *
     * Basically a cumulative distribution function.
     *
     * TODO make this user-configurable
     */
    private interpolate(x: number, A: number, B: number, C: number): number {
        if (x > B) {
            const p = Math.pow((x - B) / (C - B), 1/2);
            return Math.min(1, (1 + p) / 2);
        }

        const p = Math.pow((B - x) / (B - A), 1/2);
        return Math.max(0, (1 - p) / 2);
    }
    
    private interpolate2(x: number, y: number, A: number, B: number, C: number) {
        const r = this.interpolate(y, A, B, C) - this.interpolate(x, A, B, C);
        return r;
    }
}

export class Cloud {
    public points: Point[] = [];
    public numPoints = 0;
    public totalVolume = 0;
    
    private lookupTree = new ArraySortTree(this.points, fullCompare());

    public dimensions: Dimension[] = [];

    public displacement: number;
    public readonly settings: CloudSettings;

    public constructor(settings: CloudSettings) {
        this.settings = settings;

        this.points.length = settings.maxPoints;

        this.addDimension();
    }

    public addDimension() {
        const dimensions = this.dimensions;

        if (this.settings.maxPoints < (dimensions.length) * 2) {
            throw new Error("At least [dimensions * 2] points are required.");
        }

        const l = this.numPoints;
        const points = this.points;
        const n = dimensions.length;

        const dim = new Dimension(n, this, nCompare(n));

        dimensions.push(dim);

        for (let i = 0; i < l; i++) {
            const P = points[i];

            if (P.length < dimensions.length) {
                const P2 = new Float64Array(dimensions.length);
                P2.set(P);
                points[i] = P2;
            }

            dim.update(i);
        }

        return n;
    }

    public getPoints(): Point[] {
        if (this.numPoints < this.points.length) {
            return this.points.slice(0, this.numPoints);
        }

        return this.points;
    }

    public add(p: Point) {
        for (let i = p.length; i >= 0; i--) {
            p[i] = round(p[i]);
        }

        this.totalVolume += p[0];

        const points = this.points;

        let index = this.getAt(p);

        if (index !== -1) {
            const E = points[index];
            E[0] = E[0] + p[0];
            this.dimensions[0].update(index);
            return;
        }

        if (this.numPoints === this.points.length) {
            this.simplify();
        }

        index = this.numPoints++;

        this.points[index] = p;
        
        this.updateInDimensions(index);    
    }
    
    private modify(target: number, data: Point) {
        const points = this.points;

        for (let i = data.length - 1; i >= 0; i--) {
            data[i] = round(data[i]);
        }

        const existing = this.getAt(data);

        if (existing === -1 || existing === target) {
            const P = points[target];
            P.set(data);
            this.updateInDimensions(target);
            return -1;
        }

        points[existing][0] += data[0];
        this.dimensions[0].update(existing);

        return this.remove(target);
    }

    private remove(target: number) {
        const points = this.points;

        const last = this.numPoints - 1;
        this.numPoints = last;
        
        this.removeFromDimensions(last);

        if (target === last) {
            return -1;
        }

        const old = points[target];
        points[target] = points[last];
        points[last] = old;

        this.updateInDimensions(target);

        return last;
    }
    
    public getAt(X: Point): number {
        const result = this.lookupTree.getKeys(X);

        if (result.length === 0) {
            return -1;
        }

        return result[0];
    }

    public ranges(ranges: NumberArrayLike[]): Selection {
        const points = this.points;
        const dimensions = this.dimensions;
        
        const selection = new Map<number, number>();

        const tmpA = new Float64Array(dimensions.length);
        const tmpB = new Float64Array(dimensions.length);

        let first = true;

        for (let i = 0; i < ranges.length; i++) {
            const rn = ranges[i];

            if (!rn) {
                continue;
            }

            const dim = dimensions[i];

            const range = new Map<number, number>();

            for (let i2 = 0; i2 < rn.length; i2 += 2) {
                tmpA[i] = rn[i2];
                tmpB[i] = rn[i2 + 1];
                const weights = dim.range(tmpA, tmpB);

                if (i2 === 0) {
                    for (const [index,w] of weights) {
                        range.set(index, w);
                    }
                } else {
                    for (const [index,w] of weights) {
                        range.set(index, w + range.get(index));
                    }
                }
            }

            if (first) {
                for (const [index, w] of range.entries()) {
                    selection.set(index, w);
                }

                first = false;

                continue;
            }

            for (const [index, w] of range) {
                if (!selection.has(index)) {
                    continue;
                }

                const sw = selection.get(index) * w;

                selection.set(index, sw);
            }

            for (const index of selection.keys()) {
                if (!range.has(index)) {
                    selection.delete(index);
                }
            }
        }

        const result: Selection = new Map();

        for (const [index, w] of selection) {
            result.set(points[index].slice(0), w);
        }
        
        return result;
    }

    private simplify() {
        // The smaller the area a point encloses with its neighbours,
        // the closer it is to their interpolated values
        let smallestArea = Infinity;
        let smallestAreaIndex = -1;

        for (let i = this.numPoints - 1; i >= 0; i--) {
            if (this.isBounds(i)) {
                continue;
            }

            const area = this.area(i);

            if (area <= smallestArea) {
                smallestArea = area;
                smallestAreaIndex = i;
            }
        }

        if (smallestAreaIndex !== -1) {
            this.distribute(smallestAreaIndex);
        }
    }
    
    // Distributes the point at index to others while preserving totals
    // TODO Currently about 50% of CPU time for insertions is spent here
    private distribute(index: number) {
        const dimensions = this.dimensions;
        const dlen = dimensions.length;
        const points = this.points;

        const tmp = new Float64Array(dlen);

        const P = points[index].slice(0);

        this.remove(index);

        const weights = this.distributeWeights(P);

        let l = this.numPoints;
        for (let i = 0; i < l; i++) {
            const P2 = points[i];
            const V = P[0] * weights[i];

            const combinedV = P2[0] + V;

            if (combinedV < Number.EPSILON) {
                continue;
            }
            
            for (let i2 = dlen - 1; i2 > 0; i2--) {
                tmp[i2] = ((P2[i2] * P2[0]) + (P[i2] * V)) / combinedV;
            }
            
            tmp[0] = combinedV;

            const swapped = this.modify(i, tmp);

            if (swapped !== -1) {
                weights[i] = weights[swapped];
                i--;
                l--;
            }
        }
        
        this.displacement += P[0]; 
    }
 
    private removeFromDimensions(index: number) {
        const dimensions = this.dimensions;

        for (let i = dimensions.length - 1; i >= 0; i--) {
            dimensions[i].remove(index);
        }
        
        this.lookupTree.remove(index);
    }
    
    private updateInDimensions(index: number) {
        const dimensions = this.dimensions;

        for (let i = dimensions.length - 1; i >= 0; i--) {
            dimensions[i].update(index);
        }

        this.lookupTree.update(index);
    }

    private distributeWeights(P: Float64Array) {
        const points = this.points;
        const weights = new Float64Array(this.numPoints);

        let weightSum = 0;

        const l = this.numPoints;

        for (let i = 0; i < l; i++) {
            const T = points[i];

            const dist = this.distance(T, P);

            const w = T[0] / dist;

            weights[i] = w;
            weightSum += w;
        }

        if (weightSum > Number.EPSILON) {
            const weightSumInv = 1 / weightSum;
            for (let i = 0; i < l; i++) {
                weights[i] = weights[i] * weightSumInv;
            }
        } else {
            return null;
        }

        return weights;
    }
    
    private isBounds(index: number) {
        const dimensions = this.dimensions;

        // Skip volume dimension
        for (let i = dimensions.length - 1; i > 0; i--) {
            if (dimensions[i].isBounds(index)) {
                return true;
            }
        }
    }
    
    private distance(a: NumberArrayLike, b: NumberArrayLike) {
        let dist = 0;

        const dimensions = this.dimensions;

        for (let i = dimensions.length - 1; i > 0; i--) {
            let rD = dimensions[i].maxDistance();

            if (rD === 0) {
                continue;
            }

            const r = (a[i] - b[i]) / rD;

            dist += r * r;
        }

        return dist;
    }
    
    // Returns an estimate on the 'area' that would be displaced when removing point X
    // on charts plotting all of the various dimensions against each other
    private area(index: number) {
        const dimensions = this.dimensions;
        const points = this.points;
        const P = points[index];
        const totalVolume = this.totalVolume;

        // Area is defined by 4 points with x,v pairs:
        // L = (x left of P, volume left of P)
        // S = P(Px, (volume/average at P))
        // R = (x right of P, volume right of P)
        // N = (Px, (volume/average at P) - (volume/value of P))
        //
        // Area = (R, S, L, N)
        const Area = new Float64Array(8);
        
        let totalArea = 0;

        for (let i = dimensions.length - 1; i > 0; i--) {
            const d1 = dimensions[i];
            const d1range = d1.maxDistance();
            const tree = d1.tree;

            // We're not supposed to be called with bounding points,
            // so we don't check whether these exist here

            const middle = tree.keysWithSameValue(index);
            const right = tree.keysWithNextValue(index);
            const left = tree.keysWithPreviousValue(index);

            if (left.length === 0 || right.length === 0) {
                continue;
            }

            Area[0] = points[right[0]][i]; // Rx
            Area[2] = P[i]; // Px = Sx
            Area[4] = points[left[0]][i]; // Lx
            Area[6] = P[i]; // Sx

            const Rv = sumValues(right, 0);
            const Sv = sumValues(middle, 0);
            const Lv = sumValues(left, 0);
            const Nv = Sv - P[0];
 
            for (let i2 = i - 1; i2 >= 0; i2--) {
                const d2range = (i2 === 0) ? totalVolume : dimensions[i2].maxDistance();

                if (i2 === 0) {
                    Area[1] = Rv;
                    Area[3] = Sv;
                    Area[5] = Lv;
                    Area[7] = Nv;
                } else {
                    const sumM = sumMultipliedValues(middle, i2, 0);
                    Area[1] = (Rv < Number.EPSILON) ? 0 : sumMultipliedValues(right, i2, 0) / Rv; // Rv
                    Area[3] = (Sv < Number.EPSILON) ? 0 : sumM / Sv; // Sv
                    Area[5] = (Lv < Number.EPSILON) ? 0 : sumMultipliedValues(left, i2, 0) / Lv; // Lv
                    Area[7] = (Nv < Number.EPSILON) ? 0 : (sumM - P[i2] * P[0]) / Nv; // Nv
                }

                const area = Math.abs(area4(Area)) / d1range / d2range;

                totalArea += area;
            }

            return totalArea;
        }
        
        function sumMultipliedValues(list: number[], n: number, m: number) {
            let sum = 0;
            for (let i of list) {
                const P = points[i];
                sum += P[n] * P[m];
            }
            return sum;
        }

        function sumValues(list: number[], n: number) {
            let sum = 0;
            for (let i of list) {
                sum += points[i][n];
            }
            return sum;
        }

        return totalArea;
    }

}

export function scaleSelection(selection: Selection, scale: number) {
    for (const [P, w] of selection.entries()) {
        selection.set(P, w * scale);
    }
}
    
export function selectionSize(selection: Selection) {
    let v: number = 0;

    for (const [P, w] of selection.entries()) {
        v += P[0] * w;
    }

    return v;
}

export function averageSelection(selection: Selection, size: number, dimensions: number) {
    let Rd = new Float64Array(dimensions);

    for (const [P, w] of selection.entries()) {
        for (let i = 1; i < dimensions; i++) {
            Rd[i] += P[i] * P[0] * w / size;
        }
    }

    return Rd;
}

export function sumSelection(selection: Selection, dimensions: number) {
    let Rd = new Float64Array(dimensions);

    for (const [P, w] of selection.entries()) {
        Rd[0] += P[0] * w;
    }

    for (let i = 1; i < dimensions; i++) {
        for (const [P, w] of selection) {
            Rd[i] += P[i] * P[0] * w;
        }
    }

    return Rd;
}

export function calculateError(expected: Selection, measured: Selection, dimensions: number) {
    const sumE = sumSelection(expected, dimensions);
    const sumM = sumSelection(measured, dimensions);

    const error = new Float64Array(dimensions);

    for (let i = 0; i < dimensions; i++) {
        const e = sumE[i];
        const m = sumM[i];

        const d = m - e;
        const r = Math.abs(m) + Math.abs(e);

        if (r > Number.EPSILON) {
            error[i] = 2 * d / r;
        }
    }

    return error;
}
