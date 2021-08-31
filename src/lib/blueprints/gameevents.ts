import type {Entity, PowerEntity} from "$lib/blueprints/entities";
import type {EntityBox, Signal} from "$lib/blueprints/utils";
import {letters} from "$lib/blueprints/letters";
import * as utils from "$lib/blueprints/utils";
import type {Event, GameConfig} from "$lib/sibr";
import * as libEntities from "$lib/blueprints/entities";

export interface SignalConfig {
	awaySignalConfig: string
	homeSignalConfig: string
	inningTopSignalConfig: string
	inningBottomSignalConfig: string
	blaseballDiamondSignalConfig: string
	ballsSignalConfig: string
	strikesSignalConfig: string
	outsSignalConfig: string
	pitcherNameSignal: string
	batterNameSignal: string
	awayScoreSignalConfig: string
	homeScoreSignalConfig: string
	inningValueSignalConfig: string
	wordSequenceSignalConfig: string
	wordSequenceDoneSignalConfig: string
	tickSignalConfig: string
}

function getBaseballDiamondValue({basesOccupied, baseCount}, {maxBases}): number {
	// TODO figure this calc out for anything other than 5->4
	if (baseCount !== maxBases) {
		basesOccupied = basesOccupied.map(blase => (
			baseCount === 4 && maxBases === 5 && blase === 2 ? blase : blase + 1
		));
	}

	let v = 0;
	for (let i = 0; i < basesOccupied.length; i++) {
		v += Math.pow(2, basesOccupied[i] + 2);
	}
	return v;
}

function convertEventToSignals(event: Event, signalConfig: SignalConfig, config: GameConfig): Signal[] {
	// TODO all of these indexOfs could be pre-computed like updateWordSequenceIdx
	return [
		{
		  name: signalConfig.ballsSignalConfig,
		  value: event.balls
		},
		{
		  name: signalConfig.strikesSignalConfig,
		  value: event.strikes
		},
		{
		  name: signalConfig.outsSignalConfig,
		  value: event.outs
		},
		{
		  name: signalConfig.inningTopSignalConfig,
		  value: event.topOfInning ? 1 : 0
		},
		{
		  name: signalConfig.inningBottomSignalConfig,
		  value: event.topOfInning ? 0 : 1
		},
		{
		  name: signalConfig.blaseballDiamondSignalConfig,
		  value: getBaseballDiamondValue(event, config)
		},
		{
		  name: signalConfig.homeSignalConfig,
		  value: config.homeTeamNames.indexOf(event.homeTeamName) + 1
		},
		{
		  name: signalConfig.awaySignalConfig,
		  value: config.awayTeamNames.indexOf(event.awayTeamName) + 1
		},
		{
		  name: signalConfig.pitcherNameSignal,
		  value: config.pitcherPlayerNames.indexOf(event.pitcherPlayerName) + 1
		},
		{
		  name: signalConfig.batterNameSignal,
		  value: config.batterPlayerNames.indexOf(event.batterPlayerName) + 1
		},
		{
		  name: signalConfig.awayScoreSignalConfig,
		  value: config.awayScores.indexOf(event.awayScore) + 1
		},
		{
		  name: signalConfig.homeScoreSignalConfig,
		  value: config.homeScores.indexOf(event.homeScore) + 1
		},
		{
			name: signalConfig.inningValueSignalConfig,
			value: config.innings.indexOf(event.inning) + 1
		},
		{
			name: signalConfig.wordSequenceSignalConfig,
			value: event.updateWordSequenceIdx + 1
		}
	];
}

