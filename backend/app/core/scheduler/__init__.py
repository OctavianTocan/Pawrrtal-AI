"""Cron scheduler — fires recurring agent tasks via the event bus.

Wraps APScheduler's ``AsyncIOScheduler`` with a Postgres-backed
``SQLAlchemyJobStore`` so jobs survive restarts.  Each fire publishes
a :class:`ScheduledEvent` to the global event bus; the AgentHandler
(PR 11b) subscribes there and runs the agent turn.

Lifespan:
* Construct + ``await start()`` in the FastAPI lifespan, after the
  event bus.
* ``await stop()`` in the lifespan teardown.

Both are no-ops when ``settings.scheduler_enabled`` is False.
"""

from app.core.scheduler.scheduler import JobScheduler

__all__ = ["JobScheduler"]
