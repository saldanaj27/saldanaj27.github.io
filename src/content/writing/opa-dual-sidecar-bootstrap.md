---
title: 'The Bootstrap Problem in OPA Authorization: Why Two Sidecars Are Better Than One'
date: 2026-08-03
summary: 'How does a decentralized authorization system authorize itself during cold start? An infrastructure pattern using two OPA sidecars with OR logic.'
tags: ['opa', 'authorization', 'kubernetes', 'patterns']
order: 1
---

*An infrastructure pattern for decentralized authorization that can authorize itself during cold start.*

## The problem

The setup: a multi-tenant, policy-based authorization platform built around [Open Policy Agent (OPA)](https://www.openpolicyagent.org/). Any service adds a shared client library and gets sub-millisecond, decentralized authorization by calling its local OPA sidecar. No network hop to a central authorization server, no shared failure domain.

That design has a chicken-and-egg problem hiding in it: **how does the authorization system authorize its own operations during cold start?**

When a new service starts up, its OPA sidecar has no bundle loaded yet. The bundle is fetched from a bundle-delivery service, which itself requires authorization to access. The service cannot make its first authorized request until the first bundle is loaded, and it cannot load the bundle without making an authorized request. Deadlock.

This is the **authorization bootstrap problem**. It is easy to miss on a whiteboard, because on a whiteboard every component is already running.

## The solution: dual OPA sidecar

The fix is a **dual OPA sidecar pattern**: two OPA containers per pod, with OR logic for authorization decisions.

```
OpaClient.allow(action, resourceId)
    ↓
Primary OPA (localhost:8181) → loads live bundles from the bundle service
    OR
Bootstrapped OPA (localhost:8182) → pre-seeded with static policy data in the image
```

### How it works

1. **Primary OPA** (`localhost:8181`): The "real" authorization engine. Fetches live policy bundles every 10-20 seconds from the bundle service. Evaluates against the most current RBAC state (roles, permissions, groups, tenants) distributed as OPA bundles.

2. **Bootstrapped OPA** (`localhost:8182`): A companion container with pre-seeded authorization data baked into the container image at build time. This data is generated from a snapshot of the RBAC state at image build, packaged as a bundle, and loaded at startup.

3. **OR logic**: the client library queries both OPAs. If *either* returns `true`, the request is authorized. The primary OPA is queried first (it has the freshest data), but if it's unavailable or hasn't loaded its first bundle yet, the bootstrapped OPA serves as fallback.

### The bootstrap flow

```
Service pod startup:
  1. Pod initializes → both OPA containers start
  2. Primary OPA: starts, but bundle polling hasn't fetched first bundle yet
  3. Bootstrapped OPA: starts with pre-seeded bundle already in memory
  4. App container starts → makes first gRPC call → hits OpaClient.allow()
  5. OpaClient checks primary OPA → no bundle loaded yet → returns false
  6. OpaClient checks bootstrapped OPA → pre-seeded data → returns true if authorized
  7. 10-20s later: primary OPA fetches first live bundle
  8. Subsequent requests: primary OPA takes over automatically
```

## The trade-off: availability over consistency

The dual-sidecar pattern makes an explicit trade-off: **availability over consistency during the bootstrap window**.

- **During cold start (0-20 seconds):** authorization decisions use bootstrapped data, which is a snapshot from image build time. If a permission was revoked since the image was built, the bootstrapped OPA won't know about it.
- **After bundle load:** primary OPA takes over with live data. The bootstrapped OPA is still polled but typically returns the same or a subset of results.

### How to evaluate this trade-off

If you're considering this pattern, these are the three risks to reason through. None of them is disqualifying on its own; each is a question about your system's actual behavior.

1. **Stale permissions during bootstrap.** The bootstrapped data could allow access that should have been revoked. The evaluation hinges on two things: how short you can keep the window (a 10-20 second bundle poll interval keeps it narrow), and whether stale RBAC during that window is actually dangerous in your domain. In a platform where RBAC changes are infrequent, reviewed administrative actions, a seconds-long window on a freshly started pod is a very different risk than in a system doing continuous, adversarial permission changes.

2. **A more permissive fallback.** The bootstrapped OPA could be more permissive than current production data. Ask how often service deployments actually coincide with permission revocations in your environment; if the answer is "essentially never," the exposure is theoretical. If your deploys and permission changes are coupled, this pattern needs more guardrails.

3. **Bundle freshness decay.** Bootstrapped data is only as current as the last image build. Frequent (for example, daily) image rebuilds keep the snapshot near-current; an image that ships quarterly turns the fallback into a time capsule. The rebuild cadence is part of the pattern, not an implementation detail.

The overriding question for all three: **do you have an independent, faster revocation mechanism?** For truly urgent revocation (a compromised credential), JWT expiration is the real kill switch, and it works regardless of bundle state. If short-lived tokens cover the emergency case, the bundle path only has to handle the routine case, and the window becomes defensible.

## Alternative approaches considered

1. **Startup gate (block all requests until first bundle loads)**: Simple but means the service can't serve *any* traffic until the first bundle load completes. For services with strict SLA commitments, this is unacceptable. Also fragile: if the bundle service is also down, the service never starts.

2. **Init container that pre-loads the bundle**: Would block pod startup until the bundle is fetched. Same availability problem as the startup gate, plus the init container would need its own authorization to fetch from the bundle service, so the bootstrap problem recurs.

3. **Centralized auth server**: Call a central authorization service over the network at startup. This is the option that gets suggested most often, and it does solve the deadlock. It also gives back exactly what sidecar-based authorization was adopted to get: no network dependency on the request path, no added latency, no single point of failure shared by every service. The dual-sidecar pattern is the same decentralized philosophy applied to the bootstrap problem rather than abandoned at it.

## Implementation details

The dual-OPA pattern is implemented across two layers:

### 1. OPA configuration (Helm chart)

Both OPA containers are configured in the same pod via the Kubernetes deployment:

```yaml
# Primary OPA sidecar
- name: opa-primary
  image: openpolicyagent/opa:<version>
  args:
    - "run"
    - "--server"
    - "--addr=localhost:8181"
    - "--set=decision_logs.console=true"
  volumeMounts:
    - name: opa-bundles-volume
      mountPath: /var/lib/opa

# Bootstrapped OPA sidecar
- name: opa-bootstrap
  image: <your-registry>/opa-bootstrap:latest
  args:
    - "run"
    - "--server"
    - "--addr=localhost:8182"
    - "--set=decision_logs.console=true"
  # This image has the bundle pre-loaded via COPY in the Dockerfile
```

### 2. Client allow logic (shared library)

The shared library that every consumer service includes:

```java
// Simplified: the actual implementation handles timeouts, retries, circuit breaking
public boolean allow(String action, String resourceId) {
    boolean primary = queryOpa(PRIMARY_OPA_URL, action, resourceId);
    if (primary) return true;

    // Fall back to the bootstrapped OPA
    return queryOpa(BOOTSTRAP_OPA_URL, action, resourceId);
}
```

## When this pattern works (and when it doesn't)

**Good fit for:**

- Authorization systems with infrequent policy changes (RBAC updates are weekly or monthly, not continuous)
- Services where availability during cold start matters more than perfect policy fidelity
- Distributed authorization where you already have sidecar-based OPA (the pattern is incremental on top of existing infra)
- Systems where JWT expiration provides an independent emergency revocation mechanism

**Not a good fit for:**

- High-security environments where any window of stale authorization is unacceptable
- Systems with real-time revocation requirements (stock trading platforms, financial transaction processing)
- Environments without a fast, reliable kill switch (JWT timeout, service-level block) to cover the bootstrap window

## What the pattern buys

What you get for one extra container:

- **The bootstrap deadlock is structurally gone.** A pod can always answer an authorization question, because at least one of its two policy sources is guaranteed to have data at startup. The failure mode is not made less likely, it is made unreachable.
- **Negligible latency cost.** The fallback adds roughly a millisecond: one extra loopback HTTP call, and only on the path where the primary returns false. After bundle load, that path is rare.
- **No change to steady-state behavior.** Live bundle polling and propagation work exactly as before. The bootstrapped OPA is purely a cold-start safety net and does nothing once the primary is warm.

## Key takeaway

The bootstrap problem in distributed authorization is a real operational concern that often gets papered over with "just use a central server" or "just wait." The dual-OPA sidecar pattern shows that with a small amount of architectural overhead (one extra container), you can maintain the availability and decentralization benefits of sidecar-based authorization without sacrificing correctness during the most fragile part of a service's lifecycle.

The core insight: **in distributed systems, the bootstrapping path is often the most fragile path.** If you can't authorize yourself, you can't authorize anything.

---

*This pattern comes out of production work on a multi-tenant authorization platform. The write-up is deliberately generic: no employer systems, identifiers, or internal architecture. If you want to talk about the specifics, [email me](mailto:saldanaj27@gmail.com).*
