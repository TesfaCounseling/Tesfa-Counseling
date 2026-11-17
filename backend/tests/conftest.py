import pytest

from app import create_app


@pytest.fixture()
def app():
    application = create_app()
    application.config.update(TESTING=True)
    yield application


@pytest.fixture()
def app_ctx(app):
    with app.app_context():
        yield app


@pytest.fixture()
def client(app):
    return app.test_client()
