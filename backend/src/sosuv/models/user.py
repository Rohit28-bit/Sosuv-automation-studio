"""Users, created on first Firebase login."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from sosuv.db.base import Base, Timestamps, UUIDPrimaryKey


class User(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "users"

    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    role: Mapped[str] = mapped_column(String(20), default="viewer")  # admin | editor | viewer
