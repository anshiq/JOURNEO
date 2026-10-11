from procrastinate import JobContext, RetryStrategy

from app.core import db
from app.core.tasks import task_app


class WebhookNotDelivered(Exception):
    pass


@task_app.task(
    name="leads.deliver_webhook",
    queue="webhooks",
    pass_context=True,
    retry=RetryStrategy(max_attempts=6, exponential_wait=5, retry_exceptions={WebhookNotDelivered}),
)
async def deliver_webhook(context: JobContext, lead_id: str) -> None:
    from app.modules.leads import service

    attempt = (context.job.attempts if context.job else 0) + 1
    async with db.session_scope() as session:
        delivered = await service.deliver_lead(session, lead_id, attempt)
    if not delivered:
        raise WebhookNotDelivered(lead_id)
