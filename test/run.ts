
import * as jac from 'jac';

/*
const cloud = new jac.JAC({
    maxPoints: 2
});
*/

/*
cloud.add({
    money: 3,
    volume: 3
});

cloud.add({
    money: 1,
    volume: 1
});

cloud.add({
    money: 2,
    volume: 2
});

console.log(cloud.getData());
*/

const cloud = new jac.JAC({
    maxPoints: 100
});

for (let i = 0; i < 100000; i++) {
    console.log(i);
    cloud.add({
        a: Math.random() * 1000000,
        b: Math.random() * 1000000,
        c: Math.random() * 1000000,
        d: Math.random() * 1000000,
        volume: 1
    });
}

console.log(cloud.cloud.stats());
