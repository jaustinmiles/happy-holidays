import {createLetter} from "./text";
import {globals, visibleHeightAtZDepth, visibleWidthAtZDepth} from "./util";
import GPUPicker from "./GPUPicker";

function addEventListeners(picker: GPUPicker): boolean {
    const canvas = <HTMLCanvasElement>document.querySelector('#c');
    addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key == " ") {
            event.preventDefault();
        }
        const text = event.key;
        createLetter(globals.scene, globals.letters, text);
    });

    addEventListener("resize", () => {
        canvas.width = window.innerWidth * 0.8;
        canvas.height = window.innerHeight * 0.8;
        globals.aspect = canvas.width/canvas.height;
        globals.camera.aspect = globals.aspect;
        globals.camera.updateProjectionMatrix();
        globals.renderer.setSize(canvas.width, canvas.height);
        let visHeight = visibleHeightAtZDepth(-7) * 2;
        let visWidth = visibleWidthAtZDepth(-7) * 2;
        globals.background.scale.set(visWidth, visHeight, 1);
    });

    canvas.onmousemove = (event: MouseEvent) => {
        let rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        let xPercentage = x / canvas.width;
        let yPercentage = y / canvas.height;
        globals.background.position.set(xPercentage - 0.5, yPercentage - 0.5, -5);
    };
    canvas.onclick = (event: Event) => {
        let rect = canvas.getBoundingClientRect();
        globals.pickPosition.x = (<MouseEvent>event).clientX - rect.left;
        globals.pickPosition.y = (<MouseEvent>event).clientY - rect.top;
        picker.pick(globals.pickPosition, globals.pickingScene, globals.camera);
    };

    return true;
}

export default addEventListeners;