/// <reference types="three" />

import * as THREE from "three";
import GPUPickHelper from "./GPUPicker";
import {globals, visibleHeightAtZDepth, visibleWidthAtZDepth} from "./util";
import listeners from "./listeners";
import SnowHelper from "./snow";
import {animateEntranceExit, positionLetters, rotateLetters, swingLetters} from "./text";

let picker: GPUPickHelper;
let snowHelper: SnowHelper;

function main() {
    const canvas = <HTMLCanvasElement>document.querySelector('#c');
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
    globals.renderer = new THREE.WebGLRenderer({canvas});
    const fov = 75;
    globals.aspect = canvas.width/canvas.height;
    const near = 0.001;
    const far = 15;
    globals.camera = new THREE.PerspectiveCamera(fov, globals.aspect, near, far);
    globals.camera.position.z = 6;
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 0, 4);
    globals.scene.add(light);
    globals.pickingScene.background = new THREE.Color(0);
    picker = new GPUPickHelper(globals.renderer);

    globals.listener = new THREE.AudioListener();
    globals.camera.add(globals.listener);

    let texLoader = new THREE.TextureLoader();
    texLoader.load('img/background_4.jpg', function(texture: THREE.Texture) {
        const material = new THREE.SpriteMaterial({map: texture, color: 0xffffff});
        let mesh = new THREE.Sprite(material);
        let visHeight = visibleHeightAtZDepth(-5.5) * 2;
        let visWidth = visibleWidthAtZDepth(-5.5) * 2;
        mesh.scale.set(visWidth, visHeight, 1);
        mesh.position.z = -5;
        globals.background = mesh;
        globals.background.geometry.computeBoundingBox();
        globals.scene.add(mesh);
    });
    snowHelper = new SnowHelper();

    listeners(picker)

    globals.renderer.render(globals.scene, globals.camera);
}

function render() {
    positionLetters();
    swingLetters();
    rotateLetters();
    animateEntranceExit();
    snowHelper.animateSnow();
    globals.renderer.render(globals.scene, globals.camera);
    requestAnimationFrame(render);
}

main();
requestAnimationFrame(render);

