/// <reference types="three" />

import * as THREE from "three";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry";
import {FontLoader} from "three/examples/jsm/loaders/FontLoader";
import {Loader} from "three";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let pickingScene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
const letters: HangingObject[] = [];
const pickingLetters: HangingObject[] = [];
const idToObject: {[id: number]: HangingObject} = {};
const snow: SnowObject[] = [];
let id: number = 0;
let aspect: number;
let pickPosition: THREE.Vector2 = new THREE.Vector2(0, 0);
let picker: GPUPickHelper;
let listener: THREE.AudioListener;
let background: THREE.Sprite;
let letterWidth: number = 0;

class GPUPickHelper {
    private pickingTexture: THREE.WebGLRenderTarget;
    private pixelBuffer: Uint8Array;
    private pickedObject: HangingObject | null;
    private pickedObjectSavedColor: number;

    constructor() {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.pickedObjectSavedColor = 0;
    }

    pick(cssPosition: THREE.Vector2, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        if (this.pickedObject) {
            if (this.pickedObject.object.material instanceof THREE.MeshPhongMaterial) {
                this.pickedObject.object.material.color.setHex(this.pickedObjectSavedColor);
                this.pickedObject = null;
            }
        }

        const pixelRatio = renderer.getPixelRatio();
        camera.setViewOffset(
            renderer.getContext().drawingBufferWidth,
            renderer.getContext().drawingBufferHeight,
            cssPosition.x * pixelRatio | 0,
            cssPosition.y * pixelRatio | 0,
            1,
            1
        );
        renderer.setRenderTarget(this.pickingTexture);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

        camera.clearViewOffset();
        renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, 1, 1, this.pixelBuffer);

        const id =
            (this.pixelBuffer[0] << 16) |
            (this.pixelBuffer[1] <<  8) |
            (this.pixelBuffer[2]      );
        const intersectedObject = idToObject[id];
        if (intersectedObject) {
            this.pickedObject = intersectedObject;
            if (this.pickedObject.object.material instanceof THREE.MeshPhongMaterial) {
                this.pickedObjectSavedColor = this.pickedObject.object.material.color.getHex();
                this.pickedObject.object.material.color.setHex(0xFF0000);
                this.pickedObject.rotation.started = true;
                scene.updateMatrixWorld();
                let objectLeft = new THREE.Vector3().setFromMatrixPosition(this.pickedObject.object.matrixWorld);
                this.pickedObject.object.geometry.computeBoundingBox();
                let objectWidth = this.pickedObject.object.geometry.boundingBox.max.x - this.pickedObject.object.geometry.boundingBox.min.x;
                let objectCenter = objectLeft.x + objectWidth / 2;

                var vec = new THREE.Vector3(); // create once and reuse
                var pos = new THREE.Vector3(); // create once and reuse
                let canvas = <HTMLCanvasElement>document.getElementById('c');
                vec.set(
                    ( pickPosition.x / canvas.clientWidth ) * 2 - 1,
                    - ( pickPosition.y / canvas.clientHeight ) * 2 + 1,
                    0.5 );
                vec.unproject( camera );
                vec.sub( camera.position ).normalize();
                var distance = (-2 - camera.position.z) / vec.z;
                pos.copy( camera.position ).add( vec.multiplyScalar( distance ) );
                let rate = Math.abs(pos.x - objectCenter) / (objectWidth) * 2;
                this.pickedObject.rotation.rate = rate * rate;
                this.pickedObject.rotation.numRotations = Math.ceil(rate * 4);

                var sound = new THREE.Audio(listener);
                var audioLoader = new THREE.AudioLoader();
                // @ts-ignore
                audioLoader.load('audio/jingle_short.wav', (buffer: THREE.AudioBuffer) => {
                    sound.setBuffer(buffer);
                    sound.setLoop(false);
                    sound.setVolume(0.4);
                    sound.play();
                })
            }
        }
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

addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key == " ") {
        event.preventDefault();
    }
    const text = event.key;
    createLetter(scene, letters, text);
});

addEventListener("resize", () => {
    const canvas = <HTMLCanvasElement>document.querySelector('#c');
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
    aspect = canvas.width/canvas.height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.width, canvas.height);
    let scale = 0;
    let visHeight = visibleHeightAtZDepth(-7) * 2;
    let visWidth = visibleWidthAtZDepth(-7) * 2;
    if (visHeight > visWidth) scale = visHeight; else scale = visWidth;
    background.scale.set(visWidth, visHeight, 1);
});

