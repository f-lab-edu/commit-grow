import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';
import type { GithubClientService, RawGitActivity } from '@app/github-client';
import { describe, expect, it, vi } from 'vitest';
import { GitActivityService } from './git-activity.service';

describe('GitActivityService', () => {
	describe('getToday', () => {
		it('활동이 하나도 없으면 빈 배열을 반환한다', async () => {
			// given
			const service = createService([]);

			// when
			const result = await service.getToday('access-token');

			// then
			expect(result).toEqual([]);
		});

		it('활동이 있으면 4개 타입 그룹을 모두 반환하고, 없는 타입은 emptyLabel을 채운다', async () => {
			// given
			const service = createService([
				rawActivity(GitActivityTypeEnum.COMMIT, '커밋 제목', 'octocat/repo'),
			]);

			// when
			const result = await service.getToday('access-token');

			// then
			expect(result).toHaveLength(4);
			const commitGroup = result.find((g) => g.type === 'commit');
			expect(commitGroup).toMatchObject({
				count: 1,
				items: [{ title: '커밋 제목', ref: 'octocat/repo' }],
				moreCount: 0,
				emptyLabel: undefined,
			});
			const issueGroup = result.find((g) => g.type === 'issue');
			expect(issueGroup).toMatchObject({
				count: 0,
				items: [],
				emptyLabel: '오늘은 이슈가 없어요',
			});
		});

		it('한 타입의 활동이 표시 한도를 넘으면 moreCount로 나머지를 표기한다', async () => {
			// given
			const activities = Array.from({ length: 7 }, (_, i) =>
				rawActivity(GitActivityTypeEnum.COMMIT, `커밋 ${i}`, 'octocat/repo'),
			);
			const service = createService(activities);

			// when
			const result = await service.getToday('access-token');

			// then
			const commitGroup = result.find((g) => g.type === 'commit');
			expect(commitGroup?.count).toBe(7);
			expect(commitGroup?.items).toHaveLength(5);
			expect(commitGroup?.moreCount).toBe(2);
		});
	});
});

function rawActivity(
	type: GitActivityTypeEnum,
	title: string,
	repoName: string,
): RawGitActivity {
	return {
		type,
		title,
		repoName,
		githubNodeId: `node-${title}`,
		activityAt: new Date('2026-08-29T00:00:00Z'),
	};
}

function createService(activities: RawGitActivity[]): GitActivityService {
	const githubClientService = {
		fetchTodayGitActivities: vi.fn().mockResolvedValue(activities),
	} as unknown as GithubClientService;

	return new GitActivityService(githubClientService);
}
