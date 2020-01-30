import * as core from '@actions/core';
import * as github from '@actions/github';
import { WebClient } from '@slack/web-api';
import moment from "moment";

try {
    const channel = core.getInput('channel');
    const oAuthToken = core.getInput('slack-token');
    const githubToken = core.getInput('github-token');

    console.log(`You chose the channel ${channel}!`);
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
            sort: "updated",
            direction: "desc"
        });

        openPullRequests.forEach(pullRequest => {
            const { updated_at, _links, pull_number, title, user } = pullRequest;
            let reviewStatus = '';
            const { data: reviews } = octokit.pulls.listReviews({
                ...repo,
                pull_number
            });

            reviews.forEach(review => {
                switch (review.state) {
                    case 'APPROVED':
                        reviewStatus.concat(':heavy_tick:');
                        break;
                    case 'PENDING':
                        reviewStatus.concat(':heavy_minus_symbol:');
                        break;
                    case 'CHANGES_REQUESTED':
                        reviewStatus.concat(':x:');
                        break;
                    default:
                        reviewStatus.concat(':grey_question:');
                        break;
                }
            });

            const updatedAgo = moment(updated_at).fromNow();
            let messageString = `> <${_links.html.href}/files|#${pull_number}> ${title} ${reviewStatus} _${user.login}_, last updated ${updatedAgo}`;
            slackMessageParts.push(messageString);
        });

        const slack = new WebClient(oAuthToken);
        const result = await slack.chat.postMessage({
            text: slackMessageParts.join(`\n`),
            channel: channel,
        });

        // The result contains an identifier for the message, `ts`.
        console.log(`Successfully send message ${result.ts} in conversation ${channel}`);
    })();
} catch (error) {
    core.setFailed(error.message);
}
