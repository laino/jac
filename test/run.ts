
import * as math from 'math';

const cloud = new math.Cloud(3, {maxPoints: 4});

cloud.add(1, [1, 1, 1]);
cloud.add(1, [2, 1, 1]);
cloud.add(1, [1, 2, 1]);
cloud.add(1, [2, 2, 1]);

cloud.add(1, [0, 0, 1]);
cloud.add(1, [0, 3, 1]);
cloud.add(1, [3, 0, 1]);
cloud.add(1, [3, 3, 1]);

const range = cloud.range([-5, -5, 1], [5, 5, 1]);

console.log(range.v * range.d[0], range.v * range.d[1], range.v);

console.log(cloud.getPoints());
