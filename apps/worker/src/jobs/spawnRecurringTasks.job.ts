import { prisma } from "../config/prisma";
import { notify } from "../notify";

function bumpNextRunAt(from: Date, cadence: string): Date {
  const next = new Date(from);
  if (cadence === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else if (cadence === "BIWEEKLY") next.setDate(next.getDate() + 14);
  else next.setDate(next.getDate() + 7);
  return next;
}

function defaultSopChecklist(jobType: string) {
  // Minimal empty structure — API merge fills defaults on read; keep spawn light.
  return {
    preDay: {},
    warehouse: {},
    visit: {},
    docs: {},
    eod: {},
    _jobType: jobType,
  };
}

/**
 * Spawns the next occurrence for each due TaskRecurrence template.
 * Runs daily; safe to re-run (advances nextRunAt after create).
 */
export async function runSpawnRecurringTasks() {
  const now = new Date();
  const due = await prisma.taskRecurrence.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    take: 200,
  });

  let spawned = 0;

  for (const template of due) {
    const task = await prisma.engineerTask.create({
      data: {
        companyId: template.companyId,
        title: template.title,
        description: template.description,
        jobType: template.jobType,
        dueDate: template.nextRunAt,
        sopChecklist: defaultSopChecklist(template.jobType),
        ...(template.assigneeId ? { assigneeId: template.assigneeId } : {}),
        ...(template.projectId ? { projectId: template.projectId } : {}),
        ...(template.salesOrderId ? { salesOrderId: template.salesOrderId } : {}),
        ...(template.customerPoId ? { customerPoId: template.customerPoId } : {}),
        ...(template.invoiceId ? { invoiceId: template.invoiceId } : {}),
        ...(template.createdById ? { createdById: template.createdById } : {}),
        recurrenceId: template.id,
      },
    });

    await prisma.taskRecurrence.update({
      where: { id: template.id },
      data: { nextRunAt: bumpNextRunAt(template.nextRunAt, template.cadence) },
    });

    if (template.assigneeId) {
      await notify({
        userId: template.assigneeId,
        type: "ASSIGNMENT",
        title: "Recurring job assigned",
        body: `A scheduled job was created: "${template.title}".`,
        link: `/team-tasks/${task.id}`,
      });
    }

    spawned++;
  }

  return { due: due.length, spawned };
}
