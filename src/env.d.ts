declare namespace App {
  interface Locals {
    /** Dashboard config loaded by src/middleware.ts for page requests. */
    dashboard: import("./lib/schema").DashboardData;
  }
}
