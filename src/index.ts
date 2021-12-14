import * as core from "@actions/core";
import * as github from "@actions/github";
import axios from "axios";

const webhookUrl = core.getInput("webhook_url");
const prCondition = core.getInput("prCondition");

const context = github.context;
const repositoryName = context.payload.repository!.full_name!;

switch (context.eventName) {
  case "issues":
    if (context.payload.action !== "opened") break;

    newIssue();
    break;

  case "discussion":
    if (context.payload.action !== "created") break;

    newDiscussion();
    break;

  case "pull_request":
    if (context.payload.action !== "opened") break;

    if (prCondition === "onlyExternal" && context.payload.pull_request!.head.repo.full_name !== repositoryName) break;

    newPullRequest();
    break;

  default:
    core.setFailed(`Unsupported event (${context.eventName})`);
}

function newIssue() {
  sendNotification({
    summary: "A new issue was opened.",
    text: "A new issue was opened. You should go and see if you can help.",
    author: context.payload.issue!.user.login,
    createdAt: context.payload.issue!.created_at,
    link: context.payload.issue!.html_url!,
  });
}

function newDiscussion() {
  sendNotification({
    summary: "A discussion was started.",
    text: "A new discussion was started. You should go and see if you can participate.",
    author: context.payload.discussion!.user.login,
    createdAt: context.payload.discussion!.created_at,
    link: context.payload.discussion!.html_url!,
  });
}

function newPullRequest() {
  sendNotification({
    summary: "A pull request was created.",
    text: "A pull request from a forked repository was created. This was probably done by someone outside the organisation. You should review the pull request by clicking the button below.",
    author: context.payload.pull_request!.user.login,
    createdAt: context.payload.pull_request!.created_at,
    link: context.payload.pull_request!.html_url!,
  });
}

function sendNotification(params: { summary: string; text: string; author: string; createdAt: string; link: string }) {
  const data = {
    title: params.summary,
    summary: params.summary,
    text: params.text,
    sections: [
      {
        facts: [
          { name: "Repository", value: repositoryName },
          { name: "Author", value: params.author },
          {
            name: "Created At",
            value: new Date(params.createdAt).toLocaleString("de-de", { timeZone: "Europe/Berlin" }),
          },
        ],
      },
    ],
    potentialAction: [
      {
        "@type": "OpenUri",
        name: "Open",
        targets: [{ os: "default", uri: params.link }],
      },
    ],
  };

  axios.post(webhookUrl, data);

  core.debug("Successfuly sent the following message:\n" + JSON.stringify(data, undefined, 2));
}
