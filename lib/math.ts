
import { PerformanceObserver, performance } from 'perf_hooks';

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

export type NumberArrayLike = Float64Array | number[];
export type Point = Float64Array;

export interface PointWeight {
    P: Point,
    w: number
}

export interface CloudSettings {
    maxPoints: number
}

export type Selection = Map<Point, number>;

export type DimensionCompare = (a: number, b: number) => number;

function PointWeight(P: Point, w: number) {
    return {P, w};
}

function nCompare(cloud: Cloud, n: number): DimensionCompare {
    const points = cloud.points;

    return (a: number, b: number) => {
        const A = points[a];
        const B = points[b];

        const dDiff = B[n] - A[n];

        if (dDiff !== 0) {
            return dDiff;
        }
    };
}

function fullCompare(cloud: Cloud) {
    const points = cloud.points;

    return (a: number, b: number) => {
        const A = points[a];
        const B = points[b];

        for (let i = 1; i < cloud.dimensions; i++) {
            const dDiff = B[i] - A[i];

            if (dDiff !== 0) {
                return dDiff;
            }
        }

        return 0;
    };
}

class SortTreeNode {
    public index: number;
    public parent: SortTreeNode;
    public left: SortTreeNode;
    public right: SortTreeNode;

    public constructor(init: SortTreeNode = null) {
        this.index = 0;
        this.left = init;
        this.right = init;
        this.parent = init;
    }
}

const TreeBottom = new SortTreeNode();
TreeBottom.index = -1;

export class SortTree {
    public map: SortTreeNode[];

    public root: SortTreeNode = TreeBottom;
    public first: SortTreeNode = TreeBottom;
    public last: SortTreeNode = TreeBottom;

    public constructor(private cloud: Cloud, private compare: DimensionCompare) {
        this.map = [];

        for (let i = 0; i < cloud.settings.maxPoints; i++) {
            const node = new SortTreeNode(TreeBottom);
            node.index = i;
            this.map.push(node);
        }
    }
    
    public update(i: number) {
        this.updateNode(this.map[i]);
    }
    
    private updateNode(node: SortTreeNode) {
        if (this.root !== node) {
            const parent = node.parent;

            if (parent !== TreeBottom) {
                const isLeft = parent.right === node;

                if (isLeft && this.compare(parent.index, node.index) > 0) {
                    this.unlinkNode(node);
                    this.insertNode(node);
                }
            } else {
                this.insertNode(node);
            }
        }

        const left = node.left;
        const right = node.right;

        let updateLeft = false;
        let updateRight = false;

        if (left !== TreeBottom && this.compare(node.index, left.index) > 0) {
            updateLeft = true;
            this.unlinkNode(left);
        }
        
        if (right !== TreeBottom && this.compare(node.index, right.index) <= 0) {
            updateRight = true;
            this.unlinkNode(right);
        }
        
        if (updateLeft) this.insertNode(left);
        if (updateRight) this.insertNode(right);
    }

    public depth(start = this.root) {
        let max = 0;

        if (start.left !== TreeBottom) {
            max = this.depth(start.left) + 1;
        }

        if (start.right !== TreeBottom) {
            max = Math.max(max, this.depth(start.right) + 1);
        }

        return max;
    }
    
    public remove(i: number) {
        const node = this.map[i];

        this.unlinkNode(node);
    }

    private insertNode(node: SortTreeNode) {
        if (this.root === TreeBottom) {
            this.root = node;
            this.first = node;
            this.last = node;
            return;
        }

        this.insert(this.root, node);    
    }

    public findNode(condition: (node: SortTreeNode) => number): SortTreeNode {
        let node = this.root;

        while (node !== TreeBottom) {
            const side = condition(node);
            
            if (side === 0) {
                return node;
            }

            if (side < 0) {
                node = node.left;
            } else {
                node = node.right;
            }     
        }

        return null;
    }

    // Replace a bottom node
    private replace(target: SortTreeNode, node: SortTreeNode) {
        const root = this.root;

        if (target === this.root) {
            target = node;
        } else {
            const targetParent = target.parent;

            if (targetParent.left === target) {
                targetParent.left = node;
            } else {
                targetParent.right = node;
            }

            node.parent = target.parent;
        }

        const rootSide = this.compare(target.index, root.index);

        // Current root is full
        if (root.left !== TreeBottom && root.right !== TreeBottom) {
            if (rootSide <= 0) {
                target.left = root;
            } else {
                target.right = root;
            }

            target.parent = TreeBottom;
            root.parent = target;
            this.root = target;
        }

        if (rootSide <= 0) {
            if (root.right === TreeBottom) {
                // RL R T
                root.right = target;
                target.parent = root;
                return;
            }

            const rR = this.compare(target.index, root.right.index);

            if (rR <= 0) {
                // R RL T
            }
        }
    }

