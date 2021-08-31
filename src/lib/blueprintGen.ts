import {stringStaticDisplayLen} from "$lib/flactorioUtils";
import type {ParsedDataStruct} from "$lib/sibr";
import * as libDisplays from "$lib/blueprints/displays";
import type {EntityBox, Wire} from "$lib/blueprints/utils";
import * as utils from "$lib/blueprints/utils";
import type {Entity, PowerEntity} from "$lib/blueprints/entities";
import * as libEntities from "$lib/blueprints/entities";
import {genGameEvents} from "$lib/blueprints/gameevents";
import type {SignalConfig} from "$lib/blueprints/gameevents";

function envelope(entities: Entity[]): any {
  return {
    "blueprint": {
      "icons": [
        {
          "signal": {
            "type": "item",
            "name": "arithmetic-combinator"
          },
          "index": 1
        }
      ],
      "item": "blueprint",
      "version": 281479274102784,
      entities
    }
  };
};

function borderSubstations(box: EntityBox, wire?: Wire): EntityBox {
	box.normalize();
	const substations: PowerEntity[] = [
		libEntities.getSubstation(-2, -1),
		libEntities.getSubstation(-2, box.getHeight() + 1),
	];
	utils.connectNeighbors(substations[substations.length - 1], substations[substations.length - 2]);
	if (wire) {
		utils.connectEntities(
			substations[substations.length - 1],
			substations[substations.length - 2],
			"1", wire, "1");
	}

	while(substations.length/2 * 18 - 10 < box.getWidth() || substations.length <= 2) {
		substations.push(
			libEntities.getSubstation(
				Math.min(substations.length * 18 - 2, box.getWidth()),
				-1),
			libEntities.getSubstation(
				Math.min(substations.length * 18 - 2, box.getWidth()),
				box.getHeight() + 1),
		);

		utils.connectNeighbors(substations[substations.length - 1], substations[substations.length - 3]);
		utils.connectNeighbors(substations[substations.length - 2], substations[substations.length - 4]);
		if (wire) {
			utils.connectEntities(
				substations[substations.length - 1],
				substations[substations.length - 3],
				"1", wire, "1");
			utils.connectEntities(
				substations[substations.length - 2],
				substations[substations.length - 4],
				"1", wire, "1");
		}
	}

	substations.forEach(box.add);
	return box;
}

function genStaticDisplay(length: number, under: boolean, rightAlign: boolean): EntityBox {
	const lengthLights = 2 * Math.ceil(length / 2) // must be an even number

	let staticDisplayBox = libDisplays.getLights(0 /* x */, 0 /* y */);

	for(let i = 1; i < lengthLights; i++) {
		const nextLights = libDisplays.getLights((rightAlign ? -1 : 1) * i /* x */, 0 /* y */);
		// connect first to top of previous row
		utils.connectEntities(nextLights.at(0), staticDisplayBox.at(staticDisplayBox.size()-7), "1", "green", "1");
		nextLights.render().map(staticDisplayBox.add);
	}

	staticDisplayBox.normalize((rightAlign ? -1 : 1));

	const combs: Entity[] = [];
	for(let i = 0; i < lengthLights; i++) {
		combs.push(
			libEntities.getArithCombinator(
				(rightAlign ? -1 : 1) * i /* x */,
				-1 + -(i % 2) + (under ? staticDisplayBox.getHeight() + 2: 0) /* y */,
				{ /* config */
					operation: "AND",
					firstSignal: "signal-each",
					secondConst: Math.pow(2, (i % utils.displayMaxWidth)),
					outputSignal: "signal-each",
				}
			)
		);
		utils.connectEntities(combs[combs.length - 1], staticDisplayBox.at(i * 7), "2", "red", "1");
		if (combs.length > 1 && i % utils.displayMaxWidth !== 0) {
			utils.connectEntities(combs[combs.length - 1], combs[combs.length - 2], "1", "red", "1");
		}
	}
	combs.forEach(staticDisplayBox.add);
	return staticDisplayBox;
}

