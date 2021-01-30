
import {Cloud, CloudSettings} from 'cloud';

export type JACValue = number;

export type JACData<D extends string = string> = Record<D, number>;

export class JAC<D extends string> {
    public dimensions: D[]; 
    
    public cloud: Cloud;

    public constructor(settings: CloudSettings, volumeDimension: D, ...otherDimensions: D[]) {
        this.cloud = new Cloud(settings);

        this.dimensions = [volumeDimension];
        
        for (const dimension of otherDimensions) {
            this.cloud.addDimension();
            this.dimensions.push(dimension);
        }
    }
    
    public add(data: JACData<D>) {
        const arr = this.dataToArray(data);

        this.cloud.add(arr);
    }

    public getData(): JACData<D>[] {
        return this.cloud.getPoints().map(P => this.arrayToData(P));
    }

    public dataToArray(data: JACData<D>): Float64Array {
        const dimensions = this.dimensions;

        const arr = new Float64Array(dimensions.length);

        for (let i = 0; i < dimensions.length; i++) {
            arr[i] = data[dimensions[i]];
        }

        return arr;
    }
    
    public arrayToData(arr: Float64Array): JACData<D> {
        const data = {} as JACData<D>;

        const dimensions = this.dimensions;
        
        for (let i = 0; i < dimensions.length; i++) {
            data[dimensions[i]] = arr[i];
        }

        return data;
    }
}
