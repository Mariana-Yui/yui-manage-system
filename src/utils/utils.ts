class Utils {
    public arrayBufferToBlob(arraybuffer: ArrayBuffer): string {
        const blob = new Blob([arraybuffer]);
        const url = window.URL.createObjectURL(blob);
        return url;
    }
    private _setItem(key: string, val: any): void {
        // 简单判断是否是原始类型
        if (val == null || typeof val === 'function') {
            // eslint-disable-next-line quotes
            throw new Error("can't set item which is undefined or null");
        } else if (typeof val === 'object') {
            window.localStorage.setItem(key, JSON.stringify(val));
        } else {
            window.localStorage.setItem(key, val);
        }
    }
    public setItem(key: string | Record<string, any>, val?: any): void {
        if (typeof key === 'string') {
            this._setItem(key, val);
        } else {
            for (const [k, v] of Object.entries(key)) {
                this._setItem(String(k), v);
            }
        }
    }
    public getItem(key: string): any {
        // 不再判断空值, function
        const value = window.localStorage.getItem(key);
        try {
            return JSON.parse(value);
        } catch (err) {
            return value;
        }
    }
    public removeItem(...keys: string[]): void {
        keys.forEach((k: string) => {
            window.localStorage.removeItem(k);
        });
    }
}

const utils = new Utils();

export default utils;
