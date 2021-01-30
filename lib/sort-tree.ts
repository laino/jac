
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
            node = this.unlinkNode(node);
            node.key = k;
            node.left = TreeBottom;
            node.right = TreeBottom;
            node.parent = TreeBottom;
        } else {
            node = new SortTreeNode(k, TreeBottom);
        }

        this.keyMap.set(k, node);

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

    public keys(start: V = undefined, inclusive = false) {
        let node: SortTreeNode<K>;

        if (start != null) {
            node = this.findGT(this.root, start, inclusive);
        } else {
            node = this.first;
        }

        return this.iterator(node);
    }
    
    public keysReversed(start: V = undefined, inclusive = false) {
        let node: SortTreeNode<K>;

        if (start != null) {
            node = this.findLT(this.root, start, inclusive);
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
            },
            [Symbol.iterator]() {
                return this;
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
    
    /*
     * Finds the biggest node that is less than (or equal to) value.
     */
    private findLT(parent: SortTreeNode<K>, value: V, equal: boolean) {
        const cmp = this.cmp;

        let greatest: SortTreeNode<K> = TreeBottom;

        while (true) {
            const side = cmp(this.get(parent.key), value);

            if (side <= 0) {
                if (equal && side === 0) {
                    return parent;
                }

                if (parent.left === TreeBottom) {
                    return greatest;
                }

                parent = parent.left;
            } else {
                if (parent.right === TreeBottom) {
                    return parent;
                }

                greatest = parent;
                parent = parent.right;
            }
        }
    }

    /*
     * Finds the smallest node that is greater than (or equal to) value.
     */
    private findGT(parent: SortTreeNode<K>, value: V, equal: boolean) {
        const cmp = this.cmp;

        // greatest node found
        let smallest: SortTreeNode<K> = TreeBottom;

        while (true) {
            const side = cmp(this.get(parent.key), value);

            if (side < 0) {
                if (parent.left === TreeBottom) {
                    return parent;
                }

                smallest = parent;
                parent = parent.left;
            } else {
                if (equal && side === 0) {
                    // Walk to the leftmost node still matching the
                    // condition
                    smallest = parent;
                    while ((parent = parent.left) !== TreeBottom &&
                           cmp(this.get(parent.key), value) === 0) {

                        smallest = parent;
                    }
                    return smallest;
                }

                if (parent.right === TreeBottom) {
                    return smallest;
                }

                parent = parent.right;
            }
        }
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
        while (true) {
            const left = node.left;
            const right = node.right;

            if (left !== TreeBottom && right !== TreeBottom) {
                let replace = right;

                while (replace.left !== TreeBottom) {
                    replace = replace.left;
                }

                node.key = replace.key;
                this.keyMap.set(replace.key, node);

                node = replace;
                continue;
            }

            if (left !== TreeBottom) {
                this.replaceInParent(node, left);
            } else if (right !== TreeBottom) {
                this.replaceInParent(node, right);
            } else {
                this.replaceInParent(node, TreeBottom);
            }
            
            if (this.first === node) {
                this.first = this.rightOfNode(node);
            }
            
            if (this.last === node) {
                this.last = this.leftOfNode(node);
            }

            return node;
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
