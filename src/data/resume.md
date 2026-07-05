# Abhinav Pola

abhinavpola7@gmail.com · [github.com/abhinavpola](https://github.com/abhinavpola) · [linkedin.com/in/abhinav-pola](https://www.linkedin.com/in/abhinav-pola)

---

## Experience

### OpenRouter.ai — Founding Engineer / Senior Software Engineer
**June 2025 – Present** · Remote

Joined as one of the earlier engineers (~engineer #8, employee #11). These days I work as tech lead for the multimodal platform and provider ecosystem, though at a company this size I end up touching most of the stack.

**Multimodal platform & APIs**
- Worked on OpenRouter's multimodal platform across video, audio, embeddings, rerank, file parsing, and image generation.
- Built VideoG, an API for video generation that sits on top of a fairly fragmented provider landscape, on Cloudflare Workers.
- Built OpenRouter's TTS API.
- Helped the provider-ecosystem team put together dedicated images, rerank, embeddings, and speech-to-text APIs.
- Worked on multimodal inputs (video, PDF, audio): wrote a streaming JSON parser for large Cloudflare Workers payloads that incrementally parses base64-encoded fields and offloads chunks into Durable Objects, which brought OOM errors down from ~0.1% to ~0.0001% of requests.

**Pricing, billing & infra stability**
- Did a refactor to SKU-based pricing so costs could be itemized across modalities with very different billing models.
- Built billing reconciliation, provider monitoring, and anomaly-detection tooling to catch misaccounted usage.
- Worked on infrastructure performance and stability: tail-worker telemetry for pre-OOM profiling, memory-leak diagnosis, and CPU/memory utilization.

**Evals, benchmarking & provider automation**
- Built evals and benchmarking infrastructure, including an in-house benchmarking harness for onboarding external evals (e.g. Terminal-Bench, Deep SWE, SWE Atlas). The harness supports external sandboxes and scales the agent-harness runner (Cloudflare Workers) out massively concurrently.
- Contributed to the "exacto" scoring system.
- Put together the first automations for onboarding providers and endpoints, including running test suites to validate deployments, which brought onboarding time down from hours to minutes.

**Open standards & spec work**
- Collaborated with OpenAI on the Open Responses specification (the spec behind the Responses API). Wrote its validation test suite by auto-generating Zod schemas from the spec.

**Developer velocity & agent infrastructure**
- Built lint rules (including TypeScript GritQL rules converted from recurring AI-PR feedback) so the team could lean on agents more, plus a small benchmarking suite for agents.
- Look after CI/CD and review automation.

---

### Google — Software Engineer
**February 2022 – May 2025** · Mountain View, CA

**YouTube — Developer Experience & Productivity** (~2 years)
- Built infrastructure used for experiments and debugging in production. YouTube is one of the few Google products you can use without signing in, so some bugs only show up for signed-out users.
- Built tooling to reproduce those signed-out bugs under specific experiment flags, and an internal Chrome extension for setting up debugging overrides.
- Built a unified C++ and Java API for managing YouTube debug sessions across observability and experimentation platforms, used by a few hundred monthly active users.

**Google Assistant / Nest — Observability**
- Wrote distributed C++ and Go data pipelines to process defect signals from Nest device logs, and built observability and triage tooling on top of a large centralized log table.
- Built a Java and SQL "culprit finder" that flags potentially problematic experiments and launches using anomaly detection on user-satisfaction metrics.

---

### Supervised Program for Alignment Research (SPAR) — Research Fellow (part-time)
**February 2025 – May 2025**
- Ran automated red-teaming experiments using prompt prefilling, in-context learning, supervised fine-tuning, and reinforcement learning.
- Showed that models can jailbreak their overseers using chain-of-thought reasoning; that work placed first at the Apart Research AI Control Hackathon.
- Open-sourced the jailbreaking experiments and the safety-failure evaluation tooling.

---

### IoT Lab at UIUC — Research Assistant
**April 2020 – August 2020**
- Wrote course material for CS 437 (Internet of Things) at UIUC, used by about a thousand students.
- Built SLAM and A*-based navigation for an autonomous model car using data from a servo-mounted ultrasonic sensor.
- Trained a TensorFlow CNN vision model on a Raspberry Pi camera module for real-time goal detection.

---

## Internships & Early Experience

- Amazon Web Services (AWS) — Intern. Worked on serverless infrastructure for EC2 services; automated some control-plane setup.
- CACI — Intern. Embedded systems role.
- Capital One — Intern.
- Coding4Youth — Intern / Instructor. My first internship; taught kids how to code.

---

## Education

University of Illinois at Urbana-Champaign — B.S. in Computer Science and Astronomy, 2018–2021.

Relevant coursework: Advanced Algorithms, Systems Programming, Advanced Computer Architecture, Formal Verification, Applied Machine Learning, Interactive Computer Graphics (WebGL), Scientific Computing.

---

## Technical Scope

Areas I've spent time in: AI infrastructure, multimodal inference, API gateways, distributed systems, reliability engineering, observability, developer tooling, product engineering.

Languages: TypeScript, C++, Go, Java, SQL, Python.

Platforms & tools: Cloudflare Workers, Durable Objects, Temporal, Datadog, ClickHouse, Trino, Spanner, GCP.