    private insert(parent: SortTreeNode, node: SortTreeNode) {
        while (true) {
            const side = this.compare(parent.index, node.index);

            if (side <= 0) {
                if (parent.left !== TreeBottom) {
                    parent = parent.left;
                    continue;
                }

                if (parent === this.first) {
                    do {
                        this.first = node;
                    } while ((node = node.left) !== TreeBottom)
                }

                this.replace(parent, node);

                return;
            } else {
                if (parent.right !== TreeBottom) {
                    parent = parent.right;
                    continue;
                }
                
                if (parent === this.last) {
                    do {
                        this.last = node;
                    } while ((node = node.right) !== TreeBottom)
                }
                
                this.replace(parent, node);

                return;
            }
        }
    }
    
    private unlinkNode(node: SortTreeNode) {
        const left = node.left;
        const right = node.right;
        const parent = node.parent;

        if (this.first === node) {
            this.first = this.rightOf(node);
        }
        
        if (this.last === node) {
            this.last = this.leftOf(node);
        }

        if (node === this.root) {
            if (right !== TreeBottom) {
                this.root = right;

                if (left !== TreeBottom) {
                    this.insert(this.root, left);
                }
            } else {
                this.root = left;
            }

            node.left = TreeBottom;
            node.right = TreeBottom;

            return;
        }

        if (!parent) {
            return;
        }
        
        node.left = TreeBottom;
        node.right = TreeBottom;
        node.parent = TreeBottom;

        if (parent.left === node) {
            if (left !== TreeBottom) {
                parent.left = left;
                left.parent = parent;

                if (right !== TreeBottom) {
                    this.insert(left, right);
                }
            } else if (right !== TreeBottom) {
                parent.left = right;
                right.parent = parent;
            } else {
                parent.left = TreeBottom;
            }
        } else {
            if (right !== TreeBottom) {
                parent.right = right;
                right.parent = parent;

                if (left !== TreeBottom) {
                    this.insert(right, left);
                }
            } else if (left !== TreeBottom) {
                parent.right = left;
                left.parent = parent;
            } else {
                parent.right = TreeBottom;
            }
        }
    }

    public iterateRight(node: SortTreeNode, iter: (node: SortTreeNode) => boolean) {
        while (node !== TreeBottom && iter(node) !== false) {
            node = this.rightOf(node);
        }

        return node;
    }
    
    public iterateLeft(node: SortTreeNode, iter: (node: SortTreeNode) => boolean) {
        while (node !== TreeBottom && iter(node) !== false) {
            node = this.leftOf(node);
        }

        return node;
    }

    public rightOf(node: SortTreeNode): SortTreeNode {
        if (node.right === TreeBottom) {
            let parent: SortTreeNode;

            while ((parent = node.parent) !== TreeBottom && parent.right === node) {
                node = parent;
            }

            node = parent;
        } else {
            node = node.right;

            while (node.left !== TreeBottom) {
                node = node.left;
            }
        }

        return node;
    }

    public leftOf(node: SortTreeNode): SortTreeNode {
        if (node.left === TreeBottom) {
            let parent: SortTreeNode;

            while ((parent = node.parent) !== TreeBottom && parent.left === node) {
                node = parent;
            }

            node = parent;
        } else {
            node = node.left;

            while (node.right !== TreeBottom) {
                node = node.right;
            }
        }

        return node;
    }

    public rebuild() {
        const cloud = this.cloud;

        for (let i = 0; i < cloud.numPoints; i++) {
            const node = this.map[i];

            node.parent = TreeBottom;
            node.left = TreeBottom;
            node.right = TreeBottom;
        }

        this.root = TreeBottom;
        this.first = TreeBottom;
        this.last = TreeBottom;

        for (let i = 0; i < cloud.numPoints; i++) {
            const node = this.map[i];
            this.insertNode(node);
        }
    }
}

export class Dimension {
    public tree: SortTree;

    public constructor(
            public n: number,
            private cloud: Cloud,
            compare: DimensionCompare
    ) {

        this.tree = new SortTree(cloud, compare);
    }
    
    public update(index: number) {
        this.tree.update(index);
    }
    
    public remove(index: number) {
        this.tree.remove(index);
    }

    public updateAll() {
        this.tree.rebuild();
    }

    public isBounds(index: number) {
        const tree = this.tree;
        return tree.first.index === index || tree.last.index === index;
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
            const C = points[node.index];
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

    public nodeLT(x: number): SortTreeNode {
        const points = this.cloud.points;

        return this.tree.findNode((node: SortTreeNode) => {
            const v = points[node.index][this.n];

            if (x < v) {
                return -1;
            }

            if (x > v && (!node.right || x <= points[node.right.index][this.n])) {
                return 0;
            }

            return 1;
        });
    }
}

export class Cloud {
    public points: Point[] = [];
    public numPoints = 0;

