import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import leadRoutes from "./modules/leads/lead.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import projectRoutes from "./modules/projects/project.routes";
import installationRoutes from "./modules/installations/installation.routes";
import deviceRoutes from "./modules/devices/device.routes";
import taskRoutes from "./modules/tasks/task.routes";
import financeRoutes from "./modules/finance/finance.routes";
import supportRoutes from "./modules/support/support.routes";
import amcRoutes from "./modules/amc/amc.routes";
import customerPORoutes from "./modules/purchase-orders/customerPO.routes";
import salesOrderRoutes from "./modules/sales-orders/salesOrder.routes";
import campaignRoutes from "./modules/campaigns/campaign.routes";
import calendarRoutes from "./modules/calendar/calendar.routes";
import approvalRoutes from "./modules/approvals/approval.routes";
import activityRoutes from "./modules/activities/activity.routes";
import presalesRoutes from "./modules/presales/presales.routes";
import fileRoutes from "./modules/files/file.routes";
import publicRoutes from "./modules/public/public.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import warehouseRoutes from "./modules/warehouse/warehouse.routes";
import procurementRoutes from "./modules/procurement/procurement.routes";
import customerRoutes from "./modules/customers/customer.routes";
import opportunityRoutes from "./modules/opportunities/opportunity.routes";
import quotationRoutes from "./modules/quotations/quotation.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import aiRoutes from "./modules/ai/ai.routes";
import settingsRoutes from "./modules/settings/settings.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

  // General API rate limit; auth routes apply their own tighter limiter on top of this.
  app.use(rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (_req, res) => res.json({ status: "ok", env: env.NODE_ENV }));

  const v1 = express.Router();
  v1.use("/auth", authRoutes);
  v1.use("/leads", leadRoutes);
  v1.use("/notifications", notificationRoutes);
  v1.use("/customers", customerRoutes);
  v1.use("/opportunities", opportunityRoutes);
  v1.use("/quotations", quotationRoutes);
  v1.use("/purchase-orders", customerPORoutes);
  v1.use("/sales-orders", salesOrderRoutes);
  v1.use("/campaigns", campaignRoutes);
  v1.use("/calendar", calendarRoutes);
  v1.use("/approvals", approvalRoutes);
  v1.use("/activities", activityRoutes);
  v1.use("/presales", presalesRoutes);
  v1.use("/files", fileRoutes);
  v1.use("/public", publicRoutes);
  v1.use("/inventory", inventoryRoutes);
  v1.use("/warehouse", warehouseRoutes);
  v1.use("/procurement", procurementRoutes);
  v1.use("/dashboard", dashboardRoutes);
  v1.use("/reports", reportsRoutes);
  v1.use("/ai", aiRoutes);
  v1.use("/settings", settingsRoutes);
  v1.use("/projects", projectRoutes);
  v1.use("/installations", installationRoutes);
  v1.use("/devices", deviceRoutes);
  v1.use("/tasks", taskRoutes);
  v1.use("/finance", financeRoutes);
  v1.use("/support", supportRoutes);
  v1.use("/amc", amcRoutes);
  // Modules land here incrementally: sales-orders — following the same
  // routes/controller/service/repository/validation pattern established by
  // modules/leads.

  app.use("/api/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
