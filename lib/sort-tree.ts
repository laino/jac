
export interface SortTreeNode<K> {
    keys: K[];
    parent: SortTreeNode<K>;
    left: SortTreeNode<K>;
    right: SortTreeNode<K>;
}

export type CompareFunction<K> = (a: K, b: K) => number;

let TreeBottom: SortTreeNode<any>;

function createNode<K>(keys: K[]): SortTreeNode<K> {
    return {
        keys,
        left: TreeBottom,
        right: TreeBottom,
        parent: TreeBottom
    };
}

TreeBottom = createNode([]);
TreeBottom.parent = TreeBottom;
TreeBottom.left = TreeBottom;
TreeBottom.right = TreeBottom;

function removeKeyFromNode<K>(node: SortTreeNode<K>, k: K) {
    const keys = node.keys;
    const l = keys.length - 1;

    for (let i = l; i >= 0; i--) {
        if (keys[i] === k) {
            keys[i] = keys[l];
            keys.pop();
            return true;
        }
    }

    return false;
}

function nodeKeyIndex<K>(node: SortTreeNode<K>, k: K) {
    const keys = node.keys;

    for (let i = keys.length - 1; i >= 0; i--) {
        if (keys[i] === k) {
            return i;
        }
    }

    return -1;
}

export abstract class SortTree<K, V> implements Iterable<K> {
    public keyMap = new Map<K, SortTreeNode<K>>();

    public nodeCount = 0;
    public root: SortTreeNode<K> = TreeBottom;
    public first: SortTreeNode<K> = TreeBottom;
    public last: SortTreeNode<K> = TreeBottom;

    public constructor(public compare: CompareFunction<V>) {
    }
    
    public abstract get(k: K): V;
    
    public getKeys(value: V): K[] {
        return this.findNode(value, this.compare).keys;
    }

    public update(k: K) {
        let node = this.keyMap.get(k);

        if (node) {
            if (node.keys.length === 1) {
                node = this.unlinkNode(node);
            } else {
                removeKeyFromNode(node, k);
                node = null;
            }
        }

        node = this.insertNode(this.root, k, node);    
        this.keyMap.set(k, node);
    }

    public remove(k: K) {
        const node = this.keyMap.get(k);

        if (node) {
            if (node.keys.length === 1) {
                this.unlinkNode(node);
            } else {
                removeKeyFromNode(node, k);
            }

            this.keyMap.delete(k);
        }
    }

    public depth(start = this.root) {
        let max = 1;

        if (start.left !== TreeBottom) {
            max = this.depth(start.left) + 1;
        }

        if (start.right !== TreeBottom) {
            max = Math.max(max, this.depth(start.right) + 1);
        }

        return max;
    }

    public firstKey() {
        return this.first.keys[0];
    }
    
    public lastKey() {
        const keys = this.last.keys;
        return keys[keys.length - 1];
    }
    
    public keyLeftOfValue(value: V, inclusive = false) {
        const keys = this.findLT(this.root, value, inclusive).keys;
        return keys[keys.length - 1];
    }
    
    public farKeyLeftOfValue(value: V, inclusive = false) {
        return this.findLT(this.root, value, inclusive).keys[0];
    }
    
    public keyRightOfValue(value: V, inclusive = false) {
        return this.findGT(this.root, value, inclusive).keys[0];
    }
    
    public farKeyRightOfValue(value: V, inclusive = false) {
        const keys = this.findGT(this.root, value, inclusive).keys;
        return keys[keys.length - 1];
    }
    
    public keyLeftOfKey(key: K) {
        let node = this.keyMap.get(key);
        
        if (!node) {
            return;
        }

        let kIndex = nodeKeyIndex(node, key) - 1;

        if (kIndex === -1) {
            node = leftOfNode(node);
            kIndex = node.keys.length - 1;
        }

        return node.keys[kIndex];
    }
    
    public keyRightOfKey(key: K) {
        let node = this.keyMap.get(key);
        
        if (!node) {
            return;
        }

        let kIndex = nodeKeyIndex(node, key) + 1;
        
        if (kIndex === node.keys.length) {
            node = rightOfNode(node);
            kIndex = 0;
        }
        
        return node.keys[kIndex];
    }
    
