import * as libEntities from "$lib/blueprints/entities";
import type {Entity, PowerEntity} from "$lib/blueprints/entities";
import type {EntityBox, Wire, Signal} from "$lib/blueprints/utils";
import * as utils from "$lib/blueprints/utils";
import {letters} from "$lib/blueprints/letters";

export function getLights(x: number, y: number): EntityBox {
  let entities: Entity[] = [];
  for(var i=0; i<=6; i++) {
    entities.push(
      libEntities.getLight(
        x, // x
        y + i, // y
        `signal-${i}`, // signal
      )
    );
  }

  // connect each to the next but not the last
  for(let i=0; i < entities.length - 1; i++) {
    entities[i].connections["1"].red.push({
      "entity_id": entities[i + 1].entity_number,
    });
    entities[i].connections["1"].green.push({
      "entity_id": entities[i + 1].entity_number,
    });
  }

  if (entities.length < 2) {
  	return utils.getEntityBox(entities);
  }

  // connect each to the prev but not the first
  for(let i=1; i < entities.length; i++) {
    entities[i].connections["1"].red.push({
      "entity_id": entities[i - 1].entity_number,
    });
    entities[i].connections["1"].green.push({
      "entity_id": entities[i - 1].entity_number,
    });
  }
  return utils.getEntityBox(entities);
}

// implementation of https://forums.factorio.com/viewtopic.php?f=193&t=71537
//
// note:
//	reset is at(0).1.red
//  input is at(1).1.green
//  output is at(1).2.green
//
export function MemoryCell(x: number, y: number): EntityBox {
	const firstDecider = libEntities.getDeciderCombinator(
		x,
		y,
		{
			comparator: "=",
			firstSignal: utils.internalSignal,
			constant: 0,
			outputSignal: "signal-everything",
			copyInputCount: true
		}
	);
	const secondDecider = libEntities.getDeciderCombinator(
		x, // x
		y + 1, // y
		{
			comparator: "≠",
			firstSignal: utils.internalSignal,
			constant: 0,
			outputSignal: "signal-everything",
			copyInputCount: true
		}
	);
	const arithComb = libEntities.getArithCombinator(
		x, // x
		y + 2, // y
		{
			operation: "*",
			firstSignal: utils.internalSignal,
			secondConst: -1,
			outputSignal: utils.internalSignal,
			direction: 6
		}
	);

	utils.connectEntities(firstDecider, firstDecider, "1", "green", "2");
	utils.connectEntities(secondDecider, firstDecider, "1", "red", "1");
	utils.connectEntities(secondDecider, firstDecider, "2", "green", "2");
	utils.connectEntities(arithComb, secondDecider, "1", "red", "1");
	utils.connectEntities(arithComb, secondDecider, "1", "green", "1");
	utils.connectEntities(arithComb, secondDecider, "2", "green", "2");

	return utils.getEntityBox([
		firstDecider,
		secondDecider,
		arithComb,
	]);
}

export function getLightTriangle(height:number, wire: Wire, inverted?: boolean): {
	entityBox: EntityBox
	signalConfig: string
} {
	const signalConfig = utils.getSignal();

	const lights: Entity[] = [
		libEntities.getLight(0, 0, signalConfig)
	];
	for(let y = 1; y < height; y++) {
		const row: Entity[] = [];
		for(let x = -y; x <= y; x++) {
			row.push(libEntities.getLight(x, y * (inverted ? -1 : 1), signalConfig));

			if (row.length > 1) {
				utils.connectEntities(row[row.length - 1], row[row.length - 2], "1", wire, "1");
			}
		}

		utils.connectEntities(row[row.length - 1], lights[lights.length - 1], "1", wire, "1");
		lights.push(...row);
	}

	return {
		entityBox: utils.getEntityBox(lights),
		signalConfig
	};
}

