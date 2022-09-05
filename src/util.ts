import * as THREE from "three";
import {HangingObject} from "./interfaces";
import {PerspectiveCamera} from "three";

const idToObject: {[id: number]: HangingObject} = {};

interface Globals {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    aspect: number
    renderer: THREE.WebGLRenderer
    pickPosition: THREE.Vector2
    listener: THREE.AudioListener
    letters: HangingObject[]
    pickingScene: THREE.Scene
    pickingLetters: HangingObject[]
    letterWidth: number
    id: number
    background: THREE.Sprite
}

const globals: Globals = {
    scene: new THREE.Scene(),
    camera: new PerspectiveCamera(),
    aspect: 0,
    renderer: new THREE.WebGLRenderer(),
    pickPosition: new THREE.Vector2(),
    listener: new THREE.AudioListener(),
    letters: [],
    pickingScene: new THREE.Scene(),
    pickingLetters: [],
    letterWidth: 0,
    id: 0,
    background: new THREE.Sprite(),
}

function visibleHeightAtZDepth(depth: number) {
    const vFOV = (75/2) * Math.PI / 180;
    const c = (globals.camera.position.z - depth) / Math.cos(vFOV);
    return Math.sin(vFOV) * c;
}

function visibleWidthAtZDepth(depth: number) {
    return visibleHeightAtZDepth(depth) * globals.aspect;
}

export {idToObject, globals, visibleHeightAtZDepth, visibleWidthAtZDepth}