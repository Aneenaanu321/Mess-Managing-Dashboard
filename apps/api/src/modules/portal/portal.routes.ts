import { Router } from "express";
import { portalController } from "./portal.controller";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";

const router = Router();

router.use(authenticate);

// Every route below is customer-scoped (see portal.controller.ts's ctxFrom),
// but reject up front here too — a clearer 403 than letting each handler
// discover the missing customerId on its own, and one place to see the
// whole boundary at a glance.
router.use((req, _res, next) => {
  if (!req.auth?.customerId) return next(ApiError.forbidden("Customer portal access only"));
  next();
});

router.get("/quotations", asyncHandler(portalController.quotations));
router.get("/quotations/:id", asyncHandler(portalController.quotation));

router.get("/purchase-orders", asyncHandler(portalController.purchaseOrders));
router.get("/purchase-orders/:id", asyncHandler(portalController.purchaseOrder));

router.get("/projects", asyncHandler(portalController.projects));
router.get("/projects/:id", asyncHandler(portalController.project));

router.get("/invoices", asyncHandler(portalController.invoices));
router.get("/invoices/:id", asyncHandler(portalController.invoice));

router.get("/support", asyncHandler(portalController.tickets));
router.get("/support/:id", asyncHandler(portalController.ticket));
router.post("/support", asyncHandler(portalController.createTicket));
router.post("/support/:id/comments", asyncHandler(portalController.addTicketComment));

export default router;