function blase(inputSignal: string, base: number): EntityBox {
	const entities: Entity[] = [];
	for(let x = 0; x < 2; x++) {
		for(let y = 0; y < 2; y++) {
			entities.push(libEntities.getLight(x, y, utils.internalSignal));
		}
	}
	for(let i = 1; i < entities.length; i++) {
		utils.connectEntities(entities[i], entities[i - 1], "1", "red", "1");
	}
	entities.push(
		libEntities.getArithCombinator(
			1, /* x */
			2, /* y */
			{
				operation: "AND",
				firstSignal: inputSignal,
				outputSignal: utils.internalSignal,
				secondConst: Math.pow(2, base),
			})
	)
	utils.connectEntities(entities[entities.length - 1], entities[entities.length - 2], "2", "red", "1");
	return utils.getEntityBox(entities);
}

export function getBlaseballDiamond(baseCount: number, wire: Wire): {
	entityBox: EntityBox
	signalConfig: string
	substation: PowerEntity
} {
	if (baseCount < 1 || baseCount > 8) {
		throw Error("I'm sorry blaseball has gotten too weird and cant render that blaseball diamond.");
	}
	const signalConfig = utils.getSignal();

	const substation = libEntities.getSubstation(1, 1);

	const entities: Entity[] = [
		substation,
		...blase(signalConfig, 1).render(0, 6)
	];

	switch(baseCount) {
	  case 2:
	    entities.push(...blase(signalConfig, 2).render(0, -7))
	    break;
	  case 3:
	    entities.push(...blase(signalConfig, 2).render(6, 0))
	    entities.push(...blase(signalConfig, 3).render(-6, 0))
	    break;
	  case 4: // the normal case
	    entities.push(...blase(signalConfig, 2).render(6, 0))
	    entities.push(...blase(signalConfig, 3).render(0, -7))
	    entities.push(...blase(signalConfig, 4).render(-6, 0))
	    break;
	  case 5:
	    entities.push(...blase(signalConfig, 2).render(6, 0))
	    entities.push(...blase(signalConfig, 3).render(0, -7))
	    entities.push(...blase(signalConfig, 4).render(-6, -7))
	    entities.push(...blase(signalConfig, 5).render(-6, 0))
	    break;
	  case 6:
	    entities.push(...blase(signalConfig, 2).render(6, 0))
	    entities.push(...blase(signalConfig, 3).render(6, -7))
	    entities.push(...blase(signalConfig, 4).render(0, -7))
	    entities.push(...blase(signalConfig, 5).render(-6, -7))
	    entities.push(...blase(signalConfig, 6).render(-6, 0))
	    break;
	  case 7:
	    entities.push(...blase(signalConfig, 2).render(6, 6))
	    entities.push(...blase(signalConfig, 3).render(6, 0))
	    entities.push(...blase(signalConfig, 4).render(6, -7))
	    entities.push(...blase(signalConfig, 5).render(0, -7))
	    entities.push(...blase(signalConfig, 6).render(-6, -7))
	    entities.push(...blase(signalConfig, 7).render(-6, 0))
	    break;
	  case 8:
	    entities.push(...blase(signalConfig, 2).render(6, 6))
	    entities.push(...blase(signalConfig, 3).render(6, 0))
	    entities.push(...blase(signalConfig, 4).render(6, -7))
	    entities.push(...blase(signalConfig, 5).render(0, -7))
	    entities.push(...blase(signalConfig, 6).render(-6, -7))
	    entities.push(...blase(signalConfig, 7).render(-6, 0))
	    entities.push(...blase(signalConfig, 8).render(-6, 6))
	    break;
	}

	entities
		.filter(e => e.name === "arithmetic-combinator")
		.forEach(e => utils.connectEntities(e, substation, "1", wire, "1"));

	return {
		entityBox: utils.getEntityBox(entities),
		signalConfig,
		substation,
	};
}

