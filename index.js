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
            let reviewStatuses = [];
            let reviewStatus = '-';
            const { data: reviews } = await octokit.pulls.listReviews({
                ...repo,
                pull_number: number
            });

            // loop over all the reviews, overwriting if a reviewer has submitted more than one
            // This means their most recent review is reflected
            reviews.forEach(review => {
                switch (review.state) {
                    case 'APPROVED':
                        reviewStatuses[review.user.id] = ':heavy_tick:';
                        break;
                    case 'PENDING':
                        reviewStatuses[review.user.id] = ':heavy_minus_symbol:';
                        break;
                    case 'CHANGES_REQUESTED':
                        reviewStatuses[review.user.id] = ':x:';
                        break;
                    default:
                        // noop
                        break;
                }
            });

            const { data: requestedReviewers } = await octokit.pulls.listReviewRequests({
                ...repo,
                pull_number: number
            });

            // Also loop over requested reviewers - we store in the same way to account for the
            // "re-request review" button
            requestedReviewers.users.forEach(reviewer => {
                reviewStatuses[reviewer.id] = ':heavy_minus_symbol:'
            });

            if (reviewStatuses !== []) {
                reviewStatus = Object.keys(reviewStatuses).map(function (key) {
                    return reviewStatuses[key];
                }).join(' ');
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
