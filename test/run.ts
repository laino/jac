
import * as math from 'math';
import * as fs from 'fs';
import {createCanvas} from 'canvas';

/*const p1 = {x: 0, y: 0, z: 0};
const p2 = {x: 0, y: 1, z: 0};
const p3 = {x: 1, y: 0, z: 0};

const l1 = {x: 0, y: 2, z: 0};
const l2 = {x: 2, y: 2, z: 0};

console.log(math.lineUVs(l1, l2, p1, p2, p3));
*/

const m = new math.Mesh();

const A = {x: 200, y: 0, z: 0};
const B = {x: 300, y: 100, z: 0};
const C = {x: 400, y: 0, z: 0};

m.add([A, B, C]);

fs.writeFileSync('/tmp/out.png', draw(m.points));

function draw(points: math.Point[]) {
    const canvas = createCanvas(1200, 1200);

    const c = canvas.getContext('2d');

    c.strokeStyle = 'rgba(0, 200, 0, 1)';
    c.fillStyle = 'rgba(200, 0, 0, 1)';
    c.lineJoin = 'bevel';
    c.lineWidth = 3;

    // drawing with XOR lets us spot errors very easily
    c.globalCompositeOperation = 'xor';

    for (let i = 0; i < points.length; i+=3) {
        const A = points[i];
        const B = points[i + 1];
        const C = points[i + 2];

        const edges = [
            [A.x + 600, -A.y + 600],
            [B.x + 600, -B.y + 600],
            [C.x + 600, -C.y + 600]
        ];

        c.beginPath();
        c.moveTo(edges[2][0], edges[2][1])
        for (const [x,y] of edges) {
            c.lineTo(x, y);
        }
        c.closePath();
        c.stroke();

        for (const [x,y] of edges) {
            c.beginPath();
            c.arc(x, y, 10, 0, Math.PI * 2);
            c.closePath();
            c.fill();
        }
    }

    return canvas.toBuffer('image/png');
}

