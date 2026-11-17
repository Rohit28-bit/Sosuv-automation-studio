"""Saved connections / credentials, encrypted at rest (security/crypto.py).

The plain value is never returned by the API; only workers decrypt it, right before a node runs.
"""

from sqlalchemy import LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from sosuv.db.base import Base, Timestamps, UUIDPrimaryKey


class Secret(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "secrets"

    name: Mapped[str] = mapped_column(String(200), unique=True)
    kind: Mapped[str] = mapped_column(String(50), default="generic")  # e.g. sftp, postgres, api_key
    encrypted_value: Mapped[bytes] = mapped_column(LargeBinary)