    public keyWithNextValue(key: K) {
        let node = this.keyMap.get(key);

        if (!node) {
            return;
        }

        return rightOfNode(node).keys[0];
    }
    
    public keyWithPreviousValue(key: K) {
        let node = this.keyMap.get(key);

        if (!node) {
            return;
        }

        return leftOfNode(node).keys[0];
    }

    public keys() {
        return new SortTreeIterator(this.first, false, 0);
    }

    public keysReversed() {
        const node = this.last;
        return new SortTreeIterator(node, true, node.keys.length - 1);
    }
    
    public keysFromKey(key: K, inclusive = false) {
        let node = this.keyMap.get(key);

        if (!node) {
            return this.keys();
        }

        let kIndex = nodeKeyIndex(node, key);

        if (!inclusive) {
            kIndex++;

            if (kIndex === node.keys.length) {
                node = rightOfNode(node);
                kIndex = 0;
            }
        }

        return new SortTreeIterator(node, false, kIndex);
    }
     
    public keysReversedFromKey(key: K, inclusive = false) {
        let node = this.keyMap.get(key);

        if (!node) {
            return this.keysReversed();
        }

        let kIndex = nodeKeyIndex(node, key);

        if (!inclusive) {
            kIndex--;
            if (kIndex === -1) {
                node = leftOfNode(node);
                kIndex = node.keys.length - 1;
            }
        }

        return new SortTreeIterator(node, true, kIndex);
    }
    
    public keysFromValue(start: V, inclusive = false) {
        const node = this.findGT(this.root, start, inclusive);
        return new SortTreeIterator(node, false, 0);
    }
    
    public keysReversedFromValue(start: V, inclusive = false) {
        const node = this.findLT(this.root, start, inclusive);
        return new SortTreeIterator(node, true, node.keys.length - 1);
    }
     
    public [Symbol.iterator](): Iterator<K> {
        return this.keys();
    };
     
    private findNode(value: V, compare: CompareFunction<V>): SortTreeNode<K> {
        let node = this.root;

        while (node !== TreeBottom) {
            const side = compare(this.get(node.keys[0]), value);
            
            if (side === 0) {
                return node;
            }

            if (side < 0) {
                node = node.left;
            } else {
                node = node.right;
            }     
        }

        return node;
    }
    
    /*
     * Finds the biggest node that is less than (or equal to) value.
     */
    private findLT(parent: SortTreeNode<K>, value: V, equal: boolean) {
        const cmp = this.compare;

        let greatest: SortTreeNode<K> = TreeBottom;

        while (true) {
            const side = cmp(this.get(parent.keys[0]), value);

            if (equal && side === 0) {
                return parent;
            }

            if (side > 0) {
                if (parent.right === TreeBottom) {
                    return parent;
                }

                greatest = parent;
                parent = parent.right;
            } else {
                if (parent.left === TreeBottom) {
                    return greatest;
                }

                parent = parent.left;
            }
        }
    }

    /*
     * Finds the smallest node that is greater than (or equal to) value.
     */
    private findGT(parent: SortTreeNode<K>, value: V, equal: boolean) {
        const cmp = this.compare;

        // greatest node found
        let smallest: SortTreeNode<K> = TreeBottom;

        while (true) {
            const side = cmp(this.get(parent.keys[0]), value);

            if (equal && side === 0) {
                return parent;
            }

            if (side < 0) {
                if (parent.left === TreeBottom) {
                    return parent;
                }

                smallest = parent;
                parent = parent.left;
            } else {
                if (parent.right === TreeBottom) {
                    return smallest;
                }

                parent = parent.right;
            }
        }
    }
    
    private findLeaf(parent: SortTreeNode<K>, value: V) {
        const cmp = this.compare;
        
        let depth = -1;

        while (true) {
            const side = cmp(this.get(parent.keys[0]), value);

            depth++;

            if (side < 0) {
                if (parent.left !== TreeBottom) {
                    parent = parent.left;
                    continue;
                }
            } else if (side > 0) {
                if (parent.right !== TreeBottom) {
                    parent = parent.right;
                    continue;
                }
            }

            return {parent, side, depth};
        }
    }
    
