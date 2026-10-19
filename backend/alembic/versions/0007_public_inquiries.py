"""Store customer enquiries submitted from the public website."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007_public_inquiries"
down_revision = "0006_order_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inquiries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('new','read','archived')", name="ck_inquiry_status"),
    )
    op.create_index("ix_inquiries_status", "inquiries", ["status"])
    op.create_index("ix_inquiries_created_at", "inquiries", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_inquiries_created_at", table_name="inquiries")
    op.drop_index("ix_inquiries_status", table_name="inquiries")
    op.drop_table("inquiries")
