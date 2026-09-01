---
title: 'What a Kubernetes Operator Actually Is'
date: 2026-08-03
summary: 'Forget the CRD jargon for a minute. An operator is a thermostat: you declare the state you want, and a loop keeps making it true.'
tags: ['kubernetes', 'operators', 'infrastructure']
order: 2
---

Most explanations of Kubernetes operators start with the vocabulary: custom resource definitions, controllers, reconcilers, informers. That's backwards. The vocabulary describes the machinery, and the machinery only makes sense once you understand the one idea it exists to serve.

Here is the idea: **an operator is a thermostat.**

A thermostat doesn't fire once. You don't tell it "turn the heat on for twenty minutes," which is an instruction. You tell it "keep this room at 68 degrees," which is a *desired state*. From then on, the thermostat runs a loop: measure the actual temperature, compare it to the desired temperature, and act on the difference. If someone opens a window, the thermostat doesn't know or care why the room got cold. It notices the gap between actual and desired, and it corrects it.

That loop, observe, compare, correct, forever, is the entire conceptual content of a Kubernetes operator. Everything else is plumbing.

## Instructions versus declarations

The distinction that matters is between imperative and declarative automation, and it's easiest to see in what each one does when something goes wrong.

An imperative script is a list of instructions: create this role, attach this permission, bind this group. Run it and it either works or it doesn't. If it works, the state it created starts drifting the moment the script exits: someone edits a value by hand, a migration misses a record, a dependency resets something. The script has no opinion about any of that, because the script is gone. Automation that runs once answers the question "how do I create this state?" It never answers the harder question, "how do I *keep* this state true?"

A declaration flips the contract. You write down the state you want, in a file, in version control, and hand it to a system whose job is to make reality match the file, continuously. The file is the thermostat setting. The operator is the thermostat.

## What Kubernetes contributes

You could build a reconciliation loop with a cron job and a shell script, and people did, for years. What Kubernetes adds is a standard place for the *declared state* to live and a standard machinery for reacting to it.

A **custom resource definition** teaches the Kubernetes API a new noun. Out of the box, Kubernetes knows about Pods and Services and Deployments; a CRD adds your domain's nouns to that list, so a role binding or a database or a DNS record becomes a first-class Kubernetes object, written in YAML, stored in the cluster, validated against a schema on the way in. This is less exotic than it sounds. It's a typed record in a well-guarded database that happens to come with an API, access control, an audit trail, and change notifications for free.

An **operator** is then just a program that watches those objects and runs the thermostat loop against them. When Kubernetes notifies it that a resource was created or changed, it reconciles: read what the resource declares, look at what actually exists, and do the minimum work to close the gap. The target of that work does not have to be inside the cluster. My own operator manages RBAC data that lives in an external authorization system; the custom resources declare which roles and permission mappings should exist, and the loop drives an external API until they do. Anything you can read and write, you can reconcile.

## The loop is level-triggered, and that's the whole trick

There's a subtlety that separates operators that work from operators that merely demo well. Notifications can be missed. The operator can be down when a change happens, the network can drop an event, a resource can be created while the operator is being upgraded. If your loop only runs in response to events, every missed event is permanent drift.

So real operators are **level-triggered, not edge-triggered**: they respond to events for responsiveness, but they *also* re-run reconciliation on a timer against every resource they own, whether or not anything appears to have changed. Mine resyncs every five minutes. The event says "something probably changed, look now." The timer says "look anyway."

This is exactly the thermostat's virtue. A thermostat doesn't subscribe to window-opening events. It measures the room, on a cycle, and corrects whatever it finds. It cannot miss an event because it never depended on events in the first place.

Level-triggering imposes one discipline on the implementer: **reconciliation must be idempotent**. The loop will run thousands of times against a resource that is already correct, and the correct behavior in that case is to compare, find no difference, and do nothing. Write once, converge always. If your reconcile does work every time it runs, you don't have an operator; you have a very persistent bug.

Get this right, and remarkable properties fall out for free:

- **Drift heals itself.** Someone hand-edits the live state; the next cycle puts it back.
- **Failures retry themselves.** A reconcile fails against a flaky downstream; the next cycle tries again. No special retry framework, no dead-letter queue.
- **Recovery is indistinguishable from normal operation.** The operator crashes and restarts; it lists the resources it owns and reconciles them. That's not a recovery path. It's the only path.

## What it costs

Operators are not free, and the honest costs are worth naming, because they're the same costs I accepted in my own design.

**You've created a second source of truth.** The declared state lives in custom resources; the actual state lives wherever it lives. For everything declared in a resource, the loop reconciles the two. But most external systems can also be modified directly, around the operator, and anything created that way has no declaration governing it. The operator doesn't fight that state; it doesn't even see it. The moment you introduce a declarative layer, you owe the system an answer for what happens to the state that bypasses it, and "detection and flagging of ungoverned data" belongs on your roadmap from day one.

**Convergence is eventual.** A level-triggered loop corrects drift within one resync interval, not instantly. Whether a five-minute worst case is fine or fatal depends entirely on the domain, and you should decide deliberately rather than discover it in an incident.

**It's more system to operate.** An operator is software you now run, observe, upgrade, and debug. For a handful of resources that change once a quarter, a script and a runbook might genuinely be the better engineering call. The operator pays for itself when the state is broad (many services), multiplied (many environments), or touched by many hands, because that's when manual state management stops scaling and drift becomes a certainty instead of a risk.

## The takeaway

When someone says "operator," don't picture the YAML or the SDK. Picture the thermostat: a declared state, a loop that never stops comparing it to reality, and corrections that are safe to apply forever because doing nothing is the normal case.

Once you see the pattern, you'll notice it has almost nothing to do with Kubernetes. Kubernetes just supplies the best off-the-shelf home for it: schema'd declarations, an audit trail, change notifications, and a controller runtime. The idea is older and bigger, and it's the same one behind every self-healing system worth the name: **stop writing instructions for how to change state, and start declaring what should be true.**
