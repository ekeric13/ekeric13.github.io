(function (root, factory) {
  const api = factory();
  root.CareerStompMessages = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const messages = [
    {
      id: "intuit-expert-matching",
      kicker: "Intuit",
      title: "AI for expert matching",
      body: "Built and led a platform that matched customers to support experts using transcript analysis, embeddings, and agentic workflows.",
    },
    {
      id: "intuit-agent-gateway",
      kicker: "Intuit",
      title: "A gateway for AI agents",
      body: "Led a hosted gateway for domain agents covering onboarding, expert availability, routing rules, and enterprise permissions.",
    },
    {
      id: "intuit-agent-harness",
      kicker: "Intuit",
      title: "One shared agent harness",
      body: "Built reusable agent runtime, access control, tool integration, and collaborative sessions across web UI, Slack, Claude Code, and service APIs.",
    },
    {
      id: "intuit-byop",
      kicker: "Intuit",
      title: "Bring Your Own Prompt",
      body: "Built a transcript analysis platform that let any organization member run arbitrary LLM queries over thousands of customer conversations.",
    },
    {
      id: "intuit-obs-as-code",
      kicker: "Intuit",
      title: "Observability as code",
      body: "Led an internal Terraform-style provider for Splunk so alerts lived beside application code and worked naturally with code generation and deploys.",
    },
    {
      id: "intuit-memory-leak",
      kicker: "Intuit",
      title: "Traced a failure across four systems",
      body: "Diagnosed a nightly heap OOM that killed a log consumer, deadlocked a blocking queue, and left a pod requiring manual intervention.",
    },
    {
      id: "intuit-graceful-shutdown",
      kicker: "Intuit",
      title: "Shutdown without data corruption",
      body: "Root-caused the failure with heap dumps, thread dumps, and Prometheus metrics. Added graceful shutdown and rollback for Kubernetes SIGTERM signals.",
    },
    {
      id: "anime-product",
      kicker: "AnimePics",
      title: "A GenAI product from zero to one",
      body: "Founded AnimePics so people could transform their photos into anime illustrations using custom diffusion models.",
    },
    {
      id: "anime-frontend",
      kicker: "AnimePics",
      title: "Mobile-first product frontend",
      body: "Built the frontend with TypeScript, Next.js, Tailwind, Zustand, and React Query.",
    },
    {
      id: "anime-backend",
      kicker: "AnimePics",
      title: "Python backend from scratch",
      body: "Built the backend with Starlite and SQLAlchemy, using Postgres and S3 for persistence and Redis for caching.",
    },
    {
      id: "anime-gpu-pipeline",
      kicker: "AnimePics",
      title: "Async GPU job delivery",
      body: "Used Kafka to coordinate cloud GPU servers running PyTorch jobs, then delivered generated media back to customers.",
    },
    {
      id: "anime-commerce",
      kicker: "AnimePics",
      title: "Media and payments",
      body: "Integrated Cloudinary for media management and Stripe for checkout and payments.",
    },
    {
      id: "anime-auth",
      kicker: "AnimePics",
      title: "Flexible customer authentication",
      body: "Supported Google OAuth, Apple OAuth, passwordless email, and guest checkout.",
    },
    {
      id: "ethos-scale",
      kicker: "Ethos",
      title: "From three engineers to 100+",
      body: "Joined at Series A and built foundations that helped Ethos reach a $2B+ valuation, $50 million ARR, and more than 100 engineers.",
    },
    {
      id: "ethos-mentorship",
      kicker: "Ethos",
      title: "Staff-level technical leadership",
      body: "Reached the highest individual-contributor level and mentored engineers who went on to become engineering managers.",
    },
    {
      id: "ethos-kubernetes",
      kicker: "Ethos",
      title: "ECS to Kubernetes with no downtime",
      body: "Migrated the stack from ECS to Kubernetes with 100% uptime and added Datadog observability during the same initiative.",
    },
    {
      id: "ethos-postgres",
      kicker: "Ethos",
      title: "MongoDB to Postgres",
      body: "Moved the stack from MongoDB to Postgres, replacing schema-on-read with stronger constraints and transactional controller logic.",
    },
    {
      id: "ethos-deploys",
      kicker: "Ethos",
      title: "Deploys from five hours to five minutes",
      body: "Built a Go deploy service and React UI connecting GitHub Actions, ECR, pull requests, Kubernetes, and Argo CD.",
    },
    {
      id: "ethos-event-evolution",
      kicker: "Ethos",
      title: "Three generations of eventing",
      body: "Evolved the event system from SQS to Postgres CDC with SNS and JSON Schema, then to Debezium, Kafka, and Avro.",
    },
    {
      id: "ethos-event-scale",
      kicker: "Ethos",
      title: "50,000+ events per day",
      body: "Built and operated a Kafka event bus that handled more than 50,000 domain events each day.",
    },
    {
      id: "ethos-domains",
      kicker: "Ethos",
      title: "Boundaries before microservices",
      body: "Identified product domain boundaries, documented the architecture with ERDs, and oversaw the monolith-to-services implementation.",
    },
    {
      id: "ethos-kube-services",
      kicker: "Ethos",
      title: "20+ Kubernetes services",
      body: "Created more than 20 Kubernetes services, including deployments, services, ingresses, ConfigMaps, and Argo CD applications.",
    },
    {
      id: "ethos-caching",
      kicker: "Ethos",
      title: "Caching across the stack",
      body: "Added frontend caching with Redux-Saga and backend caching with Redis middleware to improve product performance.",
    },
    {
      id: "ethos-subdomains",
      kicker: "Ethos",
      title: "Applications across subdomains",
      body: "Updated frontend and backend services to handle CORS and cookies correctly across subdomains.",
    },
    {
      id: "ethos-cdn-operator",
      kicker: "Ethos",
      title: "CDN invalidation by operator",
      body: "Created a Kubernetes operator that invalidated the CDN when images changed on selected deployments.",
    },
    {
      id: "ethos-nginx",
      kicker: "Ethos",
      title: "Faster assets through Nginx",
      body: "Configured Nginx to cache frontend assets and reduced unnecessary Kubernetes ingress redirects.",
    },
    {
      id: "ethos-persistence",
      kicker: "Ethos",
      title: "Owned the persistence layer",
      body: "Owned RDS Postgres, database monitors, point-in-time snapshots, reserved instances, replication, Terraform modules, extensions, and pganalyze.",
    },
    {
      id: "ethos-data-modeling",
      kicker: "Ethos",
      title: "Data models built to migrate",
      body: "Replaced polymorphic relations with an exclusive arc, shipped no-downtime migrations, and integrated query builders for Node.js and Go.",
    },
    {
      id: "ethos-query-recovery",
      kicker: "Ethos",
      title: "Four hours became five seconds",
      body: "Fixed an exponential database query that disrupted payments for days, reducing its runtime from four hours to five seconds.",
    },
  ].map((message) => Object.freeze(message));

  function createDeck(random) {
    const randomValue = random || Math.random;
    let queue = [];
    let cycle = 0;
    let lastId = null;

    function reshuffle() {
      queue = messages.slice();
      for (let index = queue.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(randomValue() * (index + 1));
        [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
      }
      if (queue.length > 1 && queue[0].id === lastId) [queue[0], queue[1]] = [queue[1], queue[0]];
      cycle += 1;
    }

    return {
      next() {
        if (queue.length === 0) reshuffle();
        const message = queue.shift();
        lastId = message.id;
        return message;
      },
      getState() {
        return { total: messages.length, remaining: queue.length, cycle, lastId };
      },
    };
  }

  return Object.freeze({ messages: Object.freeze(messages), createDeck });
});
