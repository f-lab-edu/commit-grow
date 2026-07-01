import { p } from "@mikro-orm/core";

export const baseProperty = {
	id: p.uuid().primary().defaultRaw("uuidv7()"),
};