export function getCountDisplay(maxBalls: number, maxStrikes: number, maxOuts: number /* hello crowvertime */): {
	entityBox: EntityBox
	ballsSignalConfig: string
	strikesSignalConfig: string
	outsSignalConfig: string
	substation: PowerEntity
} {
	const ballsSignalConfig = utils.getSignal();
	const ballsBox = utils.getEntityBox(); // lol
	for(let i = 0; i < maxBalls; i++) { // < because we never need to indicate the max
		for(let x = 0; x < 2; x++) {
			for(let y = 0; y < 2; y++) {
				ballsBox.add(libEntities.getLight(3 * i + x, y, ballsSignalConfig, ">", i));
				if (ballsBox.size() > 1) {
					utils.connectEntities(
						ballsBox.at(ballsBox.size() - 1),
						ballsBox.at(ballsBox.size() - 2),
						"1", "red", "1"
					)
				}
			}
		}
	}

	const strikesSignalConfig = utils.getSignal();
	const strikesBox = utils.getEntityBox();
	for(let i = 0; i < maxStrikes; i++) {
		for(let x = 0; x < 2; x++) {
			for(let y = 0; y < 2; y++) {
				strikesBox.add(libEntities.getLight(3 * i + x, y, strikesSignalConfig, ">", i));
				if (strikesBox.size() > 1) {
					utils.connectEntities(
						strikesBox.at(strikesBox.size() - 1),
						strikesBox.at(strikesBox.size() - 2),
						"1", "red", "1"
					)
				}
			}
		}
	}

	const outsSignalConfig = utils.getSignal();
	const outsBox = utils.getEntityBox();
	for(let i = 0; i < maxOuts; i++) {
		for(let x = 0; x < 2; x++) {
			for(let y = 0; y < 2; y++) {
				outsBox.add(libEntities.getLight(3 * i + x, y, outsSignalConfig, ">", i));
				if (outsBox.size() > 1) {
					utils.connectEntities(
						outsBox.at(outsBox.size() - 1),
						outsBox.at(outsBox.size() - 2),
						"1", "red", "1"
					)
				}
			}
		}
	}

	const substations: PowerEntity[] = [];
	const width = Math.max(ballsBox.getWidth(), strikesBox.getWidth(), outsBox.getWidth());
	while(substations.length * 18 - 9 < width) {
		substations.push(
			libEntities.getSubstation(
				Math.min(substations.length * 18, width),
				-1),
		);
		if (substations.length > 1) {
			utils.connectMaybeNeighbors(substations[substations.length - 1], substations[substations.length - 2]);
		}
	}

	if (ballsBox.size()) {
		utils.connectEntities(
			ballsBox.at(0),
			substations[0],
			"1", "red", "1"
		)
	}

	if (strikesBox.size()) {
		utils.connectEntities(
			strikesBox.at(0),
			substations[0],
			"1", "red", "1"
		)
	}

	if (outsBox.size()) {
		utils.connectEntities(
			outsBox.at(0),
			substations[0],
			"1", "red", "1"
		)
	}

	return {
		entityBox: utils.getEntityBox([
			...substations,
			...ballsBox.render(),
			...strikesBox.render(0, 3),
			...outsBox.render(0, 6),
		]),
		ballsSignalConfig,
		strikesSignalConfig,
		outsSignalConfig,
		substation: substations[0],
	};
}

export function genStackedDisplayConsts(inputSignal: string, outputSignals: utils.Signal[][], outputWire?: Wire): {
	entityBox: EntityBox
	substation: PowerEntity
} {
	const entities: Entity[] = [];
	const substations: PowerEntity[] = [
		libEntities.getSubstation(0, 0)
	];

	for(let i = 0; i < outputSignals.length; i++) {
		const x = 2;
		const y = i + 2;
		const deciderComb = libEntities.getDeciderCombinator(
			x,
			y,
			{ /* config */
				comparator: "=",
				firstSignal: inputSignal,
				outputSignal: utils.internalSignal,
				constant: i + 1
			}
		);
		const arithComb = libEntities.getArithCombinator(
			x + 2,
			y,
			{ /* config */
				operation: "*",
				firstSignal: "signal-each",
				secondSignal: utils.internalSignal,
				outputSignal: "signal-each",
				direction: 6,
			}
		);
		const constComb = libEntities.getConstCombinator(
			x + 3,
			y,
			outputSignals[i],
		);

		utils.connectEntities(
			deciderComb,
			arithComb,
			"2", "red", "1"
		)
		utils.connectEntities(
			arithComb,
			constComb,
			"1", "red", "1"
		)

		if (i > 0) {
			utils.connectEntities(
				deciderComb,
				entities[entities.length - 3],
				"1", "red", "1"
			)
			utils.connectEntities(
				arithComb,
				entities[entities.length - 2],
				"2", (outputWire || "red"), "2"
			)

			if (i % 18 === 0) {
				substations.push(libEntities.getSubstation(0, i));
				utils.connectMaybeNeighbors(substations[substations.length - 1], substations[substations.length - 2]);
			}
		}

		if (outputSignals.length % 18 > 7) {
			substations.push(libEntities.getSubstation(0, outputSignals.length));
			utils.connectMaybeNeighbors(substations[substations.length - 1], substations[substations.length - 2]);
		}

		entities.push(deciderComb, arithComb, constComb);
	}

	if (outputSignals.length) {
		utils.connectEntities(
			entities[0],
			substations[0],
			"1", "red", "1"
		)
		utils.connectEntities(
			entities[1],
			substations[0],
			"2", (outputWire || "red"), "1"
		)
	}

	return {
		entityBox: utils.getEntityBox([
			...entities,
			...substations,
		]),
		substation: substations[0]
	};
}

