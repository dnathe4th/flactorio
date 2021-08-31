import {entityNumberGen} from "$lib/blueprints/utils";

export type EntityTypes = (
  "arithmetic-combinator" | "small-lamp" | "constant-combinator" | "big-electric-pole" |
  "substation"
);
export type Positionable = {
  position: {
    x: number,
    y: number
  }
};
type EntityConnectionType = {
  entity_id: number,
  circuit_id?: string
};
export interface Entity extends Positionable {
  entity_number: number,
  name: string,
  direction?: number,
  position: {
    x: number,
    y: number
  },
  connections?: {
    "1": {
      red: EntityConnectionType[],
      green: EntityConnectionType[]
    },
    "2"?: {
      red: EntityConnectionType[],
      green: EntityConnectionType[]
    }
  },
  control_behavior?: any,
};

export interface PowerEntity extends Entity {
  neighbours: number[]
}

function powerEntity(name: string): PowerEntity {
  return {
    "entity_number": entityNumberGen(),
    name,
    "position": {
      "x": 0,
      "y": 0
    },
    "connections": {
      "1": {
        red: [],
        green: []
      }
    },
    "neighbours": []
  };
}

export function getBigElectricPole(x: number, y: number): PowerEntity {
  return {
    ...powerEntity("big-electric-pole"),
    "position": {x, y},
  };
}

export function getMediumElectricPole(x: number, y: number): PowerEntity {
  return {
    ...powerEntity("medium-electric-pole"),
    "position": {x, y},
  };
}

export function getSubstation(x: number, y: number): PowerEntity {
  return {
    ...powerEntity("substation"),
    "position": {x, y},
  };
}

type Directions = 0 | 2 | 4 | 6;
type Operations = "AND" | "*";
interface ArthConditionsConfig {
  operation: Operations
  firstSignal: string
  outputSignal: string
  direction?: Directions

  // these two are mutually exclusive but I am too bad at typescript to encode that in the type system
  secondSignal?: string
  secondConst?: number
}

export function getArithCombinator(x: number, y: number, config: ArthConditionsConfig): Entity {
  const out: Entity = {
    "entity_number": entityNumberGen(),
    "name": "arithmetic-combinator",
    "position": {
      "x": x,
      "y": y
    },
    "direction": config.direction || 2,
    "control_behavior": {
      "arithmetic_conditions": {
        "first_signal": {
          "type": "virtual",
          "name": config.firstSignal
        },
        "operation": config.operation,
        "output_signal": {
          "type": "virtual",
          "name": config.outputSignal
        }
      }
    },
    "connections": {
      "1": {
        red: [],
        green: []
      },
      "2": {
        red: [],
        green: []
      }
    }
  };
  if (config.secondSignal !== undefined) {
    out.control_behavior.arithmetic_conditions.second_signal = {
      "type": "virtual",
      "name": config.secondSignal
    };
    return out
  }
  out.control_behavior.arithmetic_conditions.second_constant = config.secondConst;
  return out;
}

export function getLight(x: number, y: number, signal: string, comparator?: string, constant?: number): Entity {
  return {
    "entity_number": entityNumberGen(),
    "name": "small-lamp",
    "position": {
      "x": x,
      "y": y
    },
    "control_behavior": {
      "circuit_condition": {
        "first_signal": {
          "type": "virtual",
          "name": signal
        },
        "constant": constant || 0,
        "comparator": comparator || ">"
      },
      "use_colors": true
    },
    "connections": {
      "1": {
        "red": [],
        "green": []
      }
    }
  };
}

export function getConstCombinator(x: number, y: number, signals: {name: string, value: number}[]): Entity {
  return {
    "entity_number": entityNumberGen(),
    "name": "constant-combinator",
    "position": {
      "x": x,
      "y": y
    },
    "direction": 4,
    "control_behavior": {
      "filters": signals.map((s, idx) => (
        {
          "signal": {
            "type": "virtual",
            "name": s.name
          },
          "count": s.value,
          "index": idx+1
        }
      ))
    },
    "connections": {
      "1": {
        "red": [],
        "green": []
      }
    }
  };
}

type Comparator = "=" | "≠" | "<";
interface DeciderConditionsConfig {
  comparator: Comparator
  firstSignal: string
  outputSignal: string
  direction?: Directions
  copyInputCount?: boolean

  // these two are mutually exclusive but I am too bad at typescript to encode that in the type system
  secondSignal?: string
  constant?: number
}
export function getDeciderCombinator(x: number, y: number, config: DeciderConditionsConfig): Entity {
  const out: Entity = {
    "entity_number": entityNumberGen(),
    "name": "decider-combinator",
    "position": {
      "x": x,
      "y": y
    },
    "direction": config.direction || 2,
    "control_behavior": {
      "decider_conditions": {
        "first_signal": {
          "type": "virtual",
          "name": config.firstSignal
        },
        "comparator": config.comparator,
        "output_signal": {
          "type": "virtual",
          "name": config.outputSignal
        },
        "copy_count_from_input": config.copyInputCount || false
      }
    },
    "connections": {
      "1": {
        red: [],
        green: []
      },
      "2": {
        red: [],
        green: []
      }
    }
  };

  if (config.secondSignal !== undefined) {
    out.control_behavior.decider_conditions.second_signal = {
      "type": "virtual",
      name: config.secondSignal
    };
    return out;
  }
  out.control_behavior.decider_conditions.constant = config.constant;
  return out;
}

function entity(name: string, x: number, y: number): Entity {
  return {
    "entity_number": entityNumberGen(),
    name,
    "position":
    {x, y}
  };
};

export function getRadar(x: number, y: number): Entity {
  return entity("radar", x, y);
};

export function getRoboport(x: number, y: number): Entity {
  return entity("roboport", x, y);
};
