import { Temporal } from '@js-temporal/polyfill';
import { Transform } from 'class-transformer';
import { SystemException } from '../exception/SystemException';

export function ToTemporalInstant() {
	return Transform(({ value }) => {
		try {
			if (value && typeof value === 'string') {
				return Temporal.Instant.from(value);
			}
		} catch (error) {
			throw new SystemException(
				'올바르지 않은 날짜 형식입니다.',
				`${ToTemporalInstant.name} 변환중 에러가 발생하였습니다. value=${value}`,
				{
					value,
					error,
				},
			);
		}

		throw new SystemException(
			'올바르지 않은 날짜 형식입니다.',
			`${ToTemporalInstant.name} 변환중 에러가 발생하였습니다. value=${value}`,
			{
				value,
			},
		);
	});
}
