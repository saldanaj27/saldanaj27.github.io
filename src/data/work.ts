export interface WorkEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  metric: string;
  featured: boolean;
}

export const work: WorkEntry[] = [
  {
    slug: 'kubernetes-rbac-operator',
    title: 'Kubernetes RBAC Operator',
    description:
      'A custom operator that turned two-hour manual RBAC provisioning into declarative configuration that maintains itself.',
    tags: ['java-operator-sdk', 'kubernetes', 'grpc'],
    metric: '2h → ~8min provisioning',
    featured: true,
  },
  {
    slug: 'authorization-platform',
    title: 'Authorization Platform',
    description:
      'OPA policy bundles distributed to every service, so authorization is a sub-millisecond local decision with no central server.',
    tags: ['opa', 'rego', 'distributed-systems'],
    metric: '30+ consuming services',
    featured: true,
  },
  {
    slug: 'authentication-platform',
    title: 'Authentication Platform',
    description:
      'The authentication management layer for a financial-services platform: a stateless gRPC facade over the identity provider, with declarative credential provisioning.',
    tags: ['spring-boot', 'grpc', 'oauth2-oidc'],
    metric: '1M+ daily auth requests',
    featured: false,
  },
  {
    slug: 'ai-sdlc-workflow',
    title: 'AI-Assisted SDLC Workflow',
    description:
      'A multi-agent pipeline that takes a Jira ticket to a reviewable pull request inside a production CI/CD gate, with humans keeping final authority.',
    tags: ['multi-agent', 'ci-cd', 'llm'],
    metric: 'in production',
    featured: false,
  },
];
