export default class EmitControllerParser {
  private readonly _controller: any

  constructor(controller: any) {
    this._controller = controller
  }

  write = () => {
    const config = JSON.parse(JSON.stringify(this._controller))
    config.name = this._controller.getName()
    return config
  }

  read = (config: any) => {
    for (const key in config) {
      if (!(this._controller[key] instanceof Object)) {
        this._controller[key] = config[key]
      }
    }
  }
}
