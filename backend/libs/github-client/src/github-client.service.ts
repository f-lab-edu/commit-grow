import { SystemException } from '@app/common/exception/SystemException';
import { GitActivityTypeEnum } from '@app/entity/enums/GitActivityTypeEnum';
import { Environment } from '@app/environment/schema/Environment';
import { OAuthGithubEnvironment } from '@app/environment/schema/OAuthGithubEnvironment';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString, validateSync } from 'class-validator';
import { Logger } from 'nestjs-pino';
import { Octokit } from 'octokit';
import { RawGitActivity } from './types/RawGitActivity';

const GITHUB_REPO_URL_PREFIX = 'https://api.github.com/repos/';

function repoNameFromUrl(repositoryUrl: string): string {
	return repositoryUrl.startsWith(GITHUB_REPO_URL_PREFIX)
		? repositoryUrl.slice(GITHUB_REPO_URL_PREFIX.length)
		: repositoryUrl;
}

@Injectable()
export class GithubClientService {
	@IsNotEmpty()
	@IsString()
	private readonly clientId: string;

	@IsNotEmpty()
	@IsString()
	private readonly clientSecret: string;
	private readonly otokit: Octokit;
	private readonly basicAuthorizationHeader: string;

	constructor(
		configService: ConfigService<Environment>,
		private readonly logger: Logger,
	) {
		const oauthGithubConfig =
			configService.getOrThrow<OAuthGithubEnvironment>('oauthGithub');
		this.clientId = oauthGithubConfig.clientId;
		this.clientSecret = oauthGithubConfig.clientSecret;
		this.basicAuthorizationHeader = `Basic ${Buffer.from(
			`${this.clientId}:${this.clientSecret}`,
		).toString('base64')}`;

		this.otokit = new Octokit();

		this.validate();
	}

	async revokeAccessToken(accessToken: string): Promise<void> {
		try {
			await this.otokit.rest.apps.deleteToken({
				client_id: this.clientId,
				access_token: accessToken,
				headers: {
					authorization: this.basicAuthorizationHeader,
				},
			});
		} catch (error) {
			if ('status' in error && error.status === 404) {
				this.logger.log('이미 무효화된 토큰을 무효화 시도했습니다.', {
					accessToken,
				});
				return;
			}

			this.logger.error('토큰 무효화를 실패했습니다.', { error });
			throw error;
		}
	}

	async fetchTodayGitActivities(
		accessToken: string,
	): Promise<RawGitActivity[]> {
		const client = new Octokit({ auth: accessToken });
		const { data: authenticatedUser } =
			await client.rest.users.getAuthenticated();
		const username = authenticatedUser.login;
		const today = new Date().toISOString().slice(0, 10);

		const [commits, issues, pullRequests, reviews] = await Promise.all([
			client.rest.search.commits({
				q: `author:${username} author-date:${today}`,
			}),
			client.rest.search.issuesAndPullRequests({
				q: `type:issue author:${username} created:${today}`,
			}),
			client.rest.search.issuesAndPullRequests({
				q: `type:pr author:${username} created:${today}`,
			}),
			// ponytail: PR이 오늘 업데이트됐는지 기준이라 "오늘 남긴 리뷰"의 근사치.
			// 정확히 하려면 PR별 리뷰 목록을 개별 조회해야 함, 부정확도가 체감되면 업그레이드
			client.rest.search.issuesAndPullRequests({
				q: `type:pr reviewed-by:${username} -author:${username} updated:${today}`,
			}),
		]);

		return [
			...commits.data.items.map(
				(item): RawGitActivity => ({
					type: GitActivityTypeEnum.COMMIT,
					title: item.commit.message.split('\n')[0],
					repoName: item.repository.full_name,
					githubNodeId: item.node_id,
					activityAt: new Date(item.commit.author.date),
				}),
			),
			...issues.data.items.map(
				(item): RawGitActivity => ({
					type: GitActivityTypeEnum.ISSUE,
					title: item.title,
					repoName: repoNameFromUrl(item.repository_url),
					githubNodeId: item.node_id,
					activityAt: new Date(item.created_at),
				}),
			),
			...pullRequests.data.items.map(
				(item): RawGitActivity => ({
					type: GitActivityTypeEnum.PULL_REQUEST,
					title: item.title,
					repoName: repoNameFromUrl(item.repository_url),
					githubNodeId: item.node_id,
					activityAt: new Date(item.created_at),
				}),
			),
			...reviews.data.items.map(
				(item): RawGitActivity => ({
					type: GitActivityTypeEnum.CODE_REVIEW,
					title: item.title,
					repoName: repoNameFromUrl(item.repository_url),
					githubNodeId: item.node_id,
					activityAt: new Date(item.updated_at),
				}),
			),
		];
	}

	private validate() {
		const validateErrors = validateSync(this);
		if (validateErrors.length > 0) {
			throw new SystemException(
				'github client 인스턴스 생성중 에러가 발생하였습니다.',
				validateErrors,
			);
		}
	}
}
