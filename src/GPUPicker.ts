import * as THREE from "three";
import {HangingObject} from "./interfaces";
import {globals, idToObject} from "./util";

class GPUPickHelper {
    private readonly pickingTexture: THREE.WebGLRenderTarget;
    private readonly pixelBuffer: Uint8Array;
    private pickedObject: HangingObject | null;
    private pickedObjectSavedColor: number;
    private renderer: THREE.WebGLRenderer;

    constructor(renderer: THREE.WebGLRenderer) {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.pickedObjectSavedColor = 0;
        this.renderer = renderer
    }

    pick(cssPosition: THREE.Vector2, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        if (this.pickedObject) {
            if (this.pickedObject.object.material instanceof THREE.MeshPhongMaterial) {
                this.pickedObject.object.material.color.setHex(this.pickedObjectSavedColor);
                this.pickedObject = null;
            }
        }

        const pixelRatio = this.renderer.getPixelRatio();
        camera.setViewOffset(
            this.renderer.getContext().drawingBufferWidth,
            this.renderer.getContext().drawingBufferHeight,
            cssPosition.x * pixelRatio | 0,
            cssPosition.y * pixelRatio | 0,
            1,
            1
        );
        this.renderer.setRenderTarget(this.pickingTexture);
        this.renderer.render(scene, camera);
        this.renderer.setRenderTarget(null);

        camera.clearViewOffset();
        this.renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, 1, 1, this.pixelBuffer);

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

                const vec = new THREE.Vector3(); // create once and reuse
                const pos = new THREE.Vector3(); // create once and reuse
                let canvas = <HTMLCanvasElement>document.getElementById('c');
                vec.set(
                    ( globals.pickPosition.x / canvas.clientWidth ) * 2 - 1,
                    - ( globals.pickPosition.y / canvas.clientHeight ) * 2 + 1,
                    0.5 );
                vec.unproject( camera );
                vec.sub( camera.position ).normalize();
                const distance = (-2 - camera.position.z) / vec.z;
                pos.copy( camera.position ).add( vec.multiplyScalar( distance ) );
                let rate = Math.abs(pos.x - objectCenter) / (objectWidth) * 2;
                this.pickedObject.rotation.rate = rate * rate;
                this.pickedObject.rotation.numRotations = Math.ceil(rate * 4);

                const sound = new THREE.Audio(globals.listener);
                const audioLoader = new THREE.AudioLoader();
                audioLoader.load('audio/jingle_short.wav', (buffer: AudioBuffer) => {
                    sound.setBuffer(buffer);
                    sound.setLoop(false);
                    sound.setVolume(0.4);
                    sound.play();
                })
            }
        }
    }
}

export default GPUPickHelper;