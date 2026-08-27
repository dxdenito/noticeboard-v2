from app.models.notice import Audience


def verify_institutional_email(email: str) -> Audience | None:
    email = email.strip().lower()

    if email.endswith("@students.jkuat.ac.ke"):
        return Audience.STUDENT
    if email.endswith("@jkuat.ac.ke"):
        return Audience.STAFF

    return None