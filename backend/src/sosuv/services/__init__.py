"""Business logic (use cases). Called by API routes AND by workers/scheduler, so it never touches HTTP.

Each service takes an AsyncSession; the caller owns the transaction (db.session()).
"""
