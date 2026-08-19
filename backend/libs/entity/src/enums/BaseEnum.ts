export abstract class BaseEnum<_T extends BaseEnum<_T>> {
	readonly name: string;
	readonly label: string;

	protected constructor(name: string, label: string) {
		this.name = name;
		this.label = label;
	}

	toString(): string {
		return this.name;
	}

	static values<T extends BaseEnum<T>>(this: { prototype: T }): readonly T[] {
		return Object.values(this).filter(
			(v): v is T => v instanceof (this as any),
		);
	}

	static valueOf<T extends BaseEnum<T>>(
		this: { prototype: T } & { values(): readonly T[] },
		name: string,
	): T {
		const found = this.values().find((v) => v.name === name);
		if (!found) {
			throw new Error(`존재하지 않는 값입니다. value=${name}`);
		}
		return found;
	}
}
