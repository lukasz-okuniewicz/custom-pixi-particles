import TemperatureBehaviour from './TemperatureBehaviour'
import BehaviourNames from './BehaviourNames'

export default class TemperatureSimulationBehaviour extends TemperatureBehaviour {
  getName(): string {
    return BehaviourNames.TEMPERATURE_SIMULATION_BEHAVIOUR
  }
}
