import { Type } from '@mikro-orm/core';
import { BaseEnum } from '../enums/BaseEnum';

export function createCustomType<T extends BaseEnum<T>>(
	enumClass: { prototype: T; valueOf(value: string): T },
	columnLength: number = 20,
): new () => Type<T | null, string | null> {
	return class extends Type<T | null, string | null> {
		convertToDatabaseValue(enumValue: T | null): string | null {
			return enumValue ? enumValue.name : null;
		}
		convertToJSValue(value: string | null): T | null {
			return value ? enumClass.valueOf(value) : null;
		}
		getColumnType(): string {
			return `varchar(${columnLength})`;
		}
	};
}
