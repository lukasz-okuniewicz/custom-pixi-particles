export default class Model {
    /**
     * Boolean value indicating whether warping is enabled
     */
    warp: boolean = false

    /**
     * The Z position of the camera
     */
    cameraZ: number = 0

    /**
     * The conversion rate for cameraZ
     */
    cameraZConverter: number = 0

    /**
     * The speed of warp
     */
    warpSpeed: number = 0

    /**
     * The base speed of warp
     */
    warpBaseSpeed: number = 0

    /**
     * Update the model with the behaviour object
     * @param {Object} behaviour - The behaviour object
     */
    update(behaviour: any) {
        this.warp = behaviour.warp || false;
        this.cameraZConverter = behaviour.cameraZConverter;
        this.warpSpeed = behaviour.warpSpeed;
        this.warpBaseSpeed = behaviour.warpBaseSpeed;
    }

    /**
     * Update the camera position based on the delta time
     * @param {number} deltaTime - The delta time
     */
    updateCamera(deltaTime: number) {
        if (!this.warp) return;
        this.cameraZ += deltaTime * this.cameraZConverter * this.warpSpeed * this.warpBaseSpeed
    }
}