function getIterator(indicatorValue: number, signals: Signal[][], chooserSignal: string, clockSignal: string, nextSignal: string, doneSignal: string): {
	entityBox: EntityBox,
	powerPoles: PowerEntity[]
} {
	const entities: Entity[] = [];
	const poles: PowerEntity[] = [];

	const indicatorMatches = libEntities.getDeciderCombinator(
		0,
		0,
		{
			comparator: "=",
			firstSignal: chooserSignal,
			constant: indicatorValue,
			outputSignal: utils.internalSignal,
		});
	const pulser = libEntities.getArithCombinator(
		0,
		1,
		{
			operation: "*",
			firstSignal: clockSignal,
			secondSignal: nextSignal,
			outputSignal: nextSignal,
		});
	const combined = libEntities.getArithCombinator(
		2,
		0,
		{
			operation: "*",
			firstSignal: utils.internalSignal,
			secondSignal: nextSignal,
			outputSignal: utils.internalSignal,
		});
	const leakyOut = libEntities.getArithCombinator(
		0,
		2,
		{
			operation: "*",
			firstSignal: utils.internalSignal,
			secondConst: 1,
			outputSignal: utils.leakySignal,
			direction: 6
		})
	const outDiode = libEntities.getArithCombinator(
		0,
		3,
		{
			operation: "*",
			firstSignal: "signal-each",
			secondSignal: utils.leakySignal,
			outputSignal: "signal-each",
			direction: 6
		})


	const convertDot = libEntities.getDeciderCombinator(
		2,
		1,
		{
			comparator: "≠",
			firstSignal: utils.internalSignal,
			constant: 0,
			outputSignal: "signal-dot",
		});
	const reset = libEntities.getDeciderCombinator(
		2,
		2,
		{
			comparator: "≠",
			firstSignal: utils.internalSignal,
			constant: 0,
			outputSignal: utils.internalSignal,
		});

	const dotLoop = libEntities.getDeciderCombinator(
		4,
		1,
		{
			comparator: "<",
			firstSignal: "signal-dot",
			secondSignal: utils.internalSignal,
			outputSignal: "signal-dot",
			copyInputCount: true
		});
	const resetMod = libEntities.getArithCombinator(
		4,
		2,
		{
			operation: "*",
			firstSignal: utils.internalSignal,
			secondConst: signals.length + 1,
			outputSignal: utils.internalSignal,
		});
	const doneIndicator = libEntities.getDeciderCombinator(
		2,
		3,
		{
			comparator: "=",
			direction: 6,
			firstSignal: "signal-dot",
			constant: signals.length,
			outputSignal: doneSignal,
		});
	const pole = libEntities.getSubstation(-2, 4);
	const light = libEntities.getLight(3, 3, utils.internalSignal, "≠", 0);

	utils.connectEntities(
		pole,
		indicatorMatches,
		"1", "red", "1"
	);
	utils.connectEntities(
		indicatorMatches,
		pulser,
		"1", "red", "1"
	);
	utils.connectEntities(
		indicatorMatches,
		pulser,
		"2", "red", "2"
	);

	utils.connectEntities(
		indicatorMatches,
		combined,
		"2", "red", "1"
	);

	utils.connectEntities(
		combined,
		convertDot,
		"2", "red", "1"
	);
	utils.connectEntities(
		pulser,
		light,
		"2", "red", "1"
	);
	utils.connectEntities(
		indicatorMatches,
		reset,
		"2", "green", "1"
	);
	utils.connectEntities(
		reset,
		resetMod,
		"2", "red", "1"
	);
	utils.connectEntities(
		convertDot,
		dotLoop,
		"2", "red", "1"
	);
	utils.connectEntities(
		dotLoop,
		dotLoop,
		"2", "red", "1"
	);
	utils.connectEntities(
		resetMod,
		dotLoop,
		"2", "green", "1"
	);
	utils.connectEntities(
		dotLoop,
		doneIndicator,
		"2", "red", "1"
	);

	utils.connectEntities(
		doneIndicator,
		outDiode,
		"2", "green", "1"
	);
	utils.connectEntities(
		indicatorMatches,
		leakyOut,
		"2", "green", "1"
	);
	utils.connectEntities(
		leakyOut,
		outDiode,
		"2", "green", "1"
	);
	utils.connectEntities(
		outDiode,
		pole,
		"2", "red", "1"
	);


	poles.push(pole);
	const iterationEntities: Entity[] = [];
	for(let i = 0; i < signals.length; i ++) {
		iterationEntities.push(
			libEntities.getDeciderCombinator(
				2,
				4 + i,
				{
					comparator: "=",
					direction: 6,
					firstSignal: "signal-dot",
					outputSignal: "signal-everything",
					constant: i,
					copyInputCount: true
				}
			),
			libEntities.getConstCombinator(
				3,
				4 + i,
				signals[i]
			),
		);
		utils.connectEntities(
			iterationEntities[iterationEntities.length - 1],
			iterationEntities[iterationEntities.length - 2],
			"1", "green", "1"
		);

		if(i > 0) {
			utils.connectEntities(
				iterationEntities[iterationEntities.length - 2],
				iterationEntities[iterationEntities.length - 4],
				"1", "red", "1"
			);
			utils.connectEntities(
				iterationEntities[iterationEntities.length - 2],
				iterationEntities[iterationEntities.length - 4],
				"2", "green", "2"
			);

			if(i % 9 === 0) {
				poles.push(libEntities.getSubstation(-2, 4 + i));
				utils.connectEntities(
					poles[poles.length - 1],
					poles[poles.length - 2],
					"1", "red", "1"
				);
				utils.connectEntities(
					poles[poles.length - 1],
					poles[poles.length - 2],
					"1", "green", "1"
				);
				utils.connectMaybeNeighbors(poles[poles.length - 1], poles[poles.length - 2]);
			}
		}
	}
	utils.connectEntities(
		iterationEntities[0],
		doneIndicator,
		"1", "red", "1"
	);
	utils.connectEntities(
		iterationEntities[0],
		doneIndicator,
		"2", "green", "2"
	);

	poles.reverse(); // change the list from top down to bottom up so end connection works
	return {
		entityBox: utils.getEntityBox([
			combined,
			leakyOut,
			indicatorMatches,
			pulser,
			convertDot,
			reset,
			dotLoop,
			resetMod,
			doneIndicator,
			outDiode,
			light,
			...iterationEntities,
			...poles,
		]),
		powerPoles: poles,
	};
}

