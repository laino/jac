
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
        const newData: JapDataPoint[] = [];

        for (const point of this.data) {
            newData.push(point);

            if (point.x < value) {
                newData.push({x: value, y: num});
            }
        }

        this.data = newData;

        this.simplify();
    }

    private simplify() {
        if (this.data.length < this.settings.maxPoints) {
            return;
        }

        this.data = simplifyPolyline(this.data);
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
