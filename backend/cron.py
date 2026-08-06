import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from sqlalchemy import text
from datetime import datetime
from database import SessionLocal, Vendor

async def generate_insights():
    """Nightly job to generate proactive insights for all vendors."""
    print(f"[{datetime.now()}] Running nightly insights generation...")
    async with SessionLocal() as db:
        result = await db.execute(select(Vendor))
        vendors = result.scalars().all()
        for vendor in vendors:
            # In a real system, we'd save this to an 'Insights' table.
            # Here we just log it to demonstrate the proactive agent.
            print(f"Generating insights for Vendor ID {vendor.id} ({vendor.name})...")
            # Example query
            # today_str = datetime.now().strftime("%Y-%m-%d")
            # ...
    print("Insights generation complete.")

def start_cron():
    scheduler = AsyncIOScheduler()
    # Run every night at 2 AM
    scheduler.add_job(generate_insights, 'cron', hour=2, minute=0)
    scheduler.start()
    print("Started background cron jobs.")

if __name__ == "__main__":
    asyncio.run(generate_insights())
