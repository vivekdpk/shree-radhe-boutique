"""Persist one shared theme for the public website and admin app."""
from alembic import op
import sqlalchemy as sa

revision = "0008_shared_site_theme"
down_revision = "0007_public_inquiries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_settings",
        sa.Column("key", sa.String(80), primary_key=True),
        sa.Column("value", sa.String(100), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute("INSERT INTO site_settings (key, value, updated_at) VALUES ('theme', 'forest', now())")


def downgrade() -> None:
    op.drop_table("site_settings")
