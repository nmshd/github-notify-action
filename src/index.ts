import * as core from "@actions/core"
import * as github from "@actions/github"
import axios from "axios"

const webhookUrl = core.getInput("webhook_url")
const prCondition = core.getInput("prCondition")

const context = github.context
const repositoryName = context.payload.repository!.full_name!

core.debug(`Executing for event '${context.eventName}' and action '${context.payload.action}'.`)

switch (context.eventName) {
    case "issues":
        if (context.payload.action !== "opened") break
        newIssue()
        break

    case "discussion":
        if (context.payload.action !== "created") break
        newDiscussion()
        break

    case "pull_request":
    case "pull_request_target":
        if (context.payload.action !== "opened") break
        newPullRequest()
        break

    default:
        core.setFailed(`Unsupported event (${context.eventName})`)
}

function newIssue() {
    sendNotification({
        subject: "A new issue was opened.",
        body: "A new issue was opened. You should go and see if you can help.",
        author: context.payload.issue!.user.login,
        createdAt: context.payload.issue!.created_at,
        link: context.payload.issue!.html_url!
    })
}

function newDiscussion() {
    sendNotification({
        subject: "A discussion was started.",
        body: "A new discussion was started. You should go and see if you can participate.",
        author: context.payload.discussion!.user.login,
        createdAt: context.payload.discussion!.created_at,
        link: context.payload.discussion!.html_url!
    })
}

function newPullRequest() {
    if (prCondition === "onlyExternal" && context.payload.pull_request!.head.repo.full_name === repositoryName) return

    sendNotification({
        subject: "A pull request was created.",
        body: "A pull request from a forked repository was created. This was probably done by someone outside the organisation. You should review the pull request by clicking the button below.",
        author: context.payload.pull_request!.user.login,
        createdAt: context.payload.pull_request!.created_at,
        link: context.payload.pull_request!.html_url!
    })
}

function sendNotification(params: { subject: string; body: string; author: string; createdAt: string; link: string }) {
    const data = {
        title: params.subject,
        summary: params.subject,
        text: params.body,
        sections: [
            {
                facts: [
                    { name: "Repository", value: repositoryName },
                    { name: "Author", value: params.author },
                    {
                        name: "Created At",
                        value: new Date(params.createdAt).toLocaleString("de-de", { timeZone: "Europe/Berlin" })
                    }
                ]
            }
        ],
        potentialAction: [
            {
                "@type": "OpenUri",
                name: "Open",
                targets: [{ os: "default", uri: params.link }]
            }
        ]
    }

    axios.post(webhookUrl, data)

    core.debug("Successfuly sent the following message:\n" + JSON.stringify(data, undefined, 2))
}