// addEventListener("onclick", (event: Event) => {
//     const rect = (<HTMLCanvasElement>document.querySelector('#c')).getBoundingClientRect();
//     pickPosition.x = (<MouseEvent>event).clientX - rect.left;
//     pickPosition.y = (<MouseEvent>event).clientY - rect.top;
// });

function main() {
    const canvas = <HTMLCanvasElement>document.querySelector('#c');
    canvas.onmousemove = (event: MouseEvent) => {
        let rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        let xPercentage = x / canvas.width;
        let yPercentage = y / canvas.height;
        // let backWidth = background.geometry.boundingBox.max.x - background.geometry.boundingBox.min.x;
        // let backHeight = background.geometry.boundingBox.max.y - background.geometry.boundingBox.min.y;
        background.position.set(xPercentage - 0.5, yPercentage - 0.5, -5);
    };
    canvas.onclick = (event: Event) => {
        let rect = canvas.getBoundingClientRect();
        pickPosition.x = (<MouseEvent>event).clientX - rect.left;
        pickPosition.y = (<MouseEvent>event).clientY - rect.top;
        picker.pick(pickPosition, pickingScene, camera);
    };
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
    renderer = new THREE.WebGLRenderer({canvas});
    const fov = 75;
    aspect = canvas.width/canvas.height;
    const near = 0.001;
    const far = 15;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 6;
    scene = new THREE.Scene();
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 0, 4);
    scene.add(light);
    pickingScene = new THREE.Scene;
    pickingScene.background = new THREE.Color(0);
    picker = new GPUPickHelper();

    listener = new THREE.AudioListener();
    camera.add(listener);

    let texLoader = new THREE.TextureLoader();
    texLoader.load('img/background_4.jpg', function(texture: THREE.Texture) {
        // var geometry = new THREE.BoxBufferGeometry(visibleHeightAtZDepth(-5) * 2, visibleWidthAtZDepth(-5) * 2, 0.5);
        var material = new THREE.SpriteMaterial({map: texture, color:0xffffff});
        let mesh = new THREE.Sprite(material);
        let scale = 0;
        let visHeight = visibleHeightAtZDepth(-5.5) * 2;
        let visWidth = visibleWidthAtZDepth(-5.5) * 2;
        if (visHeight > visWidth) scale = visHeight; else scale = visWidth;
        mesh.scale.set(visWidth, visHeight, 1);
        mesh.position.z = -5;
        background = mesh;
        background.geometry.computeBoundingBox();
        scene.add(mesh);
    });

    // for (let i = 0; i < 10; i++) {
    var loader = new OBJLoader();
    loader.load("objs/Snowflake.obj", function (object: THREE.Object3D) {
        // object.rotateX(-Math.PI / 2);
        object.scale.set(0.001, 0.001, 0.010);
        object.position.x = (Math.random() * 2 - 1) * visibleWidthAtZDepth(-3);
        object.position.z = -3;
        // object.rotateZ(Math.PI/4);
        let snowObj = {object: object, startTime: performance.now(), isSine: Math.random() > 0.5};
        snow.push(snowObj);
        scene.add(object);
        for (let i = 1; i < 15; i++) {
            let newobj = new THREE.Object3D();
            newobj.copy(object, true);
            newobj.position.x = (Math.random() * 2 - 1) * visibleWidthAtZDepth(-3);
            scene.add(newobj);
            let newSnowObj = {object: newobj, startTime: Math.random() * 3000, isSine: Math.random() > 0.5};
            snow.push(newSnowObj)
        }
    });
    // }



    // var geometry = new THREE.SphereGeometry( 2, 32, 32 );
    // var material = new THREE.MeshPhongMaterial( {color: 0xffff00} );
    // var sphere = new THREE.Mesh( geometry, material );
    // sphere.position.x = visibleWidthAtZDepth(-2);
    // sphere.position.z = -2;
    // scene.add( sphere );

    renderer.render(scene, camera);
}

function render() {
    positionLetters();
    swingLetters();
    rotateLetters();
    animateEntranceExit();
    animateSnow();
    renderer.render(scene, camera);
    // renderer.render(pickingScene, camera)
    requestAnimationFrame(render);
}

main();
requestAnimationFrame(render);

function visibleHeightAtZDepth(depth: number) {
    const vFOV = (75/2) * Math.PI / 180;
    const c = (camera.position.z - depth) / Math.cos(vFOV);
    return Math.sin(vFOV) * c;
}

function visibleWidthAtZDepth(depth: number) {
    return visibleHeightAtZDepth(depth) * aspect;
}

