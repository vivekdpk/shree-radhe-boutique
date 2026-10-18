"""Add tailoring orders and order number sequence."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_orders"
down_revision = "0002_customer_gender"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE order_number_seq START 1")
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(24), nullable=False, unique=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("measurement_record_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("measurement_records.id"), nullable=True),
        sa.Column("garment_name", sa.String(120), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column("order_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("advance", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('new','in_progress','ready','delivered','cancelled')", name="ck_order_status"),
        sa.CheckConstraint("price >= 0 AND advance >= 0 AND advance <= price", name="ck_order_amounts"),
    )
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_due_date", "orders", ["due_date"])


def downgrade() -> None:
    op.drop_index("ix_orders_due_date", table_name="orders")
    op.drop_index("ix_orders_customer_id", table_name="orders")
    op.drop_table("orders")
    op.execute("DROP SEQUENCE order_number_seq")
