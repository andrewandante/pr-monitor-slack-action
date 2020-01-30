import * as core from '@actions/core';
import * as github from '@actions/github';
import { WebClient } from '@slack/web-api';
import moment from "moment";

try {
    const channel = core.getInput('channel');
    const repo = github.context.repo;
    const octokit = new github.GitHub(core.getInput('github-token'));

    let slackMessageParts = [
        `*${repo.owner}/${repo.repo}*`,
    ];

    (async () => {
        const { data: openPullRequests } = await octokit.pulls.list({
            ...repo,
            state: "open",
            per_page: 100,
            sort: core.getInput('sort'),
            direction: core.getInput('sort-direction')
        });

        if (openPullRequests.length === 0) {
            slackMessageParts.push('> No open pull requests found!');
        } else {

            for (const pullRequest of openPullRequests) {
                const {updated_at, _links, number, title, user} = pullRequest;
                let reviewStatuses = [];
                let reviewStatus = '-';
                const {data: reviews} = await octokit.pulls.listReviews({
                    ...repo,
                    pull_number: number
                });

                // loop over all the reviews, overwriting if a reviewer has submitted more than one
                // This means their most recent review is reflected
                reviews.forEach(review => {
                    switch (review.state) {
                        case 'APPROVED':
                            reviewStatuses[review.user.id] = `:${core.getInput('approved-emoji')}:`;
                            break;
                        case 'PENDING':
                            reviewStatuses[review.user.id] = `:${core.getInput('pending-emoji')}:`;
                            break;
                        case 'CHANGES_REQUESTED':
                            reviewStatuses[review.user.id] = `:${core.getInput('changes-requested-emoji')}:`;
                            break;
                        default:
                            // noop
                            break;
                    }
                });

                const {data: requestedReviewers} = await octokit.pulls.listReviewRequests({
                    ...repo,
                    pull_number: number
                });

                // Also loop over requested reviewers - we store in the same way to account for the
                // "re-request review" button
                requestedReviewers.users.forEach(reviewer => {
                    reviewStatuses[reviewer.id] = `:${core.getInput('requested-reviewer-emoji')}:`;
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
        }

        const slack = new WebClient(core.getInput('slack-token'));
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
