import { Type } from '@mikro-orm/core';
import { BaseEnum } from '../enums/BaseEnum';

export function createCustomType<T extends BaseEnum<T>>(
	enumClass: { prototype: T; valueOf(value: string): T },
	columnLength: number = 20,
): new () => Type<T, string> {
	return class extends Type<T, string> {
		convertToDatabaseValue(enumValue: T): string {
			return enumValue.name;
		}
		convertToJSValue(value: string): T {
			return enumClass.valueOf(value);
		}
		getColumnType(): string {
			return `varchar(${columnLength})`;
		}
	};
}
