import * as core from '@actions/core';
import * as github from '@actions/github';
import { WebClient } from '@slack/web-api';
import moment from "moment";

try {
    const channel = core.getInput('channel');
    const oAuthToken = core.getInput('slack-token');
    const githubToken = core.getInput('github-token');
    const sort = core.getInput('sort');
    const sortDirection = core.getInput('sort-direction');

    const repo = github.context.repo;
    const octokit = new github.GitHub(githubToken);

    let slackMessageParts = [
        `*${repo.owner}/${repo.repo}*`,
    ];

    (async () => {
        const { data: openPullRequests } = await octokit.pulls.list({
            ...repo,
            state: "open",
            per_page: 100,
            sort,
            direction: sortDirection
        });

        for (const pullRequest of openPullRequests) {
            const { updated_at, _links, number, title, user } = pullRequest;
            let reviewStatus = '';
            const { data: reviews } = await octokit.pulls.listReviews({
                ...repo,
                pull_number: number
            });

            //hmm looks like it stores all the reviews

            reviews.forEach(review => {
                switch (review.state) {
                    case 'APPROVED':
                        reviewStatus = reviewStatus.concat(':heavy_tick:');
                        break;
                    case 'PENDING':
                        reviewStatus = reviewStatus.concat(':heavy_minus_symbol:');
                        break;
                    case 'CHANGES_REQUESTED':
                        reviewStatus = reviewStatus.concat(':x:');
                        break;
                    default:
                        // noop
                        break;
                }
            });

            if (reviewStatus === '') {
                reviewStatus = '-';
            }

            const updatedAgo = moment(updated_at).fromNow();
            let messageString = `> <${_links.html.href}/files|#${number}> *${title}* ${reviewStatus} _${user.login}_, last updated ${updatedAgo}`;
            slackMessageParts.push(messageString);
        }

        const slack = new WebClient(oAuthToken);
        const result = await slack.chat.postMessage({
            text: slackMessageParts.join(`\n`),
            channel,
        });

        // The result contains an identifier for the message, `ts`.
        console.log(`Successfully send message ${result.ts} in conversation ${channel}`);
    })();
} catch (error) {
    core.setFailed(error.message);
}