function positionLetters() {
    if (letters.length == 0) return;
    const space = visibleWidthAtZDepth(-2) * 2;
    let numIncs = 0;
    for (let i=0; i< letters.length; i++) if (!letters[i].entranceAnimation.deleteFlag) numIncs++;
    const increment = (space - letterWidth * 2) / (numIncs + 1);
    for (let i = 0; i < letters.length; i++) {
        if (letters[i].entranceAnimation.animated && !letters[i].entranceAnimation.incoming) continue;
        letters[i].pivot.position.x = -visibleWidthAtZDepth(letters[i].pivot.position.z) + letterWidth + (i + 1) * increment;
        pickingLetters[i].pivot.position.x = -visibleWidthAtZDepth(letters[i].pivot.position.z) + letterWidth + (i + 1) * increment;
    }
}

function swingLetters() {
    for (let i = 0; i < letters.length; i++) {
        let pivot = letters[i].pivot;
        let pendulum = letters[i].pendulum;
        let gravity = 0.01;
        pendulum.aAcceleration = (-1 * gravity / pendulum.armLength) * Math.sin(pendulum.angle);
        pendulum.aVelocity += pendulum.aAcceleration;
        pendulum.angle += pendulum.aVelocity;
        pivot.rotation.set(0, 0, pendulum.angle);
        pickingLetters[i].pivot.rotation.set(0, 0, pendulum.angle);
    }
}

function rotateLetters() {
    for (let i = 0; i < letters.length; i++) {
        let string = letters[i].string;
        if (string == null) continue;
        if (letters[i].rotation.started) {
            let progress = letters[i].rotation.currentRotation;
            let total = letters[i].rotation.numRotations * Math.PI * 2;
            let remain =  total - progress;
            let rate = letters[i].rotation.rate * remain/total;
            if (rate < 0.05) rate = 0.05;
            string.rotateY(rate);
            letters[i].rotation.currentRotation = letters[i].rotation.currentRotation + rate;
            // letters[i].rotation.rate = rate;
            if (letters[i].rotation.currentRotation > Math.PI * 2 * letters[i].rotation.numRotations ) {
                string.rotation.set(0, 0, 0);
                letters[i].rotation.currentRotation = 0;
                letters[i].rotation.started = false;
            }
        }

    }
}

function animateEntranceExit() {
    for (let i = letters.length-1; i >=0; i--) {
        let letter = letters[i];
        let pickingLetter = pickingLetters[i];
        if (letter.entranceAnimation.animated && letter.entranceAnimation.incoming) {
            if (letter.string != null && pickingLetter.string != null) {
                letter.string.position.y -= 0.1;
                pickingLetter.string.position.y -= 0.1;
                if (letter.string.position.y < letter.entranceAnimation.destinationY) {
                    letter.string.position.y = letter.entranceAnimation.destinationY;
                    pickingLetter.string.position.y = letter.entranceAnimation.destinationY;
                    letter.entranceAnimation.animated = false;
                    letter.entranceAnimation.incoming = false;
                }
            }
        } else if (letter.entranceAnimation.animated && !letter.entranceAnimation.incoming && letter.entranceAnimation.deleteFlag) {
            let destx = visibleWidthAtZDepth(-2) * 1.2;
            letter.pivot.position.x += 0.2;
            pickingLetter.pivot.position.x += 0.2;
            if (letter.pivot.position.x >= destx) {
                // let hang = letters.pop();
                // let pickHang = pickingLetters.pop();
                let hang = letters.splice(i, 1).pop();
                let pickHang = pickingLetters.splice(i, 1).pop();
                if (hang != null && pickHang != null) {
                    let oldPivot = hang.pivot;
                    scene.remove(oldPivot);
                    pickingScene.remove(pickHang.pivot);
                }
            }
        }
    }
}

