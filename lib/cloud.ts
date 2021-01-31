
import { ArraySortTree } from 'sort-tree';
import { Point, NumberArrayLike, angle } from 'math';

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

    public isBounds(index: number) {
        const tree = this.tree;
        return tree.firstKey() === index || tree.lastKey() === index;
    }
    
    public range(X: Point, Y: Point): PointWeight[] {
        const cloud = this.cloud;
        const tree = this.tree;
        const points = cloud.points;
        const n = this.n;

        const weights: PointWeight[] = [];

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
             
            weights.push(PointWeight(P, 1));

            if (key === end) {
                break;
            }
        }

        if (steps.length === 1) {
            // All points have the same value.
            for (let weight of weights) {
                const Pv = weight.P[n];

                if (Pv < XValue || Pv > YValue) {
                    weight.w = 0;
                }
            }

            console.log('same', weights);
            return weights;
        }

        for (let i = 0; i < steps.length; i++) {
            const stepIndex = steps[i];
            const current = weights[stepIndex];

            let A: number;
            let C: number;
            const B = current.P[n];
            
            let end = 0;

            if (i === 0) {
                end = steps[i+1];
                C = weights[end].P[n];
                A = B + (B - C);
            } else if (i + 1 === steps.length) {
                end = weights.length;
                A = weights[steps[i-1]].P[n];
                C = B + (B - A);
            } else {
                end = steps[i+1];
                A = weights[steps[i-1]].P[n];
                C = weights[end].P[n];
            }

            const volume = this.interpolate2(XValue, YValue, A, B, C);

            for (let i2 = stepIndex; i2 < end; i2++) {
                weights[i2].w = volume;
            }
        }

        console.log(weights);

        return weights;
    }

    // A, B, C are x-axis-values defining a curve that encloses a volume of 1 with the x-axis.
    //
    // Returns the volume to the left of x.
    private interpolate(x: number, A: number, B: number, C: number): number {
        if (x > B) {
            return Math.min(1, ((x - B) / (C - B) / 2) + 0.5);
        }

        return Math.max(0, (x - A) / (B - A) / 2);
    }
    
    private interpolate2(x: number, y: number, A: number, B: number, C: number): number {
        return this.interpolate(y, A, B, C) - this.interpolate(x, A, B, C);
    }
}

export class Cloud {
    public points: Point[] = [];
    public numPoints = 0;

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

        if (this.settings.maxPoints < (dimensions.length + 1) * 2) {
            throw new Error("At least [dimensions * 2] points are required.");
        }

        const l = this.numPoints;
        const points = this.points;

        const dim = new Dimension(dimensions.length, this, 
            dimensions.length === 0 ? fullCompare() : nCompare(dimensions.length));

        dimensions.push(dim);

        for (let i = 0; i < l; i++) {
            const p = points[i];

            if (p.length < dimensions.length) {
                const n = new Float64Array(dimensions.length);
                n.set(p);
                points[i] = p;
            }

            dim.update(i);
            dimensions[0].update(i);
        }

