"""Add customer gender and seeded flag."""
from alembic import op
import sqlalchemy as sa

revision = "0002_customer_gender"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("gender", sa.String(10), nullable=True))
    op.execute("UPDATE customers SET gender = 'female' WHERE gender IS NULL")
    op.alter_column("customers", "gender", existing_type=sa.String(10), nullable=False)
    op.create_check_constraint(
        "ck_customer_gender",
        "customers",
        "gender IN ('female','male')",
    )
    op.create_index("ix_customers_gender", "customers", ["gender"])
    op.add_column(
        "customers",
        sa.Column("seeded", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("customers", "seeded")
    op.drop_index("ix_customers_gender", table_name="customers")
    op.drop_constraint("ck_customer_gender", "customers", type_="check")
    op.drop_column("customers", "gender")
