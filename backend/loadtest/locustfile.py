import os
import random
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from locust import HttpUser, between, task
from locust.exception import StopUser

ADMIN_EMAIL = os.getenv("LOADTEST_EMAIL", "loadtest-admin@loadtest.invalid")
ADMIN_PASSWORD = os.getenv("LOADTEST_PASSWORD", "")
SEARCH_WORDS = ["notice", "exam", "fees", "LOADTEST", "Item 5", "login"]
AUDIT_ACTIONS = ["notice.create", "notice.update", "event.create", "user.update", "auth.login"]


class Visitor(HttpUser):
    weight = 20
    wait_time = between(2, 8)

    def on_start(self):
        self.notice_ids = []
        self.event_ids = []

    @task(6)
    def open_home(self):
        attachment_ids = []

        with self.client.get("/notices/", name="GET /notices/", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.notice_ids = [notice["id"] for notice in data]
                for notice in data[:9]:
                    for attachment in notice.get("attachments", []):
                        attachment_ids.append(attachment["id"])

        with self.client.get(
            "/events/upcoming?limit=13", name="GET /events/upcoming", catch_response=True
        ) as response:
            if response.status_code == 200:
                self.event_ids = [event["id"] for event in response.json()]

        for attachment_id in attachment_ids[:6]:
            with self.client.get(
                f"/attachments/{attachment_id}/thumbnail",
                name="GET /attachments/[id]/thumbnail",
                catch_response=True,
            ) as response:
                if response.status_code == 404:
                    response.success()

    @task(4)
    def read_notice(self):
        if not self.notice_ids:
            return
        notice_id = random.choice(self.notice_ids)
        self.client.get(f"/notices/{notice_id}", name="GET /notices/[id]")

    @task(1)
    def read_event(self):
        if not self.event_ids:
            return
        event_id = random.choice(self.event_ids)
        self.client.get(f"/events/{event_id}", name="GET /events/[id]")


class Admin(HttpUser):
    weight = 1
    wait_time = between(3, 10)

    def on_start(self):
        if not ADMIN_PASSWORD:
            raise StopUser()
        self.login()

    def login(self):
        ok = False
        with self.client.post(
            "/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            name="POST /auth/login",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                ok = True
            else:
                response.failure(f"login failed: {response.status_code}")
        if not ok:
            raise StopUser()

    def call(self, path, name):
        expired = False
        with self.client.get(path, name=name, catch_response=True) as response:
            if response.status_code == 401:
                response.failure("session expired")
                expired = True
        if expired:
            self.login()

    @task(5)
    def sidebar_counts(self):
        self.call("/notices/pending/count", "GET /notices/pending/count")
        self.call("/events/pending/count", "GET /events/pending/count")

    @task(3)
    def notification_poll(self):
        self.call("/notifications/unread-count", "GET /notifications/unread-count")

    @task(2)
    def dashboard(self):
        self.call("/notices/mine/counts", "GET /notices/mine/counts")
        self.call("/events/mine/counts", "GET /events/mine/counts")
        self.call("/notices/all/counts", "GET /notices/all/counts")
        self.call("/events/all/counts", "GET /events/all/counts")
        self.call("/audit-logs/?limit=6", "GET /audit-logs/ (recent)")

    @task(2)
    def review_queue(self):
        self.call("/notices/pending?limit=20&offset=0", "GET /notices/pending")
        self.call("/events/pending?limit=20&offset=0", "GET /events/pending")

    @task(2)
    def all_notices(self):
        word = quote(random.choice(SEARCH_WORDS))
        self.call("/notices/all?limit=20&offset=0", "GET /notices/all")
        self.call(f"/notices/all?limit=20&offset=0&search={word}", "GET /notices/all (search)")

    @task(1)
    def audit_search(self):
        now = datetime.now(timezone.utc)
        date_from = (now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        action = random.choice(AUDIT_ACTIONS)
        word = quote(random.choice(SEARCH_WORDS))
        self.call("/audit-logs/meta", "GET /audit-logs/meta")
        self.call(
            f"/audit-logs/?limit=25&action={action}&date_from={date_from}",
            "GET /audit-logs/ (action + date)",
        )
        self.call(f"/audit-logs/?limit=25&search={word}", "GET /audit-logs/ (search)")

    @task(1)
    def user_list(self):
        self.call("/users/?limit=20&offset=0", "GET /users/")