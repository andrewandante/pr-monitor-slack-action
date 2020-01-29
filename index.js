const core = require('@actions/core');
const github = require('@actions/github');
const { WebClient } = require('@slack/web-api');

try {
    // `who-to-greet` input defined in action metadata file
    const channel = core.getInput('channel');
    const oAuthToken = core.getInput('slack-token');
    console.log(`You chose the channel ${channel}!`);
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);
    const slackweb = new WebClient(oAuthToken);
    (async () => {

        // Post a message to the channel, and await the result.
        // Find more arguments and details of the response: https://api.slack.com/methods/chat.postMessage
        const result = await slackweb.chat.postMessage({
            text: 'Hello? Yes, this is Patrick!',
            channel: '#purr-test',
        });

        // The result contains an identifier for the message, `ts`.
        console.log(`Successfully send message ${result.ts} in conversation #purr-test`);
    })();
} catch (error) {
    core.setFailed(error.message);
}
