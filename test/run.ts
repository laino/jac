
import * as jac from 'jac';
import { SortTree, SortTreeNode } from 'sort-tree';

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

/*
const cloud = new jac.JAC({maxPoints: 5}, 'volume', 'x');

cloud.add({
    x: 0,
    volume: 1,
});

cloud.add({
    x: 1,
    volume: 10,
});

cloud.add({
    x: 2,
    volume: 1,
});

cloud.add({
    x: 3,
    volume: 20,
});

cloud.add({
    x: 4,
    volume: 1,
});

cloud.add({
    x: 99,
    volume: 100
});

console.log(cloud.getData());

const tree = new SortTree((a: number, b: number) => {
    return b - a;
});

tree.update(3);
tree.update(5);
tree.update(9);
tree.update(1);

tree.remove(1);
tree.remove(3);
tree.remove(5);
tree.remove(9);

console.log('min', tree.first.key, 'max', tree.last.key);

printNode(tree.root);
*/

const cloud = new jac.JAC({maxPoints: 500}, 'volume', 'x', 'y');

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
