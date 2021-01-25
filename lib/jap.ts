
import * as polylines from 'polylines';

export type JapValue = number;

export interface JapData {
    [key: string]: JapValue
}

export interface JapInsertOptions {
    num?: number;
}

export interface JapDataPoint {
    x: number,
    y: number
}

export interface JapSettings {
    maxPoints: number,
}

export class JapPlot {
    public data: JapDataPoint[] = [];

    public constructor(private settings: JapSettings) {
    }
    
    public insert(value: JapValue, num: number) {
        const data = this.data;
        
        let start = 1 + this.splicePoint(value);
        let end = this.splicePoint(value + 1);

        for (; start <= end; start++) {
            data[start].y += num;
        }

        return this.simplify();
    }

    private splicePoint(value: JapValue) {
        const data = this.data;

        if (data.length === 0 || data[0].x > value) {
            data.unshift({x: value, y: 0}, {x: value, y: 0});
            return 0;
        }

        for (let i = 1; i < data.length; i++) {
            const next = data[i];

            if (next.x < value) {
                continue;
            }

            const prev = data[i - 1];
            
            if (next.x === prev.x) {
                return i - 1;
            }

            if (i + 1 < data.length && data[i + 1].x === next.x) {
                return i;
            }

            const y = prev.y + ((next.y - prev.y) / (next.x - prev.x) * (value - prev.x));
            
            data.splice(i, 0,
                {x: value, y: y},
                {x: value, y: y}
            );

            return i;
        }

        return data.push(
            {x: value, y: 0},
            {x: value, y: 0}
        ) - 2;
    }

    private simplify() {
        return polylines.simplifyPolyline(this.data, this.settings);
    }
}

export class Jap {

    public plots = new Map<string, JapPlot>();
    
    public constructor(private settings: JapSettings) {
    }

    public getPlot(key: string) {
        let plot = this.plots.get(key);

        if (!plot) {
            this.plots.set(key, plot = new JapPlot(this.settings));
        }

        return plot;
    }

    public insert(data: JapData, options: JapInsertOptions = {}) {
        for (const [key, value] of Object.entries(data)) {
            const plot = this.getPlot(key);

            plot.insert(value, options.num || 1);
        }
    }

}
