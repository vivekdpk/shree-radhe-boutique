"""Mark demo-generated orders for safe cleanup."""
from alembic import op
import sqlalchemy as sa

revision = "0004_order_seed_flag"
down_revision = "0003_orders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("seeded", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("orders", "seeded")
