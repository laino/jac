
import * as math from 'math';

export type JACValue = number;

export interface JACData {
    [key: string]: JACValue
}

export interface JACInsertOptions {
    num?: number;
}

export interface JACSettings {
    maxPoints: number
    volumeKey: string
}

const DEFAULTS: JACSettings = {
    maxPoints: 100,
    volumeKey: 'volume'
};

export class JAC {
    public keys: Record<string, number> = {};
    public keyArray: string[] = []; 
    
    public cloud: math.Cloud;
    public settings: JACSettings;

    public constructor(settings: Partial<JACSettings> = {}) {
        this.settings = Object.assign({}, DEFAULTS, settings);

        this.cloud = new math.Cloud(this.settings);
        
        this.keys[this.settings.volumeKey] = 0;
        this.keyArray.push(this.settings.volumeKey);
    }
    
    public add(data: JACData) {
        const arr = this.dataToArray(data);

        this.cloud.add(arr);
    }

    public getData() {
        return this.cloud.getPoints().map(P => this.arrayToData(P));
    }

    public dataToArray(data: JACData): Float64Array {
        const arr = new Float64Array(this.keyArray.length);

        for (const [k, v] of Object.entries(data)) {
            if (!this.keys.hasOwnProperty(k)) {
                this.addDimension(k);

                return this.dataToArray(data);
            }

            arr[this.keys[k]] = v;
        }

        return arr;
    }
    
    public arrayToData(arr: math.NumberArrayLike): JACData {
        const data = {};

        for (let i = 0; i < arr.length; i++) {
            data[this.keyArray[i]] = arr[i];
        }

        return data;
    }

    public addDimension(key: string) {
        const i = this.cloud.addDimension();

        this.keys[key] = i;
        this.keyArray[i] = key;

        return i;
    }    
}
