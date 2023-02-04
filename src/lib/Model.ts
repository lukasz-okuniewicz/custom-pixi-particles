export default class Model {
    warp: boolean = false
    cameraZ: number = 0
    cameraZConverter: number = 0
    warpSpeed: number = 0
    warpBaseSpeed: number = 0

    update(behaviour: any) {
        this.warp = behaviour.warp || false;
        this.cameraZConverter = behaviour.cameraZConverter;
        this.warpSpeed = behaviour.warpSpeed;
        this.warpBaseSpeed = behaviour.warpBaseSpeed;
    }

    updateCamera(deltaTime: number) {
        if (!this.warp) return;
        this.cameraZ += deltaTime * this.cameraZConverter * this.warpSpeed * this.warpBaseSpeed
    }
}
