export interface Edge {
    a: Point,
    b: Point 
}

export interface Point {
    x: number,
    y: number,
    z: number,
}

export class Mesh {
    private points: Point[];
    private edges: Edge[];

    public constructor(private settings: JapSettings) {
    }

    public spliceRect(x: number, y: number, x2: number, y2: number) {
        const points = this.points;
        const edges = this.edges;

        const pointsInside: Point[] = [];
        
        const corners = [
            {x: x, y: y, z: 0},
            {x: x2, y: y, z: 0},
            {x: x2, y: y2, z: 0},
            {x: x, y: y2, z: 0}
        ];

        const cornerEdges = [
            corners[0], corners[1],
            corners[1], corners[2],
            corners[3], corners[4],
            corners[4], corners[0]
        ];

        for (const point of points) {
            if (point.x <= x || point.x >= x2 || point.y <= y || point.y >= y2) {
                continue;
            }

            pointsInside.push(point);
        }
        
        for (const corner of corners) {
            corner.z = this.sample(corner.x, corner.y);
        }

        for (let i = 0; i < cornerEdges.length; i++) {

        }
    }

    public sample(x: number, y: number): number {
        const triangle = this.triangleAt(x, y);
    }

    private triangleAt(x: number, y: number) {
        const edges = this.edges;

        const cEdges: Edge[] = [];

        for (const edge of edges) {
            if (onLine(x, edge.a.x, edge.b.x) || onLine(y, edge.a.y, edge.b.y)) {
                for (const edge2 of cEdges) {
                    if ((edge.a === edge2.a) || (edge.b === edge2.a)) {
                        const {u,v} = uv(x, y, edge.a, edge.b, edge2.b);

                        if ((u >= 0) && (v >= 0) && (u + v < 1)) {
                            return {u, v, a: edge.a, b: edge.b, c: edge2.b};
                        }
                    }

                    if ((edge.b === edge2.b) || (edge.a === edge2.b)) {
                        const {u,v} = uv(x, y, edge.a, edge.b, edge2.a);

                        if ((u >= 0) && (v >= 0) && (u + v < 1)) {
                            return {u, v, a: edge.a, b: edge.b, c: edge2.a};
                        }
                    }
                }

                cEdges.push(edge);
            }
        }

        return null;
    }
}

export function uv(x: number, y: number, A: Point, B: Point, C: Point) {
    const v0x = C.x - A.x;
    const v0y = C.y - A.y;
    
    const v1x = B.x - A.x;
    const v1y = B.y - A.y;
    
    const v2x = x - A.x;
    const v2y = y - A.y;
    
    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);

    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot12) * invDenom;

    return {u, v};
}

function onLine(p, a, b) {
    if (a > b) {
        return p >= b && p <= a;
    }
        
    return p >= a && p <= b;
}
