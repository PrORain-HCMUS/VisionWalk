import { ClassicCurve } from "@/components/classic-curve";

export type Options = {
    container: HTMLElement;
    style?: "ios";
    ratio?: number;
    speed?: number;
    amplitude?: number;
    frequency?: number;
    color?: string;
    cover?: boolean;
    width?: number;
    height?: number;
    autostart?: boolean;
    pixelDepth?: number;
    lerpSpeed?: number;
    curveDefinition?: IClassicCurveDefinition[];
};

export interface IClassicCurveDefinition {
    attenuation: number;
    lineWidth: number;
    opacity: number;
    color?: string;
}

export interface ICurve {
    draw: () => void;
}

export class SiriWave {
    opt: Options;
    phase: number = 0;
    run: boolean = false;
    curves: ICurve[] = [];
    speed: number;
    amplitude: number;
    width: number;
    height: number;
    heightMax: number;
    color: string;
    interpolation: {
        speed: number | null;
        amplitude: number | null;
    };
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D;
    animationFrameId: number | undefined;
    timeoutId: ReturnType<typeof setTimeout> | undefined;

    constructor({ container, ...rest }: Options) {
        const csStyle = window.getComputedStyle(container);

        this.opt = {
            container,
            style: "ios",
            ratio: window.devicePixelRatio || 1,
            speed: 0.2,
            amplitude: 1,
            frequency: 6,
            color: "#fff",
            cover: false,
            width: parseInt(csStyle.width.replace("px", ""), 10),
            height: parseInt(csStyle.height.replace("px", ""), 10),
            autostart: true,
            pixelDepth: 0.02,
            lerpSpeed: 0.1,
            ...rest,
        };

        this.speed = Number(this.opt.speed);
        this.amplitude = Number(this.opt.amplitude);
        this.width = Number(this.opt.ratio! * this.opt.width!);
        this.height = Number(this.opt.ratio! * this.opt.height!);
        this.heightMax = Number(this.height / 2) - 6;
        this.color = `rgb(${this.hex2rgb(this.opt.color!)})`;
        this.interpolation = {
            speed: this.speed,
            amplitude: this.amplitude,
        };

        this.canvas = document.createElement("canvas");
        const ctx = this.canvas.getContext("2d");
        if (ctx === null) {
            throw new Error("Unable to create 2D Context");
        }
        this.ctx = ctx;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        if (this.opt.cover === true) {
            this.canvas.style.width = this.canvas.style.height = "100%";
        } else {
            this.canvas.style.width = `${this.width / this.opt.ratio!}px`;
            this.canvas.style.height = `${this.height / this.opt.ratio!}px`;
        }

        this.curves = (this.opt.curveDefinition || ClassicCurve.getDefinition()).map(
            (def) => new ClassicCurve(this, def)
        );

        this.opt.container.appendChild(this.canvas);

        if (this.opt.autostart) {
            this.start();
        }
    }

    private hex2rgb(hex: string): string | null {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? `${parseInt(result[1], 16).toString()},${parseInt(result[2], 16).toString()},${parseInt(
                result[3],
                16
            ).toString()}`
            : null;
    }

    private intLerp(v0: number, v1: number, t: number): number {
        return v0 * (1 - t) + v1 * t;
    }

    private lerp(propertyStr: "amplitude" | "speed"): number | null {
        const prop = this.interpolation[propertyStr];
        if (prop !== null) {
            this[propertyStr] = this.intLerp(this[propertyStr], prop, this.opt.lerpSpeed!);
            if (this[propertyStr] - prop === 0) {
                this.interpolation[propertyStr] = null;
            }
        }
        return this[propertyStr];
    }

    private clear() {
        this.ctx.globalCompositeOperation = "destination-out";
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.globalCompositeOperation = "source-over";
    }

    private draw() {
        this.curves.forEach((curve) => curve.draw());
    }

    private startDrawCycle() {
        this.clear();
        this.lerp("amplitude");
        this.lerp("speed");
        this.draw();
        this.phase = (this.phase + (Math.PI / 2) * this.speed) % (2 * Math.PI);

        if (window.requestAnimationFrame) {
            this.animationFrameId = window.requestAnimationFrame(this.startDrawCycle.bind(this));
        } else {
            this.timeoutId = setTimeout(this.startDrawCycle.bind(this), 20);
        }
    }

    start() {
        if (!this.canvas) {
            throw new Error("This instance of SiriWave has been disposed, please create a new instance");
        }

        this.phase = 0;
        if (!this.run) {
            this.run = true;
            this.startDrawCycle();
        }
    }

    stop() {
        this.phase = 0;
        this.run = false;

        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    dispose() {
        this.stop();
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
    }

    set(propertyStr: "amplitude" | "speed", value: number) {
        this.interpolation[propertyStr] = value;
    }

    setSpeed(value: number) {
        this.set("speed", value);
    }

    setAmplitude(value: number) {
        this.set("amplitude", value);
    }
}