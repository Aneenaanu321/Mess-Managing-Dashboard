import { Request, Response } from "express";
import { portalService } from "./portal.service";
import { createPortalTicketSchema, createPortalTicketCommentSchema } from "./portal.validation";
import { ApiError } from "../../utils/ApiError";
import { requireParam } from "../../utils/assert";

function ctxFrom(req: Request) {
  if (!req.auth?.customerId) throw ApiError.forbidden("Customer portal access only");
  return { companyId: req.auth.companyId, customerId: req.auth.customerId, userId: req.auth.sub };
}

export const portalController = {
  async quotations(req: Request, res: Response) {
    res.json({ success: true, data: await portalService.listQuotations(ctxFrom(req)) });
  },
  async quotation(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    res.json({ success: true, data: await portalService.getQuotation(ctxFrom(req), id) });
  },

  async purchaseOrders(req: Request, res: Response) {
    res.json({ success: true, data: await portalService.listPurchaseOrders(ctxFrom(req)) });
  },
  async purchaseOrder(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    res.json({ success: true, data: await portalService.getPurchaseOrder(ctxFrom(req), id) });
  },

  async projects(req: Request, res: Response) {
    res.json({ success: true, data: await portalService.listProjects(ctxFrom(req)) });
  },
  async project(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    res.json({ success: true, data: await portalService.getProject(ctxFrom(req), id) });
  },

  async invoices(req: Request, res: Response) {
    res.json({ success: true, data: await portalService.listInvoices(ctxFrom(req)) });
  },
  async invoice(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    res.json({ success: true, data: await portalService.getInvoice(ctxFrom(req), id) });
  },

  async tickets(req: Request, res: Response) {
    res.json({ success: true, data: await portalService.listTickets(ctxFrom(req)) });
  },
  async ticket(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    res.json({ success: true, data: await portalService.getTicket(ctxFrom(req), id) });
  },
  async createTicket(req: Request, res: Response) {
    const input = createPortalTicketSchema.parse(req.body);
    const ticket = await portalService.createTicket(ctxFrom(req), input);
    res.status(201).json({ success: true, data: ticket });
  },
  async addTicketComment(req: Request, res: Response) {
    const id = requireParam(req.params.id, "id");
    const input = createPortalTicketCommentSchema.parse(req.body);
    const comment = await portalService.addTicketComment(ctxFrom(req), id, input);
    res.status(201).json({ success: true, data: comment });
  },
};
