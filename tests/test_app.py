import copy
from fastapi.testclient import TestClient

from src import app as app_module


client = TestClient(app_module.app)


def setup_function():
    # Backup activities so tests don't permanently mutate global state
    app_module._activities_backup = copy.deepcopy(app_module.activities)


def teardown_function():
    # Restore original activities
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(app_module._activities_backup))


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_unregister_flow():
    activity = "Basketball Team"
    email = "test.user@example.com"

    # ensure not present
    res = client.get("/activities")
    assert res.status_code == 200
    participants = res.json()[activity]["participants"]
    assert email not in participants

    # sign up
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert "Signed up" in res.json().get("message", "")

    # now present
    res = client.get("/activities")
    assert email in res.json()[activity]["participants"]

    # unregister
    res = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res.status_code == 200
    assert "Unregistered" in res.json().get("message", "")

    # no longer present
    res = client.get("/activities")
    assert email not in res.json()[activity]["participants"]


def test_unregister_nonexistent_participant():
    activity = "Chess Club"
    email = "nonexistent@example.com"
    res = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res.status_code == 404


def test_unregister_nonexistent_activity():
    activity = "No Such Activity"
    email = "someone@example.com"
    res = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res.status_code == 404
