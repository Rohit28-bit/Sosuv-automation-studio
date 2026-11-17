"""Encrypts secrets (passwords, connection strings) before they are stored.

Fernet = AES-128-CBC + HMAC. MultiFernet allows key rotation: put the new key first, old keys after,
and re-encrypt in the background with `rotate()`.
"""

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from sosuv.config import Settings


class SecretCipher:
    def __init__(self, keys: list[str]) -> None:
        if not keys:
            raise ValueError("At least one encryption key is required (SOSUV_ENCRYPTION_KEY)")
        self._fernet = MultiFernet([Fernet(k.encode()) for k in keys])

    @classmethod
    def from_settings(cls, settings: Settings) -> "SecretCipher":
        if settings.encryption_key is None:
            raise ValueError("SOSUV_ENCRYPTION_KEY is not set")
        return cls([k.strip() for k in settings.encryption_key.get_secret_value().split(",") if k.strip()])

    def encrypt(self, plaintext: str) -> bytes:
        return self._fernet.encrypt(plaintext.encode())

    def decrypt(self, token: bytes) -> str:
        try:
            return self._fernet.decrypt(token).decode()
        except InvalidToken as e:
            raise ValueError("Secret could not be decrypted (wrong or rotated key)") from e

    def rotate(self, token: bytes) -> bytes:
        return self._fernet.rotate(token)
