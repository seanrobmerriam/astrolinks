declare namespace App {
  interface Locals {
    /** Dashboard config loaded by src/middleware.ts for page requests. */
    dashboard: import("./lib/schema").DashboardData;
    /** Latest automatic check results, keyed by service id (see src/lib/health.ts). */
    health: Record<string, import("./lib/health").HealthResult>;
  }
}
