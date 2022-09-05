import * as THREE from "three";
import {HangingObject} from "./interfaces";
import {FontLoader} from "three/examples/jsm/loaders/FontLoader";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry";
import {globals, idToObject, visibleHeightAtZDepth, visibleWidthAtZDepth} from "./util";

function createLetter(scene: THREE.Scene, letters: HangingObject[], str: string) {
    if (str == "Backspace") {
        const sound = new THREE.Audio(globals.listener);
        const audioLoader = new THREE.AudioLoader();
        for (let i = letters.length -1; i >= 0; i--) {
            let test = letters[i];
            if (!test.entranceAnimation.deleteFlag) {
                test.entranceAnimation.deleteFlag = true;
                test.entranceAnimation.animated = true;
                test.entranceAnimation.incoming = false;
                break;
            }
        }
        audioLoader.load('sounds/swoosh.wav', (buffer: AudioBuffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.1);
            sound.play();
        });
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
        if (globals.letterWidth == 0 && str != " ") globals.letterWidth = geometry.boundingBox.max.x - geometry.boundingBox.min.x + 0.1;
        const material = new THREE.MeshPhongMaterial({color: 0x406E01, specular: 0x222222});
        letter = new THREE.Mesh(geometry, material);
        letter.geometry.computeBoundingBox();
        const width = letter.geometry.boundingBox.max.x - letter.geometry.boundingBox.min.x;
        letter.position.x = 0 - width/2;
        letter.position.y = -1 * (((visibleHeightAtZDepth(-2) * 2) * 0.25) + Math.random() * visibleHeightAtZDepth(-2));
        let pivot = new THREE.Object3D();
        pivot.position.x = 0 - width/2;
        pivot.position.z = -2;
        pivot.position.y = visibleHeightAtZDepth(-2);
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

        const sound = new THREE.Audio(globals.listener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('sounds/bell.wav', (buffer: AudioBuffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.1);
            sound.play();
        });

        // Create picking cube
        globals.id += 1;
        idToObject[globals.id] = hanging;
        const pickingMaterial = new THREE.MeshPhongMaterial({
            emissive: new THREE.Color(globals.id),
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
        let hangingPick = {object: pickingLetter, startTime: performance.now(), pivot: pickingPivot, pendulum: pendulum, string: null, rotation: {started: false, currentRotation: 0, rate: 0, numRotations: 0}, entranceAnimation: {
                incoming: true,
                animated: true,
                destinationY: 0,
                deleteFlag: false
            }};
        globals.pickingLetters.push(hangingPick);
        globals.pickingScene.add(pickingPivot);
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

function positionLetters() {
    if (globals.letters.length == 0) return;
    const space = visibleWidthAtZDepth(-2) * 2;
    let numIncs = 0;
    for (let i=0; i< globals.letters.length; i++) if (!globals.letters[i].entranceAnimation.deleteFlag) numIncs++;
    const increment = (space - globals.letterWidth * 2) / (numIncs + 1);
    for (let i = 0; i < globals.letters.length; i++) {
        if (globals.letters[i].entranceAnimation.animated && !globals.letters[i].entranceAnimation.incoming) continue;
        globals.letters[i].pivot.position.x = -visibleWidthAtZDepth(globals.letters[i].pivot.position.z) + globals.letterWidth + (i + 1) * increment;
        globals.pickingLetters[i].pivot.position.x = -visibleWidthAtZDepth(globals.letters[i].pivot.position.z) + globals.letterWidth + (i + 1) * increment;
    }
}

function swingLetters() {
    for (let i = 0; i < globals.letters.length; i++) {
        let pivot = globals.letters[i].pivot;
        let pendulum = globals.letters[i].pendulum;
        let gravity = 0.01;
        pendulum.aAcceleration = (-1 * gravity / pendulum.armLength) * Math.sin(pendulum.angle);
        pendulum.aVelocity += pendulum.aAcceleration;
        pendulum.angle += pendulum.aVelocity;
        pivot.rotation.set(0, 0, pendulum.angle);
        globals.pickingLetters[i].pivot.rotation.set(0, 0, pendulum.angle);
    }
}

function rotateLetters() {
    for (let i = 0; i < globals.letters.length; i++) {
        let string = globals.letters[i].string;
        if (string == null) continue;
        if (globals.letters[i].rotation.started) {
            let progress = globals.letters[i].rotation.currentRotation;
            let total = globals.letters[i].rotation.numRotations * Math.PI * 2;
            let remain =  total - progress;
            let rate = globals.letters[i].rotation.rate * remain/total;
            if (rate < 0.05) rate = 0.05;
            string.rotateY(rate);
            globals.letters[i].rotation.currentRotation = globals.letters[i].rotation.currentRotation + rate;
            // globals.letters[i].rotation.rate = rate;
            if (globals.letters[i].rotation.currentRotation > Math.PI * 2 * globals.letters[i].rotation.numRotations ) {
                string.rotation.set(0, 0, 0);
                globals.letters[i].rotation.currentRotation = 0;
                globals.letters[i].rotation.started = false;
            }
        }

    }
}

function animateEntranceExit() {
    for (let i = globals.letters.length-1; i >=0; i--) {
        let letter = globals.letters[i];
        let pickingLetter = globals.pickingLetters[i];
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
                let hang = globals.letters.splice(i, 1).pop();
                let pickHang = globals.pickingLetters.splice(i, 1).pop();
                if (hang != null && pickHang != null) {
                    let oldPivot = hang.pivot;
                    globals.scene.remove(oldPivot);
                    globals.pickingScene.remove(pickHang.pivot);
                }
            }
        }
    }
}

export { createLetter, swingLetters, positionLetters, animateEntranceExit, rotateLetters };