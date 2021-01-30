
export class SortTreeNode<K> {
    public key: K;
    public parent: SortTreeNode<K>;
    public left: SortTreeNode<K>;
    public right: SortTreeNode<K>;

    public constructor(key: K, init: SortTreeNode<K> = undefined) {
        this.key = key;
        this.left = init;
        this.right = init;
        this.parent = init;
    }
}

const TreeBottom = new SortTreeNode<any>(undefined);
TreeBottom.left = TreeBottom;
TreeBottom.right = TreeBottom;
TreeBottom.parent = TreeBottom;

export type CompareFunction<K> = (a: K, b: K) => number;

export abstract class SortTree<K, V> implements Iterable<K> {
    public keyMap = new Map<K, SortTreeNode<K>>();

    public root: SortTreeNode<K> = TreeBottom;
    public first: SortTreeNode<K> = TreeBottom;
    public last: SortTreeNode<K> = TreeBottom;

    public constructor(private cmp: CompareFunction<V>) {
    }

    public abstract get(k: K): V;
    
    public update(k: K) {
        let node = this.keyMap.get(k);

        if (node) {
            this.unlinkNode(node);
        } else {
            node = new SortTreeNode(k, TreeBottom);
            this.keyMap.set(k, node);
        }

        this.insertNode(node);
    }
    
    public remove(k: K) {
        const node = this.keyMap.get(k);

        if (node) {
            this.unlinkNode(node);
            this.keyMap.delete(k);
        }
    }

    public updateAll() {
        const keys = this.keyMap;

        for (const node of keys.values()) {
            node.parent = TreeBottom;
            node.left = TreeBottom;
            node.right = TreeBottom;
        }

        this.root = TreeBottom;
        this.first = TreeBottom;
        this.last = TreeBottom;

        for (const node of keys.values()) {
            this.insertNode(node);
        }
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
    
    public getKey(value: V): K {
        return this.findNode(value, this.cmp).key;
    }

    // TODO: performance improvements possible
    // Currently this is about 30% of CPU time for inserting
    // into 500 key sets
    public keys(start: V = undefined, inclusive = false) {
        let node: SortTreeNode<K>;

        if (start) {
            const cmp = this.cmp;
            const result = this.findLeaf(this.root, start);
            node = result.parent;

            if (inclusive) {
                while (node !== TreeBottom && cmp(this.get(node.key), start) > 0) {
                    node = this.rightOfNode(node);
                }
            } else {
                while (node !== TreeBottom && cmp(this.get(node.key), start) >= 0) {
                    node = this.rightOfNode(node);
                }
            }
        } else {
            node = this.first;
        }

        return this.iterator(node);
    }
    
    public keysReversed(start: V = undefined, inclusive = false) {
        let node: SortTreeNode<K>;

        if (start) {
            // TODO: performance improvements possible
            const cmp = this.cmp;
            const result = this.findLeaf(this.root, start);
            node = result.parent;
            if (inclusive) {
                while (node !== TreeBottom && cmp(this.get(node.key), start) < 0) {
                    node = this.leftOfNode(node);
                }
            } else {
                while (node !== TreeBottom && cmp(this.get(node.key), start) <= 0) {
                    node = this.leftOfNode(node);
                }
            }
        } else {
            node = this.first;
        }

        return this.iterator(node, true);
    }
     
    public [Symbol.iterator](): Iterator<K> {
        return this.iterator(this.first);
    };
    
    private iterator(node: SortTreeNode<K>, reverse = false) {
        return {
            next: () => {
                if (node === TreeBottom) {
                    return {
                        done: true,
                        value: undefined
                    };
                }

                const current = node;

                node = reverse ? this.leftOfNode(node) : this.rightOfNode(node);

                return {
                    done: false,
                    value: current.key
                };
            }
        };
    }
    
    private findNode(value: V, compare: CompareFunction<V>): SortTreeNode<K> {
        let node = this.root;

        while (node !== TreeBottom) {
            const side = compare(this.get(node.key), value);
            
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

    private findLeaf(parent: SortTreeNode<K>, value: V) {
        const cmp = this.cmp;

        while (true) {
            const side = cmp(this.get(parent.key), value);

            if (side <= 0) {
                if (parent.left === TreeBottom) {
                    return {parent, side};
                }

                parent = parent.left;
            } else {
                if (parent.right === TreeBottom) {
                    return {parent, side};
                }

                parent = parent.right;
            }
        }
    }
    
    private insertNode(node: SortTreeNode<K>) {
        if (this.root === TreeBottom) {
            this.root = node;
            this.first = node;
            this.last = node;
            return;
        }

        this.insert(this.root, node);    
    }
    
    private insert(root: SortTreeNode<K>, node: SortTreeNode<K>) {
        const nodeValue = this.get(node.key);

        const {parent, side} = this.findLeaf(root, nodeValue);

        if (side <= 0) {
            this.insertLeft(parent, node);
        } else {
            this.insertRight(parent, node);
        }
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
 
    private unlinkNode(node: SortTreeNode<K>) {
        if (node === this.root) {
            this.unlinkRoot();
            return;
        }
        
        const parent = node.parent;
        if (parent === TreeBottom) {
            // Not in the tree right now
            return;
        }

        if (this.first === node) {
            this.first = this.rightOfNode(node);
        }
        
        if (this.last === node) {
            this.last = this.leftOfNode(node);
        }
        
        const left = node.left;
        const right = node.right;
 
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

    private unlinkRoot() {
        const node = this.root;

        if (this.first === node) {
            this.first = this.rightOfNode(node);
        }
        
        if (this.last === node) {
            this.last = this.leftOfNode(node);
        }

        const left = node.left;
        const right = node.right;
        
        node.left = TreeBottom;
        node.right = TreeBottom;

        if (right !== TreeBottom) {
            this.root = right;
            right.parent = TreeBottom;

            if (left !== TreeBottom) {
                this.insert(this.root, left);
            }
        } else {
            this.root = left;
            left.parent = TreeBottom;
        }
    }

    public iterateRight(node: SortTreeNode<K>, iter: (node: SortTreeNode<K>) => boolean) {
        while (node !== TreeBottom && iter(node) !== false) {
            node = this.rightOfNode(node);
        }

        return node;
    }
    
    public iterateLeft(node: SortTreeNode<K>, iter: (node: SortTreeNode<K>) => boolean) {
        while (node !== TreeBottom && iter(node) !== false) {
            node = this.leftOfNode(node);
        }

        return node;
    }

    private rightOfNode(node: SortTreeNode<K>): SortTreeNode<K> {
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

    private leftOfNode(node: SortTreeNode<K>): SortTreeNode<K> {
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