function letterConstCombinatorSignals(letterBits: number[]): Signal[] {
	return letterBits.map((b, idx) => ({name: `signal-${idx}`, value: b}));
}

export function getBannerLetters(chooserSignal: string, clockSignal: string, nextSignal: string, doneSignal: string): {
	entityBox: EntityBox,
	powerPole: PowerEntity
} {
	const iteratorElements: Signal[][][] = Object.keys(letters)
		.map(l => letters[l].map(letterConstCombinatorSignals));

	return getIteratorEntities(iteratorElements, chooserSignal, clockSignal, nextSignal, doneSignal);
};

export function getUpdateWords(words: string[], letterSignalConfig: string, chooserSignal: string, clockSignal: string, nextSignal: string, doneSignal: string): {
	entityBox: EntityBox,
	powerPole: PowerEntity
} {
	return getIteratorEntities(words.map(
		w => w.split("").map(
			l => {
				const i = Object.keys(letters).indexOf(l.toUpperCase());
				return [{
					name: letterSignalConfig,
					value: (i === -1 ? Object.keys(letters).indexOf("UNKNOWN") : i) + 1
				}];
			})),
		chooserSignal,
		clockSignal,
		nextSignal,
		doneSignal
	);
};

export function getUpdateWordSequences(wordSequences: number[][], wordSignalConfig: string, chooserSignal: string, clockSignal: string, nextSignal: string, doneSignal: string): {
	entityBox: EntityBox,
	powerPole: PowerEntity
} {
	return getIteratorEntities(wordSequences.map(
		wSeq => wSeq.map(
			idx => [{
					name: wordSignalConfig,
					value: idx + 1,
				}])),
		chooserSignal,
		clockSignal,
		nextSignal,
		doneSignal
	);
};

