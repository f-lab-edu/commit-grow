import { SystemException } from '@app/common/exception/SystemException';
import { Type } from '@mikro-orm/core';
import { BaseEnum } from '../enums/BaseEnum';

export function createCustomType<T extends BaseEnum<T>>(
	enumClass: { prototype: T; valueOf(value: string): T },
	columnLength: number = 20,
): new () => Type<T | null, string | null> {
	return class extends Type<T | null, string | null> {
		convertToDatabaseValue(enumValue: T | null): string | null {
			if (enumValue == null) {
				return null;
			}

			if (enumValue instanceof BaseEnum) {
				return enumValue.name;
			}

			throw SystemException.SystemError(
				`유효하지 않은 값을 CustomType으로 전환중 에러가 발생하였습니다. value=${enumValue}`,
			);
		}
		convertToJSValue(value: string | null): T | null {
			return value ? enumClass.valueOf(value) : null;
		}
		getColumnType(): string {
			return `varchar(${columnLength})`;
		}
		compareAsType() {
			return 'string';
		}
		ensureComparable(): boolean {
			return false;
		}
	};
}
