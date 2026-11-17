import pytest

from app import create_app
from app.extensions import db


@pytest.fixture()
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'tesfa-test.db'}")
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.delenv("FLASK_ENV", raising=False)
    application = create_app()
    application.config.update(TESTING=True)
    with application.app_context():
        db.create_all()
    yield application


@pytest.fixture()
def app_ctx(app):
    with app.app_context():
        yield app


@pytest.fixture()
def client(app):
    return app.test_client()