export function genGameEvents({gameEvents: events, config}, signalConfig: SignalConfig): {
	entityBox: EntityBox
	eventSignalConfig: string
	runtime: number
} {
	const entityColumns: Entity[][] = [];
	const eventSignalConfig = utils.getSignal();
	const substations: PowerEntity[] = [];
	const substationVerticalSeparation = 10;
	const roboports: Entity[] = [];
	const robopostVerticalSeparation = 60;
	const tickSpeed = 8;

	let runtime = 0;

	const colCount = Math.floor(Math.sqrt(events.length/3));
	const rowCount = Math.ceil(events.length / colCount);
	const internalSignal = utils.leakySignal;
	for(let i = 0; i < colCount; i++) {
		entityColumns[i] = [];
		for(let j = 0; j < rowCount; j++) {
			const x = i * 9;
			const y = j;

			if (i % 2 == 0 && j % substationVerticalSeparation === 0) {
				substations.push(
					libEntities.getSubstation(x + 6, y + 1)
				)
				if (substations.length > 1) {
					utils.connectMaybeNeighbors(substations[substations.length - 1], substations[substations.length - 2]);

					if (y === 0) {
						utils.connectMaybeNeighbors(substations[substations.length - 1], substations[substations.length - Math.ceil(rowCount / substationVerticalSeparation) - 1]);
						utils.connectEntities(
							substations[substations.length - 1],
							substations[substations.length - Math.ceil(rowCount / substationVerticalSeparation) - 1],
							"1", "red", "1"
						)
					}
				}
			}
			if (i % 4 == 1 && j % robopostVerticalSeparation === 0) {
				roboports.push(
					libEntities.getRoboport(x + 6, y + 1)
				)
			}

			const eventIdx = (entityColumns.length - 1) * rowCount + entityColumns[i].length / 3;
			if (eventIdx >= events.length) {
				break;
			}

			events[eventIdx].originalUpdateString.split("").forEach(l => {
				runtime += (letters[l] || letters["UNKNOWN"]).length
			});

			const deciderComb = libEntities.getDeciderCombinator(
				x,
				y,
				{ /* config */
					comparator: "=",
					firstSignal: eventSignalConfig,
					outputSignal: internalSignal,
					constant: eventIdx + 1
				}
			);
			const arithComb = libEntities.getArithCombinator(
				x + 2,
				y,
				{ /* config */
					operation: "*",
					firstSignal: "signal-each",
					secondSignal: internalSignal,
					outputSignal: "signal-each",
					direction: 6,
				}
			);
			const constComb = libEntities.getConstCombinator(
				x + 3,
				y,
				convertEventToSignals(events[eventIdx], signalConfig, config),
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

			if (entityColumns[i].length === 0) {
				utils.connectEntities(
					deciderComb,
					substations[substations.length + (i % 2 === 0 ? -1 : - Math.ceil(rowCount / substationVerticalSeparation))],
					"1", "red", "1"
				)
				utils.connectEntities(
					arithComb,
					substations[substations.length + (i % 2 === 0 ? -1 : - Math.ceil(rowCount / substationVerticalSeparation))],
					"2", "red", "1"
				)
			}
			if (entityColumns[i].length > 0) {
				utils.connectEntities(
					deciderComb,
					entityColumns[i][entityColumns[i].length - 3],
					"1", "red", "1"
				)
				utils.connectEntities(
					arithComb,
					entityColumns[i][entityColumns[i].length - 2],
					"2", "red", "2"
				)
			}

			entityColumns[i].push(
				deciderComb,
				arithComb,
				constComb,
			);
		}
	}

	const entityBox = utils.getEntityBox([
		...entityColumns.flat(),
		...roboports,
		...substations
	]);

	// create the clock to run the party
	entityBox.normalize();
	const xOffset = entityBox.getWidth() - 10;
	const yOffset = -4;
	const clockElements = [
		libEntities.getConstCombinator(
			xOffset + 0,
			yOffset,
			[{
				name: utils.internalSignal,
				value: 1,
			}]),
		libEntities.getDeciderCombinator(
			xOffset + 2,
			yOffset,
			{
				comparator: "<",
				firstSignal: utils.internalSignal,
				outputSignal: utils.internalSignal,
				copyInputCount: true,
				constant: tickSpeed
			}),
		libEntities.getDeciderCombinator(
			xOffset + 4,
			yOffset,
			{
				comparator: "=",
				firstSignal: utils.internalSignal,
				outputSignal: signalConfig.tickSignalConfig,
				constant: 2,
			}),
		libEntities.getArithCombinator(
			xOffset + 6,
			yOffset,
			{
				operation: "AND",
				firstSignal: signalConfig.tickSignalConfig,
				secondSignal: signalConfig.wordSequenceDoneSignalConfig,
				outputSignal: eventSignalConfig
			}),
		libEntities.getDeciderCombinator(
			xOffset + 8,
			yOffset,
			{
				comparator: "<",
				firstSignal: eventSignalConfig,
				outputSignal: eventSignalConfig,
				constant: events.length + 1,
				copyInputCount: true
			}),
		libEntities.getDeciderCombinator(
			xOffset + 6,
			yOffset - 2,
			{
				comparator: "=",
				direction: 6,
				firstSignal: eventSignalConfig,
				outputSignal: signalConfig.wordSequenceDoneSignalConfig,
				constant: 0
			})
	];
	utils.connectEntities(
		clockElements[0],
		clockElements[1],
		"1", "red", "1"
	);
	utils.connectEntities(
		clockElements[1],
		clockElements[1],
		"2", "red", "1"
	);
	utils.connectEntities(
		clockElements[1],
		clockElements[2],
		"2", "red", "1"
	);
	utils.connectEntities(
		clockElements[2],
		clockElements[3],
		"2", "red", "1"
	);
	utils.connectEntities(
		clockElements[3],
		clockElements[4],
		"2", "red", "1"
	);
	utils.connectEntities(
		clockElements[4],
		clockElements[4],
		"2", "red", "1"
	);
	utils.connectEntities(
		clockElements[4],
		clockElements[5],
		"2", "green", "1"
	);
	// utils.connectEntities(  // THE CONNECTION TO START
	// 	clockElements[5],
	// 	clockElements[3],
	// 	"2", "red", "1"
	// );

	const corners = entityBox.getCornerPower();
	utils.connectEntities(
		clockElements[2],
		clockElements[4],
		"2", "red", "2"
	);
	utils.connectEntities(
		clockElements[2],
		corners[0][1],
		"2", "red", "1"
	);

	clockElements.forEach(entityBox.add);

	return {
		entityBox,
		eventSignalConfig,
		runtime: runtime / ( 60 / tickSpeed)
	};
}
