export interface Event {
	balls: number
	strikes: number
	outs: number
	topOfInning: boolean // else bottom
	homeTeamName: string
	awayTeamName: string
	batterPlayerName: string
	pitcherPlayerName: string
	homeScore: string
	awayScore: string
	inning: string
	basesOccupied: number[] // zero indexed
	baseCount: number
	updateWordSequenceIdx: number
	originalUpdateString: string
}

export interface GameConfig {
	homeTeamNames: string[],
	awayTeamNames: string[],
	batterPlayerNames: string[],
	pitcherPlayerNames: string[],

	maxBalls: number,
	maxStrikes: number,
	maxOuts: number,
	maxBases: number,
	innings: string[]

	homeScores: string[]
	awayScores: string[]

	updateWords: string[]
	updateWordSequences: number[][]
}

export interface ParsedDataStruct {
	config: GameConfig,
	gameEvents: Event[],
};

export function SibrGameLoader() {
	let done = false;

	let maxBalls = 0;
	let maxStrikes = 0;
	let maxOuts = 0;
	let maxBases = 0;

	const homeScores: string[] = [];
	const awayScores: string[] = [];

	const batterPlayerNames: string[] = [];
	const pitcherPlayerNames: string[] = [];
	const homeTeamNames: string[] = [];
	const awayTeamNames: string[] = [];

	const innings: string[] = []; // zero-indexed int in the sibr API but not sure why, i dont want to math on it

	const updateWords: string[] = [];
	const updateWordSequences: number[][] = [];
	const updateWordSequencesParallel: string[] = [];

	const gameEvents: Event[] = [];

	return {
		isDone: function() {
			return done;
		},
		loadEach: function(sibrDatas) {
			sibrDatas.forEach(evt => {
				const {
					gameComplete,

					homeTeamName,
					awayTeamName,

					homeBatterName,
					homePitcherName,
					awayBatterName,
					awayPitcherName,

					homeBases,
					awayBases,

					homeScore,
					awayScore,

					atBatBalls,
					atBatStrikes,
					halfInningOuts,
					topOfInning,
					lastUpdate,
					inning,
					basesOccupied,
				} = evt.data;
				done = done || gameComplete;

				if (homeTeamNames.indexOf(homeTeamName) === -1) {
					homeTeamNames.push(homeTeamName);
				}
				if (awayTeamNames.indexOf(awayTeamName) === -1) {
					awayTeamNames.push(awayTeamName);
				}
				if (batterPlayerNames.indexOf(homeBatterName) === -1) {
					batterPlayerNames.push(homeBatterName);
				}
				if (pitcherPlayerNames.indexOf(homePitcherName) === -1) {
					pitcherPlayerNames.push(homePitcherName);
				}
				if (batterPlayerNames.indexOf(awayBatterName) === -1) {
					batterPlayerNames.push(awayBatterName);
				}
				if (pitcherPlayerNames.indexOf(awayPitcherName) === -1) {
					pitcherPlayerNames.push(awayPitcherName);
				}

				if (atBatBalls > maxBalls) {
					maxBalls = atBatBalls;
				}
				if (atBatStrikes > maxStrikes) {
					maxStrikes = atBatStrikes;
				}
				if (halfInningOuts > maxOuts) {
					maxOuts = halfInningOuts;
				}
				if (homeBases > maxBases) {
					maxBases = homeBases;
				}
				if (awayBases > maxBases) {
					maxBases = awayBases;
				}

				const hScoreTrunc = (Math.round(homeScore * 100)/100).toString();
				if (homeScores.indexOf(hScoreTrunc) === -1) {
					homeScores.push(hScoreTrunc);
				}
				const aScoreTrunc = (Math.round(awayScore * 100)/100).toString();
				if (awayScores.indexOf(aScoreTrunc) === -1) {
					awayScores.push(aScoreTrunc);
				}

				// inning is zero indexed lol fun, why is it a number at all
				const inningTrunc = (Math.round((inning + 1) * 100)/100).toString(); // just in case? cursed
				if (innings.indexOf(inningTrunc) === -1) {
					innings.push(inningTrunc);
				}

				const updateWordSequence: number[] = [];
				(lastUpdate || "").replace("\n", " ").split(" ").map(s => " " + s).forEach(s => {
					let wordIndex = updateWords.indexOf(s);
					if (wordIndex === -1) {
						wordIndex = updateWords.length;
						updateWords.push(s);
					}
					updateWordSequence.push(wordIndex);
				});
				// originally was storing the array of updateWordSequence in updateWordSequences
				// but javascripts equality for arrays is referential so instead we keep
				// a second parallel list with the lastUpdate string itself as the element
				// so we can properly get an index
				let updateWordSequenceIdx = updateWordSequencesParallel.indexOf(lastUpdate);
				if (updateWordSequenceIdx === -1) {
					updateWordSequenceIdx = updateWordSequences.length;
					updateWordSequences.push(updateWordSequence);
					updateWordSequencesParallel.push(lastUpdate);
				}

				gameEvents.push({
					homeTeamName,
					awayTeamName,

					balls: atBatBalls,
					strikes: atBatStrikes,
					outs: halfInningOuts,
					topOfInning,
					pitcherPlayerName: topOfInning ? homePitcherName : awayPitcherName,
					batterPlayerName: topOfInning ? awayBatterName : homeBatterName,
					inning: inningTrunc,

					homeScore: hScoreTrunc,
					awayScore: aScoreTrunc,

					basesOccupied,
					baseCount: (topOfInning ? awayBases : homeBases) || 4, // missing data sometimes

					updateWordSequenceIdx,
					originalUpdateString: (lastUpdate || "")
				})
			});

			if (!sibrDatas.length) {
				done = true;
			}
		},
		getData: function(): ParsedDataStruct {
			return {
				config: {
					homeTeamNames,
					awayTeamNames,

					pitcherPlayerNames,
					batterPlayerNames,

					maxBalls,
					maxStrikes,
					maxOuts,
					maxBases: maxBases || 4, // missing data sometimes
					innings,

					homeScores,
					awayScores,

					updateWords,
					updateWordSequences,
				},
				gameEvents,
			};
		}
	};
};
