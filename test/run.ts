
import * as jac from 'jac';
import { SetSortTree, ArraySortTree, SortTreeNode } from 'sort-tree';
import { round } from 'math';

// just a playground for active development right now

//console.log(round(1000000.1 + 0.2 - 1000000.3));
testJACStress();
//testArrayTree();
//testSetTree();

//testCloud();

//testTreeStress();

function printNode(node: SortTreeNode<number>, depth = 0) {
    const indent = Array(depth).fill(' ').join('');
    
    if (node.left.keys.length) {
        printNode(node.left, depth + 1);
    }

    console.log(`${indent}${node.keys.join(' ')}`);

    if (node.right.keys.length) {
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
    
    return sum;
}

function roundSum(sum: Record<string, number>) {
    for (let [k, v] of Object.entries(sum)) {
        sum[k] = round(v);
    }

    return sum;
}

function testTreeStress() {
    const arr = [];
    const tree = new ArraySortTree(arr, (a: number, b: number) => {
        return b - a;
    });

    for (let i = 0; i < 12; i++) {
        arr.push(i);
        tree.update(i);
    }

    while (true) {
        const index = Math.floor(Math.random() * arr.length);
        const val = Math.floor(Math.random() * arr.length);

        arr[index] = val;

        if (Math.random() > 0.95) {
            console.log('remove', index, val);
            tree.remove(index);
        } else {
            console.log('update', index, val);
            tree.update(index);
        }

        if (!tree.validate()) {
            break;
        }
    }
}

function testSetTree() {
    const tree = new SetSortTree((a: number, b: number) => {
        return b - a;
    });

    tree.update(0);
    tree.update(1);
    tree.update(2);
    tree.update(3);
    tree.update(4);
    tree.update(5);
    tree.update(-1);
    tree.update(-2);
    tree.update(6);
    tree.update(7);

    console.log('min', tree.firstKey(), 'max', tree.lastKey());

    printNode(tree.root);
}

function testArrayTree() {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const tree = new ArraySortTree(arr, (a: number, b: number) => {
        return b - a;
    });
    arr[5] = 11;


    tree.update(3);
    tree.update(4);
    tree.update(5);
    tree.update(0);
    tree.update(1);
    tree.update(2);
    tree.update(6);
    tree.update(7);
    tree.update(6);
    tree.update(8);
    

    tree.update(5);

    //tree.remove(7);
    //tree.remove(8);
    //tree.remove(7);
    //tree.remove(8);

    console.log('min', tree.firstKey(), 'max', tree.lastKey());

    console.log(... [... tree].map(k => `${k}:${arr[k]}`));
    printNode(tree.root);
    
    tree.validate();
}

function testCloud() {
    const cloud = new jac.JAC({maxPoints: 4}, 'volume', 'x');

    for (let i = 0; i < 10; i++) {
        cloud.add({
            volume: 1,
            x: i,
        });
    }

    console.log(cloud.getData());
}

function testJACStress() {
    const cloud = new jac.JAC({maxPoints: 300}, 'volume', 'x', 'y');

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

    console.log(roundSum(sum));
    console.log(roundSum(sum2));
}