    private insertNode(root: SortTreeNode<K>, key: K, node?: SortTreeNode<K>) {
        if (this.root === TreeBottom) {
            if (!node) {
                node = createNode([key]);
            }

            this.nodeCount++;
            this.root = node;
            this.first = node;
            this.last = node;

            return node;
        }

        const nodeValue = this.get(key);

        const {parent, side, depth} = this.findLeaf(root, nodeValue);

        if (side === 0) {
            parent.keys.push(key);
            return parent;
        }

        if (!node) {
            node = createNode([key]);
        }

        if (side < 0) {
            this.insertLeft(parent, node);
        } else {
            this.insertRight(parent, node);
        }

        this.nodeCount++;
        
        // Don't become a linked list
        if (depth + 1 > (Math.log2(this.nodeCount)) * Math.E) {
            this.balance();
        }

        return node;
    }

    private balance() {
        let current = this.first;

        const nodes = [current];

        while ((current = rightOfNode(current)) !== TreeBottom) {
            nodes.push(current);
        }

        const root = treeFromArray(nodes, 0, nodes.length - 1);

        this.root = root;
        this.root.parent = TreeBottom;
    }

    private insertLeft(parent: SortTreeNode<K>, node: SortTreeNode<K>) {
        parent.left = node;
        node.parent = parent;

        if (parent === this.first) {
            do {
                this.first = node;
            } while ((node = node.left) !== TreeBottom)
        }
    }

    private insertRight(parent: SortTreeNode<K>, node: SortTreeNode<K>) {  
        parent.right = node;
        node.parent = parent;
        
        if (parent === this.last) {
            do {
                this.last = node;
            } while ((node = node.right) !== TreeBottom)
        }
    }
    
    private replaceInParent(node: SortTreeNode<K>, replace: SortTreeNode<K>) {
        const parent = node.parent;

        if (parent !== TreeBottom) {
            if (node === parent.left) {
                parent.left = replace;
            } else {
                parent.right = replace;
            }
        } else {
            this.root = replace;
        }

        if (replace !== TreeBottom) {
            replace.parent = parent;
        }
    }
 
    private unlinkNode(node: SortTreeNode<K>) {
        let left = node.left;
        let right = node.right;

        if (left !== TreeBottom && right !== TreeBottom) {
            let replace = right;

            while (replace.left !== TreeBottom) {
                replace = replace.left;
            }

            const keys = replace.keys;
            replace.keys = node.keys;

            for (let i = keys.length - 1; i >= 0; i--) {
                this.keyMap.set(keys[i], node);
            }
            
            node.keys = keys;

            node = replace;
            left = replace.left;
            right = replace.right;
        }
        
        if (this.first === node) {
            this.first = rightOfNode(node);
        }
        
        if (this.last === node) {
            this.last = leftOfNode(node);
        }

        if (left !== TreeBottom) {
            this.replaceInParent(node, left);
        } else if (right !== TreeBottom) {
            this.replaceInParent(node, right);
        } else {
            this.replaceInParent(node, TreeBottom);
        }
        
        node.left = TreeBottom;
        node.right = TreeBottom;
        node.parent = TreeBottom;

        this.nodeCount--;

        return node;
    }

    public validate() {
        return validate(this);
    }
}

class SortTreeIterator<K> implements Iterator<K>, Iterable<K> {
    // We want to do work only when asked to,
    // that's why we walk the tree starting only on the second invocation,
    // before returning, instead of after every one
    private second: boolean;
    private node: SortTreeNode<K>;
    private reverse: boolean;
    private nodeIndex: number;

    public constructor(
        node: SortTreeNode<K>,
        reverse: boolean,
        nodeIndex: number
    ) {

        this.node = node;
        this.reverse = reverse;
        this.nodeIndex = nodeIndex;
    }

    public next() {
        let node = this.node;
        let index = this.nodeIndex;

        if (this.second) {
            if (this.reverse) {
                index--;
                if (index === -1) {
                    this.node = node = leftOfNode(node);
                    index = node.keys.length - 1;
                }
            } else {
                index++;

                if (index === node.keys.length) {
                    this.node = node = rightOfNode(node);
                    index = 0;
                }
            }

            this.nodeIndex = index;
        } else {
            this.second = true;
        }

        if (node === TreeBottom) {
            return {
                done: true,
                value: undefined
            };
        }
        
        return {
            done: false,
            value: node.keys[index]
        };
    }

