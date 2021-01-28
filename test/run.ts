
import * as math from 'math';

const cloud = new math.Cloud({
    dimensions: 1,
    maxPoints: 8
});

cloud.add(1, [1]);
cloud.add(2, [1]);
cloud.add(2, [2]);

const range = cloud.range([0], [3]);

console.log(cloud.getPoints());
