"""Add an auditable payment ledger and preserve existing advances."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006_order_payments"
down_revision = "0005_customer_city"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "order_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("method", sa.String(20), nullable=False, server_default="cash"),
        sa.Column("note", sa.String(300), nullable=True),
        sa.Column("is_opening_balance", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_order_payment_positive"),
        sa.CheckConstraint("method IN ('cash','upi','bank_transfer','card','other')", name="ck_order_payment_method"),
    )
    op.create_index("ix_order_payments_order_id", "order_payments", ["order_id"])
    op.create_index("ix_order_payments_paid_at", "order_payments", ["paid_at"])
    # Historical advance totals have no individual timestamps. Preserve each as a clearly
    # labelled opening entry using the order date; do not fabricate a detailed history.
    op.execute("""
        INSERT INTO order_payments (id, order_id, amount, paid_at, method, note, is_opening_balance, created_at)
        SELECT gen_random_uuid(), id, advance, order_date, 'other',
               'Opening balance imported; original payment history unavailable', TRUE, now()
        FROM orders WHERE advance > 0
    """)


def downgrade() -> None:
    op.drop_index("ix_order_payments_paid_at", table_name="order_payments")
    op.drop_index("ix_order_payments_order_id", table_name="order_payments")
    op.drop_table("order_payments")
