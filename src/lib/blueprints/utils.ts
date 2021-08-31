import type {Entity, EntityTypes, PowerEntity, Positionable} from "$lib/blueprints/entities";
import {letters} from "$lib/blueprints/letters";

type Maybe<T> = T | null;

export function Offset(positionables: Positionable[], xOffset: number, yOffset: number): void {
  positionables.forEach(p => {
    p.position.x += xOffset;
    p.position.y += yOffset;
  });
}

function getEntityWidth(entity: Entity): number {
  return ({
    "arithmetic-combinator": (d: number) => (1 + ((d + 1) % 2)),
    "substation": () => 2,
    "roboport": () => 4,
  }[entity.name] || (() => 1))(entity.direction);
}

function getEntityHeight(entity: Entity): number {
  return ({
    "arithmetic-combinator": (d: number) => (1 + (d % 2)),
    "substation": () => 2,
    "roboport": () => 4,
  }[entity.name] || (() => 1))(entity.direction);
}

type NormalizeDirection = 2 | 1 | -1 | -2;  // 2  bottom left to zero zero
                                            // 1 (default) top left to zero zero
                                            // -1 top right to zero zero
                                            // -2 bottom right to zero zero
export interface EntityBox {
  getWidth(): number
  getHeight(): number
  at(idx: number): Entity
  size(): number
  add(entity: Entity | PowerEntity): void
  render(xOffset?: number, yOffset?: number): Entity[]
  normalize(direction?: NormalizeDirection): void
  getCornerPower(): Maybe<PowerEntity>[][] // (0, 0) top left, (0, 1) top right, (1, 1) bottom right
  getClosestPower(x: number, y: number): Maybe<PowerEntity>
  getPowerEntity(entityNumber: number): Maybe<PowerEntity>
};

export function getEntityBox(initEntities?: Entity[]): EntityBox {
  let width = 0;
  let height = 0;

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  let powerEntities: PowerEntity[] = [];
  let entities: Entity[] = [];
  if (initEntities) {
    initEntities.map(add);
  }

  return {
    getWidth,
    getHeight,
    render,
    add,
    at,
    size,
    normalize,
    getCornerPower,
    getClosestPower,
    getPowerEntity,
  };

  function getWidth() {
    return width;
  }
  function getHeight() {
    return height;
  }
  function render(xOffset?: number, yOffset?: number) {
    if (!xOffset && !yOffset) {
      // short circuit to save an O(n) iteration
      return entities;
    }
    return entities.map(e => ({
      ...e,
      position: {
        x: e.position.x + (xOffset || 0),
        y: e.position.y + (yOffset || 0)
      }
    }));
  }
  function at(idx: number): Entity {
    return entities[idx];
  }
  function size(): number {
    return entities.length
  }
  function add(entity: Entity | PowerEntity) {
    // i hope this math is right with the width/height calcs
    // me a week later: it wasnt
    entities.push(entity);

    if("neighbours" in entity) {
      powerEntities.push(entity);
    }

    if (entities.length === 1) {
      width = getEntityWidth(entity);
      height = getEntityHeight(entity);

      minX = entity.position.x;
      maxX = minX + width;
      minY = entity.position.y;
      maxY = minY + height;
    }

    if (entity.position.x < minX) {
      // width = width + (minX - entity.position.x);
      minX = entity.position.x;
    }
    if (entity.position.x + getEntityWidth(entity) > maxX) {
      // width = width + (entity.position.x + getEntityWidth(entity) - maxX);
      maxX = entity.position.x + getEntityWidth(entity);
    }
    if (entity.position.y < minY) {
      // height = height + (minY - entity.position.y);
      minY = entity.position.y;
    }
    if (entity.position.y + getEntityHeight(entity) > maxY) {
      // height = height + (entity.position.y + getEntityHeight(entity) - maxY);
      maxY = entity.position.y + getEntityHeight(entity);
    }

    height = maxY - minY;
    width = maxX - minX;
  }
  function normalize(direction?: NormalizeDirection): void {
    if (direction === -1) {
      Offset(entities, -maxX, -minY);
      minX += -maxX;
      maxX += -maxX;
      minY += -minY;
      maxY += -minY;
      return;
    }
    if (direction === -2) {
      Offset(entities, -maxX, -maxY);
      minX += -maxX;
      maxX += -maxX;
      minY += -maxY;
      maxY += -maxY;
      return;
    }
    if (direction === 2) {
      Offset(entities, -minX, -maxY);
      maxX += -minX;
      minX += -minX;
      minY += -maxY;
      maxY += -maxY;
      return;
    }
    // otherwise assume direction === 1
    Offset(entities, -minX, -minY);
    maxX += -minX;
    minX += -minX;
    maxY += -minY;
    minY += -minY;
  }

  function getCornerPower(): Maybe<PowerEntity>[][] {
    return [
      [
        getClosestPower(minX, minY), getClosestPower(maxX, minY)
      ],
      [
        getClosestPower(minX, maxY), getClosestPower(maxX, maxY)
      ],
     ];
  }

  function getClosestPower(x: number, y: number): Maybe<PowerEntity> {
    if (powerEntities.length === 0) {
      return null;
    }
    let closest = powerEntities[0];
    powerEntities.forEach(e => {
      if (
        Math.sqrt(Math.pow((e.position.x - x), 2) + Math.pow((e.position.y - y), 2)) <
        Math.sqrt(Math.pow((closest.position.x - x), 2) + Math.pow((closest.position.y - y), 2))
       ) {
        closest = e;
      }
    });
    return closest;
   }

  function getPowerEntity(entityNumber: number): Maybe<PowerEntity> {
    return powerEntities.filter(e => e.entity_number === entityNumber)[0];
  }
}

