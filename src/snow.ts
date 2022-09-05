import {globals, visibleHeightAtZDepth, visibleWidthAtZDepth} from "./util";
import {SnowObject} from "./interfaces";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";

class SnowHelper {
    private readonly snow: SnowObject[];

    public constructor() {
        this.snow = [];
        this.createSnow()
    }

    public animateSnow() {
        for (let i = 0; i < this.snow.length; i++) {
            let snowi = this.snow[i];
            let now = performance.now();
            let dt = now - snowi.startTime;
            if (dt > 3000) snowi.startTime = performance.now();
            let percentage = dt/3000;
            snowi.object.position.y = visibleHeightAtZDepth(-3) - percentage* visibleHeightAtZDepth(-3) * 2;
            let rand = Math.random();
            if (rand > 0.95) snowi.isSine = !snowi.isSine;
            rand -= 0.5;
            if (snowi.isSine) {
                snowi.object.position.x += Math.sin(percentage * Math.PI * 2) * 0.03 + rand * 0.01;
            } else {
                snowi.object.position.x += Math.cos(percentage * Math.PI * 2) * 0.03 + rand * 0.01;
            }
        }
    }

    private createSnow() {
        const loader = new OBJLoader();
        const snow = this.snow;
        loader.load("objs/Snowflake.obj", function (object: THREE.Object3D) {
            object.scale.set(0.001, 0.001, 0.010);
            object.position.x = (Math.random() * 2 - 1) * visibleWidthAtZDepth(-3);
            object.position.z = -3;
            let snowObj = {object: object, startTime: performance.now(), isSine: Math.random() > 0.5};
            snow.push(snowObj);
            globals.scene.add(object);
            for (let i = 1; i < 15; i++) {
                let newobj = new THREE.Object3D();
                newobj.copy(object, true);
                newobj.position.x = (Math.random() * 2 - 1) * visibleWidthAtZDepth(-3);
                globals.scene.add(newobj);
                let newSnowObj = {object: newobj, startTime: Math.random() * 3000, isSine: Math.random() > 0.5};
                snow.push(newSnowObj)
            }
        });
    }
}

export default SnowHelper;