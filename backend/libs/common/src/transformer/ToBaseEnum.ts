import { BaseEnum } from '@app/entity/enums/BaseEnum';
import { Transform } from 'class-transformer';
import { SystemException } from '../exception/SystemException';

export function ToBaseEnum<T extends BaseEnum<T>>(enumClass: {
	valueOf(name: string): T;
}) {
	return Transform(({ value }) => {
		if (value && typeof value === 'string') {
			return enumClass.valueOf(value);
		}

		throw new SystemException(
			'enum 코드를 확인해주세요.',
			`${ToBaseEnum.name} 변환중 에러가 발생하였습니다. value=${value}`,
			{
				value,
			},
		);
	});
}