function genMultiStaticDisplay(displayValues: string[], under: boolean, rightAlign: boolean): {
	entityBox: EntityBox
	signalConfig: string
} {
	const signalConfig = utils.getSignal();

	let maxLength = 0;
	displayValues.forEach( n => {
		const displayLen = stringStaticDisplayLen(n)
		if (displayLen > maxLength) {
			maxLength = displayLen;
		}
	})

	const lengthLights = 2 * Math.ceil(maxLength / 2) + 2 // must be an even number
	const staticDisplayBox = genStaticDisplay(lengthLights, under,rightAlign);

	// normalize down so we can add more on top
	staticDisplayBox.normalize((rightAlign ? -1 : 1)); // right aligned

	let placedSubstationsIdx = -1;
	const staticDisplayValueUnits: Entity[][][] = [];
	const substations: PowerEntity[] = [];
	for(let i = 0; i < displayValues.length; i++) {
		const signals = (
			rightAlign ?
			utils.staticDisplayTextGenRightAligned :
			utils.staticDisplayTextGenLeftAligned
		)(displayValues[i]);

		const row: Entity[][] = [];
		for(let j = 0; j < signals.length; j++) {
			const x = (rightAlign ? -1 : 1) * utils.displayMaxWidth * j - (rightAlign ? 6 : 0);
			const y = (under ? 1 : -1) * i - 1 + (under ? staticDisplayBox.getHeight() + 1 : 0);
			const deciderComb = libEntities.getDeciderCombinator(
				x,
				y,
				{ /* config */
					comparator: "=",
					firstSignal: signalConfig,
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
				x + 4,
				y,
				signals[j],
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

			let foundEarlierRow = false;
			if (staticDisplayValueUnits.length > 0) {
				// try to find the next one to connect to, skipping rows if necessary
				for(let k = staticDisplayValueUnits.length - 1; k >= 0; k--) {
					if (staticDisplayValueUnits[k].length > row.length) {
						utils.connectEntities(
							deciderComb,
							staticDisplayValueUnits[k][row.length][0],
							"1", "red", "1"
						);
						utils.connectEntities(
							arithComb,
							staticDisplayValueUnits[k][row.length][1],
							"2", "red", "2"
						);
						foundEarlierRow = true;
						break;
					}
				}
			}
			if (!foundEarlierRow) {
				utils.connectEntities(
					arithComb,
					staticDisplayBox.at(staticDisplayBox.size() - lengthLights + j*utils.displayMaxWidth),
					"2", "red", "1"
				);
			}

			const set: Entity[] = [
				deciderComb,
				arithComb,
				constComb,
			];
			row.push(set);

			if (placedSubstationsIdx < j) {
				placedSubstationsIdx = j;

				substations.push(libEntities.getSubstation(x + (rightAlign ? -4 : 8), y + (under ? -i + 1: i)));
				substations.push(libEntities.getSubstation(x + (rightAlign ? -21 : 24), y + (under ? -i + 1: i)));

				utils.connectNeighbors(substations[substations.length - 1], substations[substations.length - 2]);
				utils.connectEntities(
					substations[substations.length - 1],
					substations[substations.length - 2],
					"1", "red", "1"
				);
				utils.connectEntities(
					substations[substations.length - 2],
					deciderComb,
					"1", "red", "1"
				);

				substations.push(libEntities.getSubstation(x + (rightAlign ? -4 : 8), y + i * (under ? -1 : 1) + (staticDisplayBox.getHeight() + (under ? 1 : 2)) * (under ? -1 : 1)));
				substations.push(libEntities.getSubstation(x + (rightAlign ? -21 : 24), y + i * (under ? -1 : 1) + (staticDisplayBox.getHeight() + (under ? 1 : 2)) * (under ? -1 : 1)));
				utils.connectNeighbors(substations[substations.length - 1], substations[substations.length - 2]);

				if (substations.length === 4) {
					// connect across the divide with copper and red
					utils.connectNeighbors(substations[0], substations[2]);
					utils.connectEntities(
						substations[0],
						substations[2],
						"1", "red", "1"
					);
				}

				if (substations.length > 4) {
					utils.connectNeighbors(substations[substations.length - 2], substations[substations.length - 5]);
					utils.connectNeighbors(substations[substations.length - 4], substations[substations.length - 7]);
					utils.connectEntities(
						substations[substations.length - 4],
						substations[substations.length - 7],
						"1", "red", "1"
					);
				}
			}

			if (i > 1 && i % 10 === 0) {
				// so many values we need more power for the stacks
				substations.push(libEntities.getSubstation(x + (rightAlign ? -4 : 8), y));
				substations.push(libEntities.getSubstation(x + (rightAlign ? -21 : 24), y));

				// find the most recent with the same x displacement to connect to
				for (let k = substations.length - 2; k >= 0; k--) {
					if ((substations[k].position.x === substations[substations.length - 1].position.x) && (
						Math.abs(substations[k].position.y - substations[substations.length - 1].position.y) < 18
					)) {
						utils.connectNeighbors(
							substations[k],
							substations[substations.length - 1]
						);
						break;
					}
				}
				for (let k = substations.length - 3; k >= 0; k--) {
					if ((substations[k].position.x === substations[substations.length - 2].position.x) && (
						Math.abs(substations[k].position.y - substations[substations.length - 2].position.y) < 18
					)) {
						utils.connectNeighbors(
							substations[k],
							substations[substations.length - 2]
						);
						break;
					}
				}
			}
		}
		staticDisplayValueUnits.push(row);
	}

	staticDisplayValueUnits.forEach( row => row.forEach( set => set.forEach(staticDisplayBox.add)));
	substations.forEach(staticDisplayBox.add);
	return {
		entityBox: staticDisplayBox,
		signalConfig
	};
}

function genBanner(length: number): EntityBox {
	const box = utils.getEntityBox();
	const substations: PowerEntity[] = [];
	const substationSpacing = 16;

	for(let i = 0; i < length; i++) {
		const memoryCell = libDisplays.MemoryCell(-i, (i % 2) * -3).render();
		const lights = libDisplays.getLights(-i, 3).render();
		utils.connectEntities(
			lights[0],
			memoryCell[1],
			"1", "green", "2"
		);

		if(i > 0) {
			// connect resets
			utils.connectEntities(
				memoryCell[0],
				box.at(box.size() - (lights.length + memoryCell.length)),
				"1", "red", "1"
			)
			// connect previous output to input
			utils.connectEntities(
				memoryCell[1],
				box.at(box.size() - (lights.length + memoryCell.length) + 1),
				"1", "green", "2"
			)
			// connect lights to lights for color convenience
			utils.connectEntities(
				lights[0],
				box.at(box.size() - lights.length),
				"1", "red", "1"
			)
		}
		if(i % substationSpacing === 0) {
			substations.push(libEntities.getSubstation(-i, -4));
			substations.push(libEntities.getSubstation(-i, 11));
		}

		memoryCell.forEach(box.add);
		lights.forEach(box.add);
	}
	if(length % substationSpacing) {
		substations.push(libEntities.getSubstation(-length, -4));
		substations.push(libEntities.getSubstation(-length, 11));
	}

	utils.connectNeighbors(substations[0], substations[1]);
	utils.connectEntities(
		substations[0],
		substations[1],
		"1", "red", "1"
	);
	for(let i = 2; i < substations.length; i++) {
		utils.connectNeighbors(substations[i], substations[i-2]);
		utils.connectEntities(
			substations[i],
			substations[i - 2],
			"1", "red", "1"
		);
		utils.connectEntities(
			substations[i],
			substations[i - 2],
			"1", "green", "1"
		);
	}

	substations.forEach(box.add);
	return box;
}

function genAwayTeamStaticDisplay(names: string[]) {
	return genMultiStaticDisplay(names, false /* under */, true /* right aligned */);
}
function genHomeTeamStaticDisplay(names: string[]) {
	return genMultiStaticDisplay(names, true /* under */, true /* right aligned */);
}

function genPitcherStaticDisplay(names: string[]) {
	return genMultiStaticDisplay(names, false /* under */, false /* right aligned */);
}
function genBatterStaticDisplay(names: string[]) {
	return genMultiStaticDisplay(names, true /* under */, false /* right aligned */);
}

export function RenderIntoBlueprintJson(parsedData: ParsedDataStruct) {
	const {
		entityBox: awayDisplay,
		signalConfig: awaySignalConfig
	} = genAwayTeamStaticDisplay(parsedData.config.awayTeamNames);
	const {
		entityBox: homeDisplay,
		signalConfig: homeSignalConfig
	} = genHomeTeamStaticDisplay(parsedData.config.homeTeamNames);

	const awayDisplayCorners = awayDisplay.getCornerPower();
	const homeDisplayCorners = homeDisplay.getCornerPower();
	utils.connectMaybeNeighbors(awayDisplayCorners[1][1], homeDisplayCorners[0][1]);
	utils.connectEntities(
		awayDisplayCorners[1][1],
		homeDisplayCorners[0][1],
		"1", "red", "1"
	)

	awayDisplay.normalize(-2);
	homeDisplay.normalize(-1);

	let longestScoreDisplay = 0;
	for(let i = 0; i < parsedData.config.homeScores.length; i++) {
		const l = stringStaticDisplayLen(parsedData.config.homeScores[i]);
		if(l > longestScoreDisplay) {
			longestScoreDisplay = l;
		}
	}
	for(let i = 0; i < parsedData.config.awayScores.length; i++) {
		const l = stringStaticDisplayLen(parsedData.config.awayScores[i]);
		if(l > longestScoreDisplay) {
			longestScoreDisplay = l;
		}
	}

	const awayScoreDisplay = borderSubstations(genStaticDisplay(longestScoreDisplay, false, true));
	const homeScoreDisplay = borderSubstations(genStaticDisplay(longestScoreDisplay, true, true));

	const awayScoreDisplayCorners = awayScoreDisplay.getCornerPower();
	const homeScoreDisplayCorners = homeScoreDisplay.getCornerPower();
	utils.connectMaybeNeighbors(awayScoreDisplayCorners[1][0], homeScoreDisplayCorners[0][0]);

	// greens down the left to serve the away score display
	utils.connectEntities(
		awayScoreDisplayCorners[0][0],
		awayScoreDisplayCorners[1][0],
		"1", "green", "1"
	)
	utils.connectEntities(
		awayScoreDisplayCorners[1][0],
		homeScoreDisplayCorners[0][0],
		"1", "green", "1"
	)
	utils.connectEntities(
		homeScoreDisplayCorners[0][0],
		homeScoreDisplayCorners[1][0],
		"1", "green", "1"
	)

	// connect team name display power to team score power
	utils.connectMaybeNeighbors(homeDisplayCorners[1][1], homeScoreDisplayCorners[1][0]);
	utils.connectEntities(
		homeDisplayCorners[1][1],
		homeScoreDisplayCorners[1][0],
		"1", "red", "1"
	)

	utils.connectEntities(
		homeScoreDisplayCorners[1][0],
		homeScoreDisplayCorners[1][1],
		"1", "red", "1"
	)

	awayScoreDisplay.add(
		libEntities.getArithCombinator(
			1,
			-1,
			{
				operation: "*",
				firstSignal: "signal-each",
				outputSignal: "signal-each",
				secondConst: 1
			}));
	utils.connectEntities(
		awayScoreDisplayCorners[0][0],
		awayScoreDisplay.at(awayScoreDisplay.size() - 1),
		"1", "green", "1"
	)
	utils.connectEntities(
		awayScoreDisplay.at(awayScoreDisplay.size() - 1),
		awayScoreDisplay.at(awayScoreDisplay.size() - 6),
		"2", "red", "1"
	)
	awayScoreDisplay.normalize(2);
	homeScoreDisplay.normalize(-2);


	homeScoreDisplay.add(
		libEntities.getArithCombinator(
			-6,
			-3,
			{
				operation: "*",
				firstSignal: "signal-each",
				outputSignal: "signal-each",
				secondConst: 1
			}));
	utils.connectEntities(
		homeScoreDisplayCorners[1][1],
		homeScoreDisplay.at(homeScoreDisplay.size() - 1),
		"1", "green", "1"
	)
	utils.connectEntities(
		homeScoreDisplay.at(homeScoreDisplay.size() - 1),
		homeScoreDisplay.at(homeScoreDisplay.size() - 6),
		"2", "red", "1"
	)
	homeScoreDisplay.normalize(1);

	const awayScoreSignalConfig = utils.getSignal();
	const homeScoreSignalConfig = utils.getSignal();
	const {
		entityBox: awayScoreGeneratorBox,
		substation: awayScoreGeneratorSubstation
	} = libDisplays.genStackedDisplayConsts(
		awayScoreSignalConfig,
		parsedData.config.awayScores.map(s => utils.staticDisplayTextGenRightAligned(s)[0]),
		"green",
	);
	const {
		entityBox: homeScoreGeneratorBox,
		substation: homeScoreGeneratorSubstation
	} = libDisplays.genStackedDisplayConsts(
		homeScoreSignalConfig,
		parsedData.config.homeScores.map(s => utils.staticDisplayTextGenRightAligned(s)[0]),
		"green",
	);

	utils.connectMaybeNeighbors(awayScoreGeneratorSubstation, homeScoreDisplayCorners[1][0]);
	utils.connectEntities(
		awayScoreGeneratorSubstation,
		homeScoreDisplayCorners[1][0],
		"1", "red", "1"
	)
	utils.connectEntities(
		awayScoreGeneratorSubstation,
		homeScoreDisplayCorners[1][0],
		"1", "green", "1"
	)

	utils.connectMaybeNeighbors(homeScoreGeneratorSubstation, homeScoreDisplayCorners[1][1]);
	utils.connectEntities(
		homeScoreGeneratorSubstation,
		homeScoreDisplayCorners[1][1],
		"1", "red", "1"
	)
	utils.connectEntities(
		homeScoreGeneratorSubstation,
		homeScoreDisplayCorners[1][1],
		"1", "green", "1"
	)

	const scoreConsts = utils.getEntityBox([
		...awayScoreGeneratorBox.render(),
		...homeScoreGeneratorBox.render(8, 0),
	]);

	scoreConsts.normalize();

	const displayRobos: Entity[] = [];
	for(let i = 0; i * 35 < Math.max(awayDisplay.getWidth(), homeDisplay.getWidth()); i++) {
		displayRobos.push(libEntities.getRoboport(i * -35, 1));
	}
	const box = utils.getEntityBox([
		...awayDisplay.render(),
		...displayRobos,
		...homeDisplay.render(0, 5),
		...awayScoreDisplay.render(2, 0),
		...homeScoreDisplay.render(2, 5),
		...scoreConsts.render(2, 5 + homeScoreDisplay.getHeight() + 5)
	]);
	box.normalize(-1);


	let longestInningDisplay = 0;
	for(let i = 0; i < parsedData.config.innings.length; i++) {
		const l = stringStaticDisplayLen(parsedData.config.innings[i]);
		if(l > longestInningDisplay) {
			longestInningDisplay = l;
		}
	}
	const inningValueDisplay = borderSubstations(genStaticDisplay(longestInningDisplay + 1, false, true), "red" /* wire */);
	const inningDisplayCorners = inningValueDisplay.getCornerPower();

	inningValueDisplay.add(
		libEntities.getArithCombinator(
			1,
			-1,
			{
				operation: "*",
				firstSignal: "signal-each",
				outputSignal: "signal-each",
				secondConst: 1
			}));
	utils.connectEntities(
		inningDisplayCorners[0][0],
		inningValueDisplay.at(inningValueDisplay.size() - 1),
		"1", "green", "1"
	)
	utils.connectEntities(
		inningValueDisplay.at(inningValueDisplay.size() - 1),
		inningValueDisplay.at(inningValueDisplay.size() - 6),
		"2", "red", "1"
	)

	utils.connectMaybeNeighbors(homeScoreDisplayCorners[1][1], inningDisplayCorners[1][0]);
	utils.connectEntities(
		homeScoreDisplayCorners[1][1],
		inningDisplayCorners[1][0],
		"1", "red", "1"
	)
	utils.connectEntities(
		inningDisplayCorners[0][0],
		inningDisplayCorners[1][0],
		"1", "green", "1"
	)

	const {
		entityBox: inningTopIndicator,
		signalConfig: inningTopSignalConfig
	} = libDisplays.getLightTriangle(5, "red");
	const {
		entityBox: inningBottomIndicator,
		signalConfig: inningBottomSignalConfig
	} = libDisplays.getLightTriangle(5, "red", true /* inverted */);

	inningTopIndicator.normalize(2);
	inningBottomIndicator.normalize();
	inningValueDisplay.normalize();

	const inningTopIndicatorSubstation = libEntities.getSubstation(
		inningTopIndicator.getWidth()/2 + 1,
		0);
	utils.connectEntities(
		inningTopIndicatorSubstation,
		inningTopIndicator.at(inningTopIndicator.size() - 1),
		"1", "red", "1"
	)
	utils.connectEntities(
		inningTopIndicatorSubstation,
		inningDisplayCorners[0][0],
		"1", "red", "1"
	)
	utils.connectMaybeNeighbors(inningDisplayCorners[0][0], inningTopIndicatorSubstation);

	const inningBottomIndicatorSubstation = libEntities.getSubstation(
		inningBottomIndicator.getWidth()/2 + 1,
		inningValueDisplay.getHeight());
	utils.connectEntities(
		inningBottomIndicatorSubstation,
		inningBottomIndicator.at(inningBottomIndicator.size() - 1),
		"1", "red", "1"
	)
	utils.connectEntities(
		inningBottomIndicatorSubstation,
		inningDisplayCorners[1][0],
		"1", "red", "1"
	)
	utils.connectMaybeNeighbors(inningDisplayCorners[1][0], inningBottomIndicatorSubstation);

	const inningValueSignalConfig = utils.getSignal();
	const {
		entityBox: inningValueGeneratorBox,
		substation: inningValueSubstation
	} = libDisplays.genStackedDisplayConsts(
		inningValueSignalConfig,
		parsedData.config.innings.map(s => utils.staticDisplayTextGenRightAligned(s)[0]),
		"green",
	);

	utils.connectEntities(
		inningValueSubstation,
		inningDisplayCorners[1][0],
		"1", "green", "1"
	)
	utils.connectEntities(
		inningValueSubstation,
		inningDisplayCorners[1][0],
		"1", "red", "1"
	)
	utils.connectMaybeNeighbors(inningDisplayCorners[1][0], inningValueSubstation);


	const inningDisplay = utils.getEntityBox([
		...inningTopIndicator.render(
				utils.centerHorizontallyAgainst(inningTopIndicator, inningValueDisplay),
				-1),
		inningTopIndicatorSubstation,
		...inningValueDisplay.render(),
		...inningBottomIndicator.render(
				utils.centerHorizontallyAgainst(inningBottomIndicator, inningValueDisplay),
				inningValueDisplay.getHeight() + 1),
		inningBottomIndicatorSubstation,
		...inningValueGeneratorBox.render(0, inningBottomIndicator.getHeight() + 15)
	]);
	inningDisplay.normalize();

	inningDisplay.render(
		5, 2
	).forEach(box.add);

	const {
		entityBox: blaseballDiamond,
		signalConfig: blaseballDiamondSignalConfig,
		substation: blaseballDiamondSubstation,
	} = libDisplays.getBlaseballDiamond(parsedData.config.maxBases, "red");

	utils.connectMaybeNeighbors(inningDisplayCorners[1][1], blaseballDiamondSubstation);
	utils.connectEntities(
		blaseballDiamondSubstation,
		inningDisplayCorners[1][1],
		"1", "red", "1"
	)

	box.normalize(-1);
	blaseballDiamond.normalize(-1);

	const {
		entityBox: countBox,
		ballsSignalConfig,
		strikesSignalConfig,
		outsSignalConfig,
		substation: countSubstation
	} = libDisplays.getCountDisplay(
		parsedData.config.maxBalls,
		parsedData.config.maxStrikes,
		parsedData.config.maxOuts,
	);
	countBox.normalize();

	countBox.render(
		5, utils.centerVerticallyAgainst(countBox, blaseballDiamond)
	).forEach(blaseballDiamond.add);

	utils.connectMaybeNeighbors(countSubstation, blaseballDiamondSubstation);
	utils.connectEntities(
		blaseballDiamondSubstation,
		countSubstation,
		"1", "red", "1"
	)

	blaseballDiamond.normalize();


	const PSignals = utils.staticDisplayTextGenLeftAligned("P")[0];
	const Pdisplay = genStaticDisplay(5, false /* under */, false /* right-align */);
	Pdisplay.normalize();
	const PdisplayConst = libEntities.getConstCombinator(
		-1,
		-1,
		PSignals,
	);
	utils.connectEntities(
		PdisplayConst,
		Pdisplay.render().filter(e => e.name === "arithmetic-combinator" && e.position.x === 0)[0],
		"1", "red", "1"
	)
	Pdisplay.add(
		PdisplayConst
	);
	const PdisplaySubstation = libEntities.getSubstation(-2, 5);
	Pdisplay.add(
		PdisplaySubstation
	)
	utils.connectMaybeNeighbors(PdisplaySubstation, blaseballDiamondSubstation);
	Pdisplay.normalize(-2);

	const HSignals = utils.staticDisplayTextGenLeftAligned("B")[0];
	const Hdisplay = genStaticDisplay(5, true /* under */, false /* right-align */);
	Hdisplay.normalize(2);
	const HdisplayConst = libEntities.getConstCombinator(
		-1,
		1,
		HSignals,
	);
	utils.connectEntities(
		HdisplayConst,
		Hdisplay.render().filter(e => e.name === "arithmetic-combinator" && e.position.x === 0)[0],
		"1", "red", "1"
	)
	Hdisplay.add(
		HdisplayConst
	);
	const HdisplaySubstation = libEntities.getSubstation(-2, -5);
	Hdisplay.add(
		HdisplaySubstation
	)
	utils.connectMaybeNeighbors(HdisplaySubstation, blaseballDiamondSubstation);
	Hdisplay.normalize(-2);

	const {
		entityBox: batterNameBox,
		signalConfig: batterNameSignal
	} = genBatterStaticDisplay(parsedData.config.batterPlayerNames);
	batterNameBox.normalize(1);

	const batterBox = utils.getEntityBox([
		...Hdisplay.render(-1, 12),
		...batterNameBox.render()
	]);
	batterBox.normalize();

	const {
		entityBox: pitcherNameBox,
		signalConfig: pitcherNameSignal
	} = genPitcherStaticDisplay(parsedData.config.pitcherPlayerNames);
	pitcherNameBox.normalize(2);
	for(let i = 0; i * 35 < Math.max(pitcherNameBox.getWidth(), batterNameBox.getWidth()); i++) {
		pitcherNameBox.add(
			libEntities.getRoboport(i * 35, 1)
		);
	}

	const pitcherBox = utils.getEntityBox([
		...Pdisplay.render(-1, -3),
		...pitcherNameBox.render()
	]);

	const diamondCountPlayersBox = utils.getEntityBox([
		...pitcherBox.render(10, 0),
		...blaseballDiamond.render(),
		...batterBox.render(0, blaseballDiamond.getHeight() + 5),
	]);

	const batterNameBoxCorners = batterNameBox.getCornerPower();
	utils.connectMaybeNeighbors(batterNameBoxCorners[0][0], blaseballDiamondSubstation);
	utils.connectEntities(
		blaseballDiamondSubstation,
		batterNameBoxCorners[0][0],
		"1", "red", "1"
	)
	const pitcherNameBoxCorners = pitcherNameBox.getCornerPower();
	utils.connectMaybeNeighbors(pitcherNameBoxCorners[1][0], countSubstation);
	utils.connectEntities(
		countSubstation,
		pitcherNameBoxCorners[1][0],
		"1", "red", "1"
	)

	diamondCountPlayersBox.normalize();
	diamondCountPlayersBox.render(
		3,
		Math.round((box.getHeight() - scoreConsts.getHeight())/2) - (Math.round(blaseballDiamond.getHeight()/2) + pitcherNameBox.getHeight() - 5) + 1
	).forEach(box.add);

	// after we've rendered the horizontal pieces we can layer the banner on top
	box.normalize();
	const banner = genBanner(box.getWidth());
	const boxCorners = box.getCornerPower();
	const bannerCorners = banner.getCornerPower();

	banner.normalize(-2);

	const bannerTextConvert = libEntities.getArithCombinator(
		-1,
		-14,
		{
			operation: "*",
			firstSignal: "signal-each",
			secondConst: 1,
			outputSignal: "signal-each",
			direction: 6,
		}
	);
	const tickSignalConfig = utils.getSignal();
	const bannerTextSignalConvert = libEntities.getArithCombinator(
		-1,
		-15,
		{
			operation: "*",
			firstSignal: tickSignalConfig,
			secondConst: 1,
			outputSignal: utils.internalSignal,
			direction: 6,
		}
	);

	utils.connectEntities(
		bannerCorners[0][1],
		bannerTextConvert,
		"1", "red", "1"
	);
	utils.connectEntities(
		bannerTextConvert,
		banner.at(1),
		"2", "green", "1"
	);
	utils.connectEntities(
		bannerCorners[0][1],
		bannerTextSignalConvert,
		"1", "red", "1"
	);
	utils.connectEntities(
		bannerTextSignalConvert,
		banner.at(0),
		"2", "red", "1"
	);

	banner.add(bannerTextConvert);
	banner.add(bannerTextSignalConvert);

	banner.normalize();

	const letterSignalConfig = utils.getSignal();
	const letterDoneSignalConfig = utils.getSignal();
	const {
		entityBox: letterBox,
		powerPole: letterSubstation,
	} = libDisplays.getBannerLetters(
		letterSignalConfig,
		tickSignalConfig,
		tickSignalConfig,
		letterDoneSignalConfig
	);
	const letterBoxCorners = letterBox.getCornerPower();

	const wordSignalConfig = utils.getSignal();
	const wordDoneSignalConfig = utils.getSignal();
	const {
		entityBox: wordBox,
		powerPole: wordSubstation,
	} = libDisplays.getUpdateWords(
		parsedData.config.updateWords,
		letterSignalConfig,
		wordSignalConfig,
		tickSignalConfig,
		letterDoneSignalConfig,
		wordDoneSignalConfig,
	);
	const wordBoxCorners = wordBox.getCornerPower();

	utils.connectMaybeNeighbors(letterBoxCorners[1][1], wordSubstation);
	utils.connectEntities(
		letterBoxCorners[1][1],
		wordSubstation,
		"1", "red", "1"
	)
	utils.connectEntities(
		letterBoxCorners[1][1],
		wordSubstation,
		"1", "green", "1"
	)

	const wordSequenceSignalConfig = utils.getSignal();
	const wordSequenceDoneSignalConfig = utils.getSignal();
	const {
		entityBox: wordSequenceBox,
		powerPole: wordSequenceSubstation,
	} = libDisplays.getUpdateWordSequences(
		parsedData.config.updateWordSequences,
		wordSignalConfig,
		wordSequenceSignalConfig,
		tickSignalConfig,
		wordDoneSignalConfig,
		wordSequenceDoneSignalConfig,
	);

	utils.connectMaybeNeighbors(wordBoxCorners[1][1], wordSequenceSubstation);
	utils.connectEntities(
		wordBoxCorners[1][1],
		wordSequenceSubstation,
		"1", "red", "1"
	)
	utils.connectEntities(
		wordBoxCorners[1][1],
		wordSequenceSubstation,
		"1", "green", "1"
	)

	letterBox.normalize(-2);
	wordBox.normalize(2);
	wordBox.render().forEach(letterBox.add);
	letterBox.normalize(-2);
	wordSequenceBox.normalize(2);
	wordSequenceBox.render().forEach(letterBox.add);

	letterBox.normalize(2);
	letterBox.render(0, -5).forEach(banner.add);

	utils.connectMaybeNeighbors(bannerCorners[0][0], letterSubstation);
	utils.connectEntities(
		bannerCorners[0][0],
		letterSubstation,
		"1", "red", "1"
	)
	utils.connectEntities(
		bannerCorners[0][0],
		letterSubstation,
		"1", "green", "1"
	)

	banner.normalize(2);
	const renderedAwayCorner = box.getPowerEntity(awayDisplayCorners[0][0].entity_number);
	const maybePower = banner.getClosestPower(renderedAwayCorner.position.x, renderedAwayCorner.position.y);
	if (maybePower) {
		utils.connectMaybeNeighbors(maybePower, renderedAwayCorner);
		utils.connectEntities(
			maybePower,
			renderedAwayCorner,
			"1", "red", "1"
		)
	}
	banner.render(0, 0).forEach(box.add);


	const signalConfig: SignalConfig = {
		awaySignalConfig,
		homeSignalConfig,
		inningTopSignalConfig,
		inningBottomSignalConfig,
		blaseballDiamondSignalConfig,
		ballsSignalConfig,
		strikesSignalConfig,
		outsSignalConfig,
		pitcherNameSignal,
		batterNameSignal,
		awayScoreSignalConfig,
		homeScoreSignalConfig,
		inningValueSignalConfig,
		wordSequenceSignalConfig,
		wordSequenceDoneSignalConfig,
		tickSignalConfig
	};
	console.log(signalConfig);
	const {
		entityBox: gameEventConsts,
		eventSignalConfig,
		runtime
	} = genGameEvents(parsedData, signalConfig);
	const gameEventConstsCorners = gameEventConsts.getCornerPower();

	box.normalize(2);
	gameEventConsts.normalize(-1);

	utils.connectMaybeNeighbors(gameEventConstsCorners[0][1], homeDisplayCorners[1][0]);
	utils.connectEntities(
		gameEventConstsCorners[0][1],
		homeDisplayCorners[1][0],
		"1", "red", "1"
	)

	gameEventConsts.render(
		(awayDisplay.getWidth() - homeDisplay.getWidth() > 0 ? awayDisplay.getWidth() - homeDisplay.getWidth() : 0 ) - 6,
		- batterNameBox.getHeight() + 2
	).map(box.add);

	return {
		blueprintJson: envelope(box.render()),
		runtime
	};
}



				// let hometeamNameLen = stringStaticDisplayLen(homeTeamName);
				// if (hometeamNameLen > hometeamNameMax) {
				// 	hometeamNameMax = hometeamNameLen;
				// }
				// let awayteamNameLen = stringStaticDisplayLen(awayTeamName);
				// if (awayteamNameLen > awayteamNameMax) {
				// 	awayteamNameMax = awayteamNameLen;
				// }

				// let hometeamPlayerNameLen = stringStaticDisplayLen(homeBatterName);
				// if (hometeamPlayerNameLen > hometeamPlayerNameMax) {
				// 	hometeamPlayerNameMax = hometeamPlayerNameLen;
				// }
				// hometeamPlayerNameLen = stringStaticDisplayLen(homePitcherName);
				// if (hometeamPlayerNameLen > hometeamPlayerNameMax) {
				// 	hometeamPlayerNameMax = hometeamPlayerNameLen;
				// }
				// let awayteamPlayerNameLen = stringStaticDisplayLen(awayBatterName);
				// if (awayteamPlayerNameLen > awayteamPlayerNameMax) {
				// 	awayteamPlayerNameMax = awayteamPlayerNameLen;
				// }
				// awayteamPlayerNameLen = stringStaticDisplayLen(awayPitcherName);
				// if (awayteamPlayerNameLen > awayteamPlayerNameMax) {
				// 	awayteamPlayerNameMax = awayteamPlayerNameLen;
				// }
