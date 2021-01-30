
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

    public updateAll() {
        this.tree.updateAll();
    }

    public isBounds(index: number) {
        const tree = this.tree;
        return tree.first.key === index || tree.last.key === index;
    }
    
    public range(x: number, y: number): PointWeight[] {
        const cloud = this.cloud;
        const tree = this.tree;
        const points = cloud.points;

        if (x - y === 0 || cloud.numPoints < 1) {
            return [];
        }

        const weights: PointWeight[] = [];

        const min = this.nodeLT(x);
        const max = tree.iterateRight(min, (node) => {
            const C = points[node.key];
            const Cv = C[this.n];

            // Last point
            if (Cv > y) {
                return false;
            }

            weights.push(PointWeight(C, 1));

            return true;
        });

        /*
        // We didn't enclose any point
        if (weights.length === 0) {
            const ratioA = this.interpolate(min, x);
            const ratioB = this.interpolate(min, y);

            if (min === -1) {
                weights.push(PointWeight(sorted[0], ratioA - ratioB));
            } else if (max === cloud.numPoints) {
                weights.push(PointWeight(sorted[cloud.numPoints - 1], ratioB - ratioA));
            }

            if (ratioA < 0.5) {
                if (ratioB < 0.5) {
                    weights.push(PointWeight(sorted[min], ratioB - ratioA));
                } else {
                    weights.push(PointWeight(sorted[min], 0.5 - ratioA));
                }
            }
            
            if (ratioB > 0.5) {
                if (ratioA > 0.5) {
                    weights.push(PointWeight(sorted[min], ratioB - ratioA));
                } else {
                    weights.push(PointWeight(sorted[min], ratioB - 0.5));
                }
            }

            return weights;
        }
        */

        /*
        // Interpolate between first point and the outside
        let ratio = this.interpolate(min, x);

        if (ratio >= 0.5) {
            let i = 0;
            const cmp = weights[i].P[this.n];
            for (; i < weights.length && cmp === weights[i].P[this.n]; i++) {
                weights[i].w += 0.5 - ratio;
            }
        } else if (min > -1) {
            let i = min;
            const cmp = sorted[i][this.n];
            for (; i >= 0 && cmp === sorted[i][this.n]; i--) {
                weights.push(PointWeight(sorted[i], 0.5 - ratio));
            }
        }
        
        // Interpolate between last point and the outside
        ratio = this.interpolate(max - 1, y);

        if (ratio <= 0.5) {
            let i = weights.length - 1;
            const cmp = weights[i].P[this.n];
            for (; i >= 0 && cmp === weights[i].P[this.n]; i--) {
                weights[i].w -= 0.5 - ratio;
            }
        } else if (max < cloud.numPoints) {
            let i = max;
            const cmp = sorted[i][this.n];
            for (; i < cloud.numPoints && cmp === sorted[i][this.n]; i++) {
                weights.push(PointWeight(sorted[i], ratio - 0.5));
            }
        }
        */

        return weights;
    }

    /*
    private interpolate(a: number, x: number): number {
        const sorted = this.sorted;
        const cloud = this.cloud;
        
        if (a === -1) {
            return 1 + this.interpolate(a + 1, x);
        }

        if (a + 1 == cloud.numPoints) {
            return this.interpolate(a - 1, x) - 1;
        }

        const A = sorted[a];
        const B = sorted[a + 1];

        const d = B[this.n] - A[this.n];

        // Linear interpolation
        // Using different functions yields different range selection behaviors
        return (x - A[this.n]) / d;
    }
    */

    public nodeLT(x: number) {
        const tree = this.tree;

        return tree.first;
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
            dimensions.length === 1 ? fullCompare() : nCompare(dimensions.length));

        dimensions.push(dim);

        for (let i = 0; i < l; i++) {
            const p = points[i];

            if (p.length < dimensions.length) {
                const n = new Float64Array(dimensions.length);
                n.set(p);
                points[i] = p;
            }
        }

        dim.updateAll();

        return dimensions.length - 1;
    }

    public getPoints(): Point[] {
        if (this.numPoints < this.points.length) {
            return this.points.slice(0, this.numPoints);
        }

        return this.points;
    }

    public add(p: Point) {
        const dimensions = this.dimensions;
        const points = this.points;

        let index = this.getAt(p);

        if (index !== -1) {
            points[index][0] += p[0];     

            dimensions[0].update(index);

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

        if (dimensions.length === 1) {
            return this.numPoints - 1;
        }

        const result = dimensions[1].tree.getKey(X);

        if (result === undefined) {
            return -1;
        }

        return result;
    }

    public ranges(ranges: NumberArrayLike[]) {
        const selection = new Map<Point, number>();

        const dimensions = this.dimensions;

        for (let i = 0; i < dimensions.length; i++) {
            const rn = ranges[i];

            if (!rn) {
                continue;
            }

            const dim = dimensions[i];

            const range = new Map<Point, number>();

            for (let i2 = 0; i2 < rn.length; i2 += 2) {
                const s = dim.range(rn[i2], rn[i2 + 1]);

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
        const dimensions = this.dimensions;
        const tree = dimensions[0].tree;

        // The higher the angle a point spans towards its neighbours,
        // the closer it is to their interpolated values
        let highestAngle = 0;
        let highestAngleIndex = -1;

        for (const key of tree) {
            if (this.isBounds(key)) {
                continue;
            }

            const angle = this.angle(key);

            if (angle >= highestAngle) {
                highestAngle = angle;
                highestAngleIndex = key;
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

            const right = tree.keys(P).next().value;
            const left = tree.keysReversed(P).next().value;

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

    // Distributes the point at index to all others
    // while preserving totals
    private distribute(index: number) {
        const dimensions = this.dimensions;
        const points = this.points;
        let l = this.numPoints;

        const tmp = new Float64Array(dimensions.length);

        const P = points[index];
        const weights = this.weights(P, P);

        for (let i = 0; i < l; i++) {
            const P2 = points[i];
            const V = P[0] * weights[i];

            if (V === 0) {
                continue;
            }

            const combinedV = P2[0] + V;
            
            for (let i2 = 1; i2 < dimensions.length; i2++) {
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
        const dimensions = this.dimensions;

        const P = points[target];

        const existing = this.getAt(data);

        if (existing === -1) {
            P.set(data);

            this.updateInDimensions(target);

            return -1;
        }

        points[existing][0] += data[0];
        dimensions[0].update(existing);

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

        for (let i = 1; i < dimensions.length; i++) {
            const tree = dimensions[i].tree;

            const min = points[tree.first.key][i];
            const max = points[tree.last.key][i];

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