export const internalSignal = "signal-Z";
export const leakySignal = "signal-Y";
export const resetSignal = "signal-info";

export const entityNumberGen = function() {
  let idx = 1;
  return function(): number {
    return idx++;
  };
}();

export const getSignal = function() {
  // skip y, z because they are reserved
  let signals = Array.from(Array(24)).map((_, i) => `signal-${String.fromCharCode(i + 65)}`);
  if (signals.indexOf(internalSignal) !== -1) {
    throw Error("developer error, internal signal should not be available");
  }
  const resetSignals = [...signals];
  return function(reset?: boolean): string {
    if (reset) {
      signals = [...resetSignals];
      return "";
    }
    if (signals.length === 0) {
      console.error("ran out of reserve signals");
      throw Error("ran out of reserve signals");
    }
    const s = signals[0];
    signals.splice(0, 1);
    return s;
  }
}();

export type Wire = "red" | "green"
type Connection = "1" /* in */ | "2" /* out */
export function connectEntities(entityFrom: Maybe<Entity>, entityTo: Maybe<Entity>, connectionFrom: Connection, wire: Wire, connectionTo: Connection) {
  if (!entityFrom || !entityTo) {
    return;
  }

  entityFrom.connections[connectionFrom][wire].push({
    "entity_id": entityTo.entity_number,
    "circuit_id": connectionTo
  });

  entityTo.connections[connectionTo][wire].push({
    "entity_id": entityFrom.entity_number,
    "circuit_id": connectionFrom
  });
}

type Neighborly = {
  entity_number: number
  neighbours: number[]
};
export function connectNeighbors(nleft: Neighborly, nright: Neighborly) {
  nleft.neighbours.push(nright.entity_number);
  nright.neighbours.push(nleft.entity_number);
}
export function connectMaybeNeighbors(nleft: Maybe<Neighborly>, nright: Maybe<Neighborly>) {
  if (nleft === null || nright === null) {
    throw Error("failed to combine neighbors");
  }
  nleft.neighbours.push(nright.entity_number);
  nright.neighbours.push(nleft.entity_number);
}

export type Signal = {
  name: string,
  value: number
};

function genEmptySignals(): Signal[] {
  return [
    {
      name: "signal-0",
      value: 0
    },
    {
      name: "signal-1",
      value: 0
    },
    {
      name: "signal-2",
      value: 0
    },
    {
      name: "signal-3",
      value: 0
    },
    {
      name: "signal-4",
      value: 0
    },
    {
      name: "signal-5",
      value: 0
    },
    {
      name: "signal-6",
      value: 0
    },
  ];
}

export const displayMaxWidth = 30;

export function staticDisplayTextGenRightAligned(text: string): Signal[][] {
  const s = text.toUpperCase();

  let offset = 1;

  let signals: Signal[][] = [genEmptySignals()];
  for (let i = s.length - 1; i >= 0; i--) {
    let letterConfig = letters[s[i]] || letters["UNKNOWN"];
    for (let j = letterConfig.length - 1; j >= 0; j--) {
      for (let k=0; k<=6; k++) {
        signals[signals.length - 1][k].value += letterConfig[j][k] << (offset % displayMaxWidth);
      }

      offset++;
      if (offset % displayMaxWidth === 0) {
        signals.push(genEmptySignals());
      }
    }
    offset++;
    if (offset % displayMaxWidth === 0) {
      signals.push(genEmptySignals());
    }
  }

  return signals;
};

// not clever enough to figure out how to DRY this with above given the changes are loop conditions
export function staticDisplayTextGenLeftAligned(text: string): Signal[][] {
  const s = text.toUpperCase();

  let offset = 1;

  let signals: Signal[][] = [genEmptySignals()];
  for (let i = 0; i < s.length; i++) {
    let letterConfig = letters[s[i]] || letters["UNKNOWN"];
    for (let j = 0; j < letterConfig.length; j++) {
      for (let k=0; k<=6; k++) {
        signals[signals.length - 1][k].value += letterConfig[j][k] << (offset % displayMaxWidth);
      }

      offset++;
      if (offset % displayMaxWidth === 0) {
        signals.push(genEmptySignals());
      }
    }
    offset++;
    if (offset % displayMaxWidth === 0) {
      signals.push(genEmptySignals());
    }
  }

  return signals;
}

export function centerVerticallyAgainst(box: EntityBox, reference: EntityBox): number {
  return Math.round(reference.getHeight()/2) - Math.round(box.getHeight()/2);
}

export function centerHorizontallyAgainst(box: EntityBox, reference: EntityBox): number {
  return Math.round(reference.getWidth()/2) - Math.round(box.getWidth()/2);
}
