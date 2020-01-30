import {context} from "@actions/github";

const core = import('@actions/core');
const github = import('@actions/github');
const { WebClient } = import('@slack/web-api');

try {
    // `who-to-greet` input defined in action metadata file
    const channel = core.getInput('channel');
    const oAuthToken = core.getInput('slack-token');
    console.log(`You chose the channel ${channel}!`);
    const repo = github.context.repo;

    (async () => {
        const openPullRequests = await github.pulls.list({
            owner: repo.owner,
            repo: repo.repo,
            state: "open",
            per_page: 100,
            sort: "updated",
            direction: "desc"
        });
        const prPayload = JSON.stringify(openPullRequests, undefined, 2);
        console.log(`The PR payload: ${prPayload}`);
    })();


    const slack = new WebClient(oAuthToken);
    (async () => {

        // Post a message to the channel, and await the result.
        // Find more arguments and details of the response: https://api.slack.com/methods/chat.postMessage
        const result = await slack.chat.postMessage({
            text: 'Hello? Yes, this is Patrick!',
            channel: '#purr-test',
        });

        // The result contains an identifier for the message, `ts`.
        console.log(`Successfully send message ${result.ts} in conversation #purr-test`);
    })();
} catch (error) {
    core.setFailed(error.message);
}
