import * as core from '@actions/core';
import * as github from '@actions/github';
import { WebClient } from '@slack/web-api';

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
            let messageString = `> <${pullRequest._links.html.href}/files|#${pullRequest.number}> ${pullRequest.title} - ${pullRequest.user.login}, ${pullRequest.updated_at}`;
            console.log(messageString);
            slackMessageParts.push(messageString);
        });

        const prPayload = JSON.stringify(openPullRequests, undefined, 2);
        console.log(`The PR payload: ${prPayload}`);

        const slack = new WebClient(oAuthToken);
        // Post a message to the channel, and await the result.
        // Find more arguments and details of the response: https://api.slack.com/methods/chat.postMessage
        const result = await slack.chat.postMessage({
            text: slackMessageParts.join('\\n'),
            channel: channel,
        });

        // The result contains an identifier for the message, `ts`.
        console.log(`Successfully send message ${result.ts} in conversation ${channel}`);
    })();
} catch (error) {
    core.setFailed(error.message);
}
