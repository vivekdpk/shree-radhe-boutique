"""Add optional city to customer records."""
from alembic import op
import sqlalchemy as sa

revision = "0005_customer_city"
down_revision = "0004_order_seed_flag"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("city", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("customers", "city")
