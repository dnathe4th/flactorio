import {letters} from "$lib/blueprints/letters";
import { deflate, inflate } from "pako";
import { Buffer } from "buffer";

export function stringStaticDisplayLen(s: string): number {
	if (!s) {
		return 0;
	}
	let c = 0;
	s.split("").forEach(l => {
		const letterConfig = letters[l.toUpperCase()];
		if (!letterConfig) {
			console.warn(`missing '${l}'`);
			return;
		}
		c += letterConfig.length + 1;
	});
	return c;
};

export function convertBlueprintJson(obj: any): string {
	const deflated = deflate(JSON.stringify(obj), {level: 9});
	return Buffer.from(deflated).toString("base64");
};

export function devertBlueprintJson(json: string): string {
	return inflate(Buffer.from(json.substr(1), "base64"), {to: "string"});
}