function animateSnow() {
    for (let i = 0; i < snow.length; i++) {
        let snowi = snow[i];
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

function createLetter(scene: THREE.Scene, letters: HangingObject[], str: string) {
    if (str == "Backspace") {
        var sound = new THREE.Audio(listener);
        var audioLoader = new THREE.AudioLoader();
        for (let i = letters.length -1; i >= 0; i--) {
            let test = letters[i];
            if (!test.entranceAnimation.deleteFlag) {
                test.entranceAnimation.deleteFlag = true;
                test.entranceAnimation.animated = true;
                test.entranceAnimation.incoming = false;
                break;
            }
        }
        // @ts-ignore
        audioLoader.load('sounds/swoosh.wav', (buffer: THREE.AudioBuffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.1);
            sound.play();
        });
        // if (old.material instanceof THREE.Material) {
        //     old.material.dispose();
        // }
        // old.geometry.dispose();
    }
    if (str.length != 1) return;
    const loader = new FontLoader()
    let letter: THREE.Mesh;
    loader.load('fonts/gentilis_bold.typeface.json', function (font) {
        const geometry = new TextGeometry(str, {
            font: font,
            size: 1,
            height: 0.2,
            curveSegments: 12,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelEnabled: true
        });
        geometry.computeBoundingBox();
        if (letterWidth == 0 && str != " ") letterWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x + 0.1;
        const material = new THREE.MeshPhongMaterial({color: 0x406E01, specular: 0x222222});
        letter = new THREE.Mesh(geometry, material);
        letter.geometry.computeBoundingBox();
        const width = letter.geometry.boundingBox.max.x - letter.geometry.boundingBox.min.x;
        letter.position.x = 0 - width/2;
        letter.position.y = -1 * (((visibleHeightAtZDepth(-2) * 2) * 0.25) + Math.random() * visibleHeightAtZDepth(-2));
        // letter.position.z = -2;
        // scene.add(letter);
        let pivot = new THREE.Object3D();
        pivot.position.x = 0 - width/2;
        pivot.position.z = -2;
        pivot.position.y = visibleHeightAtZDepth(-2);
        // pivot.add(letter);
        scene.add(pivot);
        let pendulum = {armLength: visibleHeightAtZDepth(letter.position.z) - letter.position.y, angle: Math.random() * Math.PI/16 - Math.PI/32, aVelocity: 0, aAcceleration: 0};
        let hanging = {object: letter, startTime: performance.now(), pivot: pivot, pendulum: pendulum, string: null, rotation: {started: false, currentRotation: 0, rate: 0, numRotations: 0}, entranceAnimation: {
                incoming: true,
                animated: true,
                destinationY: 0,
                deleteFlag: false
            }};
        letters.push(hanging);
        createString(letter, pivot, hanging);

        var sound = new THREE.Audio(listener);
        var audioLoader = new THREE.AudioLoader();
        // @ts-ignore
        audioLoader.load('sounds/bell.wav', (buffer: THREE.AudioBuffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.1);
            sound.play();
        });

        // Create picking cube
        id += 1;
        idToObject[id] = hanging;
        const pickingMaterial = new THREE.MeshPhongMaterial({
            emissive: new THREE.Color(id),
            color: new THREE.Color(0, 0, 0),
            specular: new THREE.Color(0, 0, 0),
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.5,
            blending: THREE.NoBlending,
        });
        const pickingLetter = new THREE.Mesh(geometry, pickingMaterial);
        pickingLetter.position.copy(letter.position);
        pickingLetter.position.y = pickingLetter.position.y * 2;
        pickingLetter.rotation.copy(letter.rotation);
        pickingLetter.scale.copy(letter.scale);
        let pickingPivot = new THREE.Object3D();
        pickingPivot.position.x = 0 - width/2;
        pickingPivot.position.z = -2;
        pickingPivot.position.y = visibleHeightAtZDepth(-2);
        // pickingPivot.add(pickingLetter);
        let hangingPick = {object: pickingLetter, startTime: performance.now(), pivot: pickingPivot, pendulum: pendulum, string: null, rotation: {started: false, currentRotation: 0, rate: 0, numRotations: 0}, entranceAnimation: {
                incoming: true,
                animated: true,
                destinationY: 0,
                deleteFlag: false
            }};
        pickingLetters.push(hangingPick);
        pickingScene.add(pickingPivot);
        createString(pickingLetter, pickingPivot, hangingPick);
    });
}

function createString(letter: THREE.Mesh, pivot: THREE.Object3D, hanging: HangingObject) {
    const height = -letter.position.y;
    let cylGeo = new THREE.CylinderGeometry(0.01, 0.01, height );
    let material = new THREE.MeshPhongMaterial({color: 0x44aa88, specular: 0x444444});
    let cylinder = new THREE.Mesh(cylGeo, material);
    pivot.add(cylinder);
    hanging.entranceAnimation.destinationY = -((height)/2);
    cylinder.position.y = height/2;
    cylinder.position.x = (letter.geometry.boundingBox.max.x - letter.geometry.boundingBox.min.x)/2;
    cylinder.position.z = 0.1;
    hanging.string = cylinder;
    letter.position.y = -height/2;
    cylinder.add(letter);
}