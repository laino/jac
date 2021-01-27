
import * as math from 'math';

const cloud = new math.Cloud(2, {maxPoints: 4});

cloud.add(5, [0, 0]);
cloud.add(5, [1, 1]);
cloud.add(5, [2, 2]);
cloud.add(5, [3, 3]);

console.log(cloud.sample([-1, -1]));

cloud.add(5, [4, 4]);

console.log(cloud.sample([-1, -1]));

console.log(cloud.getPoints());

/*
import * as fs from 'fs';
import {createCanvas} from 'canvas';

const p1 = {x: 0, y: 0, z: 0};
const p2 = {x: 1, y: 0, z: 0};
const p3 = {x: 2, y: 0, z: 0};

const l1 = {x: 0, y: 2, z: 0};
const l2 = {x: 2, y: 2, z: 0};

console.log(math.uv(300, 300, p1, p2, p3));
*/

/*
const m = new math.Mesh();

const A = {x: 100, y: 0, z: 200};
const B = {x: 100, y: 100, z: 0};
const C = {x: 200, y: 0, z: 0};

m.add([A, B, C]);

const A2 = {x: 30, y: -20, z: 200};
const B2 = {x: 30, y: 70, z: 100};
const C2 = {x: 180, y: -30, z: 0};

//m.add([A2, B2, C2]);

m.simplify({
    maxPoints: 100,
    maxTriangles: 100
});

/*
const V1 = {x: 0, y: 0, z: 1};
const V2 = {x: 1, y: 0, z: 1};
const V3 = {x: 1, y: 1, z: (2 * 2 + 1 * 0.5) / 2.5};

const V4 = {x: 1, y: 1, z: (2 * 2 + 1 * 0.5) / 2.5};
const V5 = {x: 3, y: 1, z: 2};
const V6 = {x: 3, y: 3, z: 2};

console.log(math.volume(V1, V2, V3));
console.log(math.volume(V4, V5, V6));
console.log(math.volume(V4, V5, V6) + math.volume(V1, V2, V3));

fs.writeFileSync('/tmp/out.png', draw(m.getPoints(false)));

const points = m.getPoints(true);

let vol = 0;

for (let i = 0; i < points.length; i+=3) {
    vol += math.volume(points[i], points[i+1], points[i+2]);
}

console.log("Total Volume:", vol);

function draw(points: math.Point[]) {
    const canvas = createCanvas(1200, 1200);

    const c = canvas.getContext('2d');

    c.lineJoin = 'bevel';
    c.lineWidth = 3;

    // drawing with XOR lets us spot errors very easily
    //c.globalCompositeOperation = 'xor';
        
    c.fillStyle = 'rgba(0, 200, 0, 1)';

    const tx = 600;
    const ty = 600;

    c.translate(tx, ty);

    const scale = 1;

    /*
    for (let i = 0; i < points.length; i+=3) {
        const A = points[i];
        const B = points[i + 1];
        const C = points[i + 2];

        const edges = [
            [A.x / scale, -A.y / scale],
            [B.x / scale, -B.y / scale], 
            [C.x / scale, -C.y / scale]
        ];
    
        c.beginPath();
        c.moveTo(edges[2][0], edges[2][1])
        for (const [x,y] of edges) {
            c.lineTo(x, y);
        }
        c.closePath();
        c.fill();
    }
        
    c.lineWidth = 3;

    const lines: number[][][] = [];
    const edges: number[][] = [];

    function drawLine([x, y, z]: number[], [x2, y2, z2]: number[]) {
        const g = c.createLinearGradient(x, y, x2, y2);

        g.addColorStop(0, `rgba(${z.toFixed(0)}, ${(255 - z).toFixed(0)}, 0, 1)`);
        g.addColorStop(1, `rgba(${z2.toFixed(0)}, ${(255 - z2).toFixed(0)}, 0, 1)`);

        c.strokeStyle = g;

        c.beginPath();
        c.moveTo(x, y)
        c.lineTo(x2, y2);
        c.stroke();
    }

    function drawEdge([x,y,z]: number[]) {
        c.fillStyle = `rgba(${z.toFixed(0)}, ${(255 - z).toFixed(0)}, 0, 1)`;
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.closePath();
        c.fill();
    }

    function addLine(a: number[], b: number[]) {
        lines.push([a, b]);
    }
    
    function addEdge(e: number[]) {
        edges.push(e);
    }
 
    for (let i = 0; i < points.length; i+=3) {
        const A = points[i];
        const B = points[i + 1];
        const C = points[i + 2];

        const edges = [
            [A.x / scale, -A.y / scale, A.z],
            [B.x / scale, -B.y / scale, B.z],
            [C.x / scale, -C.y / scale, C.z]
        ];

        for (let i2 = 0; i2 < 3; i2++) {
            addLine(edges[i2], edges[(i2+1) % 3]);
        }
        
        for (const e of edges) {
            addEdge(e);
        }
    }

    lines.sort(([a, b], [a2, b2]) => (b[2] + a[2]) - (b2[2] + a2[2]));

    for (const [a,b] of lines) {
        drawLine(a,b);
    }

    edges.sort((a, b) => a[2] - b[2]);

    for (const e of edges) {
        drawEdge(e);
    }

    return canvas.toBuffer('image/png');
}

*/