    public dims: Dimension[] = [];
    public dimensions: number = 0;

    public displacement: number;
    public readonly settings: CloudSettings;


    public constructor(settings: CloudSettings) {
        this.settings = settings;

        this.points.length = settings.maxPoints;

        this.addDimension();
    }

    public addDimension() {
        const dimensions = this.dimensions;
        const l = this.numPoints;
        const points = this.points;

        const dim = new Dimension(this.dimensions, this, 
            this.dimensions === 1 ? fullCompare(this) : nCompare(this, this.dimensions));

        this.dims.push(dim);

        this.dimensions++;

        for (let i = 0; i < l; i++) {
            const p = points[i];

            if (p.length < dimensions) {
                const n = new Float64Array(this.dimensions);
                n.set(p);
                points[i] = p;
            }
        }

        dim.updateAll();

        return this.dimensions - 1;
    }

    public getPoints(): Point[] {
        if (this.numPoints < this.points.length) {
            return this.points.slice(0, this.numPoints);
        }

        return this.points;
    }

    public add(p: Point) {
        let index = this.getAt(p);

        if (index === -1) {
            if (this.numPoints === this.points.length) {
                index = this.simplify();

                this.points[index] = p;
                
                for (const dim of this.dims) {
                    dim.update(index);
                }

                return;
            }

            index = this.numPoints++;

            this.points[index] = p;
        } else {
            this.points[index][0] += p[0];     
        } 

        for (const dim of this.dims) {
            dim.update(index);
        }
    }
    
    public getAt(X: Point): number {
        const dimensions = this.dimensions;

        if (dimensions === 1) {
            return this.numPoints - 1;
        }

        const points = this.points;

        const node = this.dims[1].tree.findNode((node) => {
            const P = points[node.index];

            for (let i2 = 1; i2 < dimensions; i2++) {
                const x = X[i2];
                const p = P[i2];
                const d = x - p;

                if (d !== 0) {
                    return d;
                }
            }

            return 0;
        });

        if (node) {
            return node.index;
        }

        return -1;
    }

    public ranges(ranges: NumberArrayLike[]) {
        const selection = new Map<Point, number>();

        const dimensions = this.dimensions;
        const dims = this.dims;

        for (let i = 0; i < dimensions; i++) {
            const rn = ranges[i];

            if (!rn) {
                continue;
            }

            const dim = dims[i];

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
        const tree = this.dims[0].tree;
        const points = this.points;
        const dimensions = this.dimensions;

        let l = this.numPoints;

        const tmp = new Float64Array(this.dimensions);

        let node = tree.first;

        // worst case: O((this.dimensions * 2 + 1) * this.numPoints)
        
        while (node) {
            const P = points[node.index];

            if (this.isBounds(node.index)) {
                node = tree.rightOf(node);
                continue;
            }

            const weights = this.weights(P, P);

            for (let i = 0; i < l; i++) {
                const P2 = points[i];
                const V = P[0] * weights[i];

                if (V === 0) {
                    continue;
                }

                const combinedV = P2[0] + V;
                
                for (let i2 = 1; i2 < dimensions; i2++) {
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

            return node.index;
        }

        return -1;
    }

    private modify(target: number, data: Point) {
        if (data[0] === 0) {
            return this.remove(target);
        }

        const points = this.points;
        const dims = this.dims;
        const dimensions = this.dimensions;

        const P = points[target];

        const existing = this.getAt(data);

        if (existing === -1 || existing === target) {
            P.set(data);

            for (let i = 0; i < dimensions; i++) {
                dims[i].update(target);
            }

            return -1;
        }

        if (data[0] > 0) {
            points[existing][0] += data[0];
            dims[0].update(existing);
        }

        return this.remove(target);
    }


    private remove(target: number) {
        const points = this.points;
        const dims = this.dims;
        const dimensions = this.dimensions;

        const last = this.numPoints - 1;
        this.numPoints = last;

        if (target === last) {
            for (let i = 0; i < dimensions; i++) {
                dims[i].remove(last);
            }

            return last;
        }

        points[target] = this.points[last];


        for (let i = 0; i < dimensions; i++) {
            dims[i].remove(last);
            dims[i].update(target);
        }

        return last;
    }

    private isBounds(index: number) {
        for (const d of this.dims) {
            if (d.isBounds(index)) {
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
        const dims = this.dims;
        const points = this.points;

        for (let i = 1; i < dimensions; i++) {
            const d = dims[i];

            const min = points[d.tree.first.index][i];
            const max = points[d.tree.last.index][i];

            let rD = max - min;

            if (rD === 0) {
                continue;
            }

            const r = (a[i] - b[i]) / rD;

            dist += r * r;
        }

        return dist;
    }

    public stats() {
        for (const d of this.dims){
            console.log(d.tree.depth(d.tree.root));
        }
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