export function getIteratorEntities(iteratorElements: Signal[][][], chooserSignal: string, clockSignal: string, nextSignal: string, doneSignal: string): {
	entityBox: EntityBox,
	powerPole: PowerEntity
} {
	const powerPoles: PowerEntity[] = [];
	const {
		entityBox,
		powerPoles: iteratorPoles,
	} = getIterator(
		1,
		iteratorElements[0],
		chooserSignal,
		clockSignal,
		nextSignal,
		doneSignal,
	);
	entityBox.normalize(2);
	powerPoles.push(...iteratorPoles);

	let yOffset = -entityBox.getHeight() - 1;
	let xOffset = 0;
	let cols = 0;
	let roboportHeightOffset = 0;
	const colSize = Math.floor(Math.sqrt(iteratorElements.length));
	for(let i = 1; i < iteratorElements.length; i++) {
		const iterator = getIterator(
			i + 1,
			iteratorElements[i],
			chooserSignal,
			clockSignal,
			nextSignal,
			doneSignal,
		);

		if ((roboportHeightOffset === 0 || roboportHeightOffset > 30) && cols % 4 === 0) {
			iterator.entityBox.add(
				libEntities.getRoboport(-1, 7)
			);
			roboportHeightOffset = 0;
		}
		iterator.entityBox.normalize(2);
		iterator.entityBox.render(xOffset, yOffset).forEach(entityBox.add);
		utils.Offset(iterator.powerPoles, xOffset, yOffset);
	  powerPoles.push(...iterator.powerPoles);
		yOffset -= iterator.entityBox.getHeight();
		roboportHeightOffset += iterator.entityBox.getHeight();
		if (i % colSize === colSize - 1) {
			cols++;
			yOffset = 0;
			xOffset += iterator.entityBox.getWidth();
			roboportHeightOffset = 0;
		}
	}

	let prevZeroOffsetPole = powerPoles[0];
	let prevZeroOffsetPoleX = prevZeroOffsetPole.position.x;
	for(let i = 1; i < powerPoles.length; i++) {
		if(powerPoles[i].position.x !== prevZeroOffsetPoleX) {
			utils.connectEntities(
				powerPoles[i],
				prevZeroOffsetPole,
				"1", "red", "1"
			);
			utils.connectEntities(
				powerPoles[i],
				prevZeroOffsetPole,
				"1", "green", "1"
			);
			utils.connectMaybeNeighbors(powerPoles[i], prevZeroOffsetPole);
			prevZeroOffsetPole = powerPoles[i];
		  prevZeroOffsetPoleX = prevZeroOffsetPole.position.x;
			continue;
		}
		utils.connectEntities(
			powerPoles[i],
			powerPoles[i - 1],
			"1", "red", "1"
		);
		utils.connectEntities(
			powerPoles[i],
			powerPoles[i - 1],
			"1", "green", "1"
		);
		utils.connectMaybeNeighbors(powerPoles[i], powerPoles[i - 1]);
	}

	return {
		entityBox,
		powerPole: powerPoles[0]
	};
}