        return dimensions.length - 1;
    }

    public getPoints(): Point[] {
        if (this.numPoints < this.points.length) {
            return this.points.slice(0, this.numPoints);
        }

        return this.points;
    }

    public add(p: Point) {
        const points = this.points;

        let index = this.getAt(p);

        if (index !== -1) {
            points[index][0] += p[0];     
            return;
        }

        if (this.numPoints === this.points.length) {
            index = this.simplify();
        }  else {
            index = this.numPoints++;
        }

        this.points[index] = p;
        
        this.updateInDimensions(index);
    }
    
    public getAt(X: Point): number {
        const dimensions = this.dimensions;

        const result = dimensions[0].tree.getKeys(X);

        if (result.length === 0) {
            return -1;
        }

        return result[0];
    }

    public ranges(ranges: NumberArrayLike[]) {
        const selection = new Map<Point, number>();

        const dimensions = this.dimensions;

        const tmpA = new Float64Array(dimensions.length);
        const tmpB = new Float64Array(dimensions.length);

        for (let i = 0; i < dimensions.length; i++) {
            const rn = ranges[i];

            if (!rn) {
                continue;
            }

            const dim = dimensions[i];

            const range = new Map<Point, number>();

            for (let i2 = 0; i2 < rn.length; i2 += 2) {
                tmpA[i] = rn[i2];
                tmpB[i] = rn[i2 + 1];
                const s = dim.range(tmpA, tmpB);

                if (i2 === 0) {
                    for (const {P, w} of s) {
                        range.set(P, w);
                    }
                } else {
                    for (const {P, w} of s) {
                        range.set(P, w + range.get(P));
                    }
                }
            }

            if (i === 0) {
                for (const [P, w] of range.entries()) {
                    selection.set(P, w);
                }

                continue;
            }

            for (const [P, w] of range) {
                if (!selection.has(P)) {
                    continue;
                }

                const sw = selection.get(P) * w;

                selection.set(P, sw);
            }

            for (const P of selection.keys()) {
                if (!range.has(P)) {
                    selection.delete(P);
                }
            }
        }
        
        return selection;
    }

    public point(d: Float64Array): Selection {
        const points = this.points;

        const weights = this.weights(d);

        const selection = new Map<Point, number>();

        const l = this.numPoints;

        for (let i = 0; i < l; i++) {
            const P = points[i];
            const w = weights[i];

            selection.set(P, w);
        }
        
        return selection;
    }
 
    private simplify(): number {
        // The higher the angle a point spans towards its neighbours,
        // the closer it is to their interpolated values
        let highestAngle = 0;
        let highestAngleIndex = -1;

        for (let i = this.numPoints - 1; i >= 0; i--) {
            if (this.isBounds(i)) {
                continue;
            }

            const angle = this.angle(i);

            if (angle >= highestAngle) {
                highestAngle = angle;
                highestAngleIndex = i;
            }
        }

        if (highestAngleIndex !== -1) {
            this.distribute(highestAngleIndex);
        }

        return highestAngleIndex;
    }

    private angle(index: number) {
        const dimensions = this.dimensions;
        const points = this.points;
        const P = points[index];

        let totalAngle = 0;

        const tmpA = [0, 0];
        const tmpB = [0, 0];

        for (let i = dimensions.length - 1; i > 0; i--) {
            const tree = dimensions[i].tree;

            // We're not supposed to be called with bounding points,
            // so we don't check whether these exist here

            const right = tree.keyRightOfKey(index);
            const left = tree.keyLeftOfKey(index);

            const R = points[right];
            const L = points[left];

            tmpA[0] = R[0] - P[0];
            tmpA[1] = R[i] - P[i];

            tmpB[0] = L[0] - P[0];
            tmpB[1] = L[i] - P[i];

            // TODO for performance we might want to calculate this inline
            totalAngle += angle(tmpA, tmpB);
        }

        // averaging would be pointless, since it's only used for comparison
        return totalAngle;
    }

    // Distributes the point at index to others while preserving totals
    // TODO Currently about 50% of CPU time for insertions is spent here
    private distribute(index: number) {
        const dimensions = this.dimensions;
        const dlen = dimensions.length;
        const points = this.points;
        let l = this.numPoints;

        const tmp = new Float64Array(dlen);

        const P = points[index];
        const weights = this.weights(P, P);

        for (let i = 0; i < l; i++) {
            const P2 = points[i];
            const V = P[0] * weights[i];

            if (V === 0) {
                continue;
            }

            const combinedV = P2[0] + V;
            
            for (let i2 = dlen - 1; i2 >= 0; i2--) {
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

    private modify(target: number, data: Point) {
        const points = this.points;

        const P = points[target];

        const existing = this.getAt(data);

        if (existing === -1) {
            P.set(data);

            this.updateInDimensions(target);

            return -1;
        }

        points[existing][0] += data[0];

        if (existing !== target) {
            this.remove(target);
        }
    }


    private remove(target: number) {
        const points = this.points;

        const last = this.numPoints - 1;
        this.numPoints = last;

        if (target === last) {
            this.removeFromDimensions(last);

            return last;
        }

        points[target] = points[last];

        this.removeFromDimensions(last);
        this.updateInDimensions(target);

        return last;
    }
    
    private removeFromDimensions(index: number) {
        const dimensions = this.dimensions;

        for (let i = dimensions.length - 1; i >= 0; i--) {
            dimensions[i].remove(index);
        }
    }
    
    private updateInDimensions(index: number) {
        const dimensions = this.dimensions;

        for (let i = dimensions.length - 1; i >= 0; i--) {
            dimensions[i].update(index);
        }
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

    private weights(d: NumberArrayLike, exclude?: Point) {
        const points = this.points;
        const weights = new Float64Array(this.numPoints);

        let zeros = 0;
        let sum = 0;

        const l = this.numPoints;

        for (let i = 0; i < l; i++) {
            const P = points[i];

            if (P === exclude) {
                continue;
            }

            const dist = this.distance(P, d);

            if (dist === 0) {
                zeros++;
            } else {
                const w = 1 / dist;
                weights[i] = w;
                sum += w;
            }
        }

        if (zeros) {
            const zerosInv = 1 / zeros;

            for (let i = 0; i < l; i++) {
                if (weights[i] !== 0) {
                    weights[i] = 0;
                } else if (points[i] !== exclude) {
                    weights[i] = zerosInv;
                }
            }
        } else {
            const sumInv = 1 / sum;
            for (let i = 0; i < l; i++) {
                weights[i] *= sumInv;
            }
        }

        return weights;
    }

    private distance(a: NumberArrayLike, b: NumberArrayLike) {
        // Simplified because we only use this
        // for relative comparisons anyways

        let dist = 0;

        const dimensions = this.dimensions;
        const points = this.points;

        for (let i = dimensions.length - 1; i >= 0; i--) {
            const tree = dimensions[i].tree;

            const min = points[tree.firstKey()][i];
            const max = points[tree.lastKey()][i];

            let rD = max - min;

            if (rD === 0) {
                continue;
            }

            const r = (a[i] - b[i]) / rD;

            dist += r * r;
        }

        return dist;
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
