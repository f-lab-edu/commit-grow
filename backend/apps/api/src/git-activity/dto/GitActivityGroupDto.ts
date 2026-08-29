export type GitActivityGroupType = 'commit' | 'issue' | 'pr' | 'review';

export class GitActivityItemDto {
	readonly title: string;
	readonly ref: string;

	constructor(title: string, ref: string) {
		this.title = title;
		this.ref = ref;
	}
}

export class GitActivityGroupDto {
	readonly type: GitActivityGroupType;
	readonly label: string;
	readonly count: number;
	readonly items: GitActivityItemDto[];
	readonly moreCount: number;
	readonly emptyLabel?: string;

	constructor(
		type: GitActivityGroupType,
		label: string,
		count: number,
		items: GitActivityItemDto[],
		moreCount: number,
		emptyLabel?: string,
	) {
		this.type = type;
		this.label = label;
		this.count = count;
		this.items = items;
		this.moreCount = moreCount;
		this.emptyLabel = emptyLabel;
	}
}
