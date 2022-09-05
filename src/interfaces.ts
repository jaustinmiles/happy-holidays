import * as THREE from "three";

interface HangingObject {
    object: THREE.Mesh,
    startTime: number,
    pivot: THREE.Object3D;
    pendulum: Pendulum;
    string: THREE.Mesh | null,
    rotation: {
        started: boolean,
        currentRotation: number,
        rate: number
        numRotations: number
    },
    entranceAnimation: {
        incoming: boolean,
        animated: boolean,
        destinationY: number,
        deleteFlag: boolean
    }
}

interface Pendulum {
    armLength: number;
    angle: number;
    aVelocity: number;
    aAcceleration: number;
}

interface SnowObject {
    object: THREE.Object3D,
    startTime: number,
    isSine: boolean
}

export {HangingObject, Pendulum, SnowObject}