from procrastinate import App, PsycopgConnector

from app.core.config import get_settings

TASK_MODULES = [
    "app.modules.models_registry",
    "app.modules.leads.tasks",
    "app.modules.ai.tasks",
    "app.modules.assistant.tasks",
    "app.modules.journeys.tasks",
    "app.modules.runtime.tasks",
]


def make_connector(dsn: str) -> PsycopgConnector:
    return PsycopgConnector(conninfo=dsn, min_size=1, max_size=4)


task_app = App(connector=make_connector(get_settings().database_dsn), import_paths=TASK_MODULES)
