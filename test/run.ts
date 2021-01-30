
import * as jac from 'jac';
import { SetSortTree, SortTreeNode } from 'sort-tree';

// just a playground for active development right now

testCloud();
testTree();

function printNode(node: SortTreeNode<number>, depth = 0) {
    const indent = Array(depth).fill(' ').join('');
    
    if (node.left.key !== undefined) {
        printNode(node.left, depth + 1);
    }

    console.log(`${indent}${node.key}`);

    if (node.right.key !== undefined) {
        printNode(node.right, depth + 1);
    }
}

function add(sum: Record<string, number>, add: Record<string, number>) {
    const vol = add['volume'];

    for (let [k, v] of Object.entries(add)) {
        if (k !== 'volume') {
            v *= vol;
        }

        if (sum[k]) {
            sum[k] += v;
        } else {
            sum[k] = v;
        }
    }
}

function testTree() {
    const tree = new SetSortTree((a: number, b: number) => {
        return b - a;
    });

    tree.update(3);
    tree.update(5);
    tree.update(9);
    tree.update(1);
    tree.update(5);
    tree.update(10);
    tree.update(1);

    console.log('min', tree.first.key, 'max', tree.last.key);

    printNode(tree.root);

    for (const k of tree.keys(11, false)){
        console.log(k);
    }
}

function testCloud() {
    const cloud = new jac.JAC({maxPoints: 1000}, 'volume', 'x', 'y');

    const sum: Record<string, number> = {};

    for (let i = 0; i < 10000; i++) {
        console.log(i);
        const obj = {
            volume: 1,
            x: Math.random(),
            y: Math.random(),
        };

        cloud.add(obj);
        add(sum, obj);
    }

    for (const [i, d] of cloud.cloud.dimensions.entries()) {
        console.log(`---- Dimension ${i} ----`);
        console.log(`Depth: ${d.tree.depth()}`)
        //console.log(`Data:`);
        //printNode(d.tree.root);
    }

    const sum2: Record<string, number> = {};

    for (const p of cloud.getData()) {
        add(sum2, p);
    }

    console.log(sum);
    console.log(sum2);
}
