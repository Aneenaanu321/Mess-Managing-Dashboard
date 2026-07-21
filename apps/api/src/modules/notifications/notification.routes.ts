import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/asyncHandler";
import { notificationService } from "./notification.service";
import { requireParam } from "../../utils/assert";

const router = Router();
router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const items = await notificationService.list(req.auth!.sub, unreadOnly);
  res.json({ success: true, data: items });
}));

router.get("/unread-count", asyncHandler(async (req, res) => {
  const count = await notificationService.countUnread(req.auth!.sub);
  res.json({ success: true, data: { count } });
}));

router.post("/:id/read", asyncHandler(async (req, res) => {
  const id = requireParam(req.params.id, "id");
  await notificationService.markRead(req.auth!.sub, id);
  res.json({ success: true, data: null });
}));

router.post("/read-all", asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.auth!.sub);
  res.json({ success: true, data: null });
}));

export default router;
