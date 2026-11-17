"""Who is calling. Step 11: verify the Firebase ID token (firebase-admin), create the user on first
login, check the role. Until then every request is a local dev admin."""

from dataclasses import dataclass
from typing import Literal

Role = Literal["admin", "editor", "viewer"]


@dataclass(frozen=True)
class CurrentUser:
    id: str | None
    email: str
    role: Role

    def can_edit(self) -> bool:
        return self.role in ("admin", "editor")


DEV_USER = CurrentUser(id=None, email="dev@localhost", role="admin")
