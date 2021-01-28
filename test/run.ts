
import * as math from 'math';

const cloud = new math.Cloud(2, {maxPoints: 8});

cloud.add(1, [1, 1]);
cloud.add(1, [2, 1]);
cloud.add(1, [1, 2]);
cloud.add(1, [2, 2]);

cloud.add(1, [0, 0]);
cloud.add(1, [0, 3]);
cloud.add(1, [3, 0]);
cloud.add(1, [3, 3]);

console.log(cloud.range([0, 0], [3, 3]));

console.log(cloud.getPoints());