    [Symbol.iterator]() {
        return this;
    }
}

export class SetSortTree<V> extends SortTree<V, V> {
    public constructor(cmp: CompareFunction<V>) {
        super(cmp);
    }

    public get(k: V): V {
        return k;
    }
}

export class MapSortTree<K, V> extends SortTree<K, V> {
    public constructor(public map: Map<K, V>, cmp: CompareFunction<V>) {
        super(cmp);
    }

    public get(k: K): V {
        return this.map.get(k);
    }
}

export class ArraySortTree<V> extends SortTree<number,V> {
    public constructor(public arr: V[], cmp: CompareFunction<V>) {
        super(cmp);
    }

    public get(k: number): V {
        return this.arr[k];
    }
}

function rightOfNode<K>(node: SortTreeNode<K>): SortTreeNode<K> {
    if (node.right === TreeBottom) {
        let parent: SortTreeNode<K>;

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

function leftOfNode<K>(node: SortTreeNode<K>): SortTreeNode<K> {
    if (node.left === TreeBottom) {
        let parent: SortTreeNode<K>;

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

function treeFromArray<K>(arr: SortTreeNode<K>[], start: number, end: number) {
    if (start > end) {
        return TreeBottom;
    }

    const mid = Math.floor((start + end) / 2);

    const node = arr[mid];

    const left = treeFromArray(arr, start, mid - 1);
    const right = treeFromArray(arr, mid + 1, end);

    if (left != TreeBottom) {
        left.parent = node;
    }
    
    if (right != TreeBottom) {
        right.parent = node;
    }

    node.left = left;
    node.right = right;

    return node;
}

function validate<K, V>(tree: SortTree<K, V>) {
    const nodes = new Set<SortTreeNode<K>>();
    
    let hadError = false;

    for (const [key, node] of tree.keyMap) {
        if (nodeKeyIndex(node, key) === -1) {
            hadError = true;
        }
        
        nodes.add(node);

        if (!validateNode(tree, node)) {
            hadError = true;
        }
    }

    let node = tree.first;

    do {
        if (!validateNode(tree, node)) {
            hadError = true;
        }
        nodes.add(node);
    } while ((node = rightOfNode(node)) !== TreeBottom);

    if (nodes.size !== tree.nodeCount) {
        console.error("Node count incorrect!");
        hadError = true;
    }
    
    if (TreeBottom.parent !== TreeBottom) {
        console.error("TreeBottom has a parent now!");
        hadError = true;
    }
    
    if (TreeBottom.left !== TreeBottom) {
        console.error("TreeBottom has a left node now!");
        hadError = true;
    }
    
    if (TreeBottom.right !== TreeBottom) {
        console.error("TreeBottom has a right node now!");
        hadError = true;
    }
    
    if (TreeBottom.keys.length !== 0) {
        console.error("TreeBottom has keys now!");
        hadError = true;
    }

    const selfSort = [... tree].map(k => tree.get(k));

    if (selfSort.length !== tree.keyMap.size) {
        console.error(`Number of keys don't match! ${selfSort.length} vs ${tree.keyMap.size}`);
        hadError = true;
    }

    for (let i = 0; i < selfSort.length - 1; i++) {
        if (tree.compare(selfSort[i], selfSort[i + 1]) < 0) {
            console.error("Array not correctly sorted!");
            hadError = true;
        }
    }

    return !hadError;
}

function validateNode<K, V>(tree: SortTree<K,V>, node: SortTreeNode<K>) {
    let hadError = false;

    if (node.parent !== TreeBottom) {
        if (node.parent.left !== node && node.parent.right !== node) {
            console.error("Node parent doesn't contain node!");
            hadError = true;
        }
    }

    for (let key of node.keys) {
        if (tree.keyMap.get(key) !== node) {
            console.error("Node has a key that points to a different node!");
            hadError = true;
        }
    }

    if (node.left !== TreeBottom) {
        if (node.left.parent !== node) {
            console.error("Node's left child has another parent!");
            hadError = true;
        }
    }
    
    if (node.right !== TreeBottom) {
        if (node.right.parent !== node) {
            console.error("Node's right child has another parent!");
            hadError = true;
        }
    }

    return !hadError;
}
