"""
Idempotent seed script for HobbyFi Copilot database.
Today's date context: July 9, 2026.
"""

from datetime import date, datetime
from database import Base, engine, SessionLocal, User, Vendor, Booking, Membership, Trial, Revenue


def seed():
    """Seed the database with initial data. Idempotent — skips if data exists."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Skip seeding if data already exists
        if db.query(User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        # ── Vendors ──────────────────────────────────────────────────────
        vendors = [
            Vendor(id=1, name="Kota Badminton Academy", sport_category="badminton",
                   email="sohammanik15@gmail.com", password="soham123",
                   location="Kota, Rajasthan", portal_since=datetime(2025, 1, 15)),
            Vendor(id=2, name="Zenith Yoga Studio", sport_category="yoga",
                   location="Kota, Rajasthan", portal_since=datetime(2025, 3, 1)),
            Vendor(id=3, name="Champion Football Ground", sport_category="football",
                   location="Kota, Rajasthan", portal_since=datetime(2025, 6, 10)),
        ]
        db.add_all(vendors)
        db.flush()

        # ── Users (15 Indian names) ─────────────────────────────────────
        users = [
            User(id=1,  name="Priya Sharma",     email="priya.sharma@email.com",     phone="9876543210", hobby_preferences="badminton"),
            User(id=2,  name="Rahul Verma",      email="rahul.verma@email.com",      phone="9876543211", hobby_preferences="badminton,yoga"),
            User(id=3,  name="Ananya Gupta",     email="ananya.gupta@email.com",     phone="9876543212", hobby_preferences="badminton"),
            User(id=4,  name="Vikram Singh",     email="vikram.singh@email.com",     phone="9876543213", hobby_preferences="football,badminton"),
            User(id=5,  name="Sneha Patel",      email="sneha.patel@email.com",      phone="9876543214", hobby_preferences="badminton"),
            User(id=6,  name="Arjun Reddy",      email="arjun.reddy@email.com",      phone="9876543215", hobby_preferences="yoga,football"),
            User(id=7,  name="Kavya Nair",       email="kavya.nair@email.com",       phone="9876543216", hobby_preferences="badminton"),
            User(id=8,  name="Rohit Joshi",      email="rohit.joshi@email.com",      phone="9876543217", hobby_preferences="yoga"),
            User(id=9,  name="Meera Iyer",       email="meera.iyer@email.com",       phone="9876543218", hobby_preferences="badminton,yoga"),
            User(id=10, name="Aditya Kumar",     email="aditya.kumar@email.com",     phone="9876543219", hobby_preferences="football"),
            User(id=11, name="Divya Menon",      email="divya.menon@email.com",      phone="9876543220", hobby_preferences="badminton"),
            User(id=12, name="Karthik Rao",      email="karthik.rao@email.com",      phone="9876543221", hobby_preferences="football,badminton"),
            User(id=13, name="Pooja Desai",      email="pooja.desai@email.com",      phone="9876543222", hobby_preferences="badminton"),
            User(id=14, name="Nikhil Chatterjee", email="nikhil.chatterjee@email.com", phone="9876543223", hobby_preferences="yoga,football"),
            User(id=15, name="Ritu Agarwal",     email="ritu.agarwal@email.com",     phone="9876543224", hobby_preferences="badminton,yoga"),
        ]
        db.add_all(users)
        db.flush()

        # ── Trials (8 total: 5 active, 2 expired, 1 converted) ──────────
        trials = [
            Trial(id=1, user_id=1,  vendor_id=1, sport="badminton",
                  start_date=date(2026, 7, 2),  end_date=date(2026, 7, 10), status="active"),
            Trial(id=2, user_id=2,  vendor_id=1, sport="badminton",
                  start_date=date(2026, 7, 3),  end_date=date(2026, 7, 13), status="active"),
            Trial(id=3, user_id=4,  vendor_id=1, sport="badminton",
                  start_date=date(2026, 7, 4),  end_date=date(2026, 7, 14), status="active"),
            Trial(id=4, user_id=6,  vendor_id=1, sport="badminton",
                  start_date=date(2026, 7, 5),  end_date=date(2026, 7, 15), status="active"),
            Trial(id=5, user_id=8,  vendor_id=1, sport="badminton",
                  start_date=date(2026, 7, 6),  end_date=date(2026, 7, 16), status="active"),
            Trial(id=6, user_id=10, vendor_id=1, sport="badminton",
                  start_date=date(2026, 6, 20), end_date=date(2026, 6, 30), status="expired"),
            Trial(id=7, user_id=12, vendor_id=1, sport="badminton",
                  start_date=date(2026, 6, 15), end_date=date(2026, 6, 25), status="expired"),
            Trial(id=8, user_id=14, vendor_id=1, sport="badminton",
                  start_date=date(2026, 6, 1),  end_date=date(2026, 6, 30), status="converted"),
        ]
        db.add_all(trials)
        db.flush()

        # ── Memberships (10 total: 8 active, 1 expired, 1 cancelled) ────
        memberships = [
            Membership(id=1,  user_id=3,  vendor_id=1, plan_type="monthly",
                       start_date=date(2026, 6, 15), end_date=date(2026, 7, 15),
                       status="active", amount_paid=999),
            Membership(id=2,  user_id=5,  vendor_id=1, plan_type="quarterly",
                       start_date=date(2026, 5, 1),  end_date=date(2026, 8, 1),
                       status="active", amount_paid=2499),
            Membership(id=3,  user_id=7,  vendor_id=1, plan_type="annual",
                       start_date=date(2026, 1, 1),  end_date=date(2027, 1, 1),
                       status="active", amount_paid=7999),
            Membership(id=4,  user_id=9,  vendor_id=1, plan_type="monthly",
                       start_date=date(2026, 6, 20), end_date=date(2026, 7, 20),
                       status="active", amount_paid=999),
            Membership(id=5,  user_id=11, vendor_id=1, plan_type="quarterly",
                       start_date=date(2026, 4, 1),  end_date=date(2026, 7, 1),
                       status="active", amount_paid=2499),
            Membership(id=6,  user_id=13, vendor_id=1, plan_type="monthly",
                       start_date=date(2026, 7, 1),  end_date=date(2026, 8, 1),
                       status="active", amount_paid=999),
            Membership(id=7,  user_id=15, vendor_id=1, plan_type="annual",
                       start_date=date(2025, 7, 1),  end_date=date(2026, 7, 1),
                       status="expired", amount_paid=7999),
            Membership(id=8,  user_id=6,  vendor_id=2, plan_type="monthly",
                       start_date=date(2026, 6, 1),  end_date=date(2026, 7, 1),
                       status="active", amount_paid=999),
            Membership(id=9,  user_id=8,  vendor_id=2, plan_type="quarterly",
                       start_date=date(2026, 5, 1),  end_date=date(2026, 8, 1),
                       status="active", amount_paid=2499),
            Membership(id=10, user_id=3,  vendor_id=1, plan_type="monthly",
                       start_date=date(2026, 5, 1),  end_date=date(2026, 6, 1),
                       status="cancelled", amount_paid=999),
        ]
        db.add_all(memberships)
        db.flush()

        # ── Bookings (20 total) ─────────────────────────────────────────
        bookings = [
            # Historical bookings — vendor 1 (Kota Badminton Academy)
            Booking(id=1,  user_id=3,  vendor_id=1, facility="Court A",
                    booking_date=date(2026, 6, 20), slot_time="09:00-10:00",
                    amount=600, status="completed"),
            Booking(id=2,  user_id=5,  vendor_id=1, facility="Court B",
                    booking_date=date(2026, 6, 21), slot_time="10:00-11:00",
                    amount=600, status="completed"),
            Booking(id=3,  user_id=7,  vendor_id=1, facility="Court A",
                    booking_date=date(2026, 6, 25), slot_time="17:00-18:00",
                    amount=600, status="completed"),
            Booking(id=4,  user_id=9,  vendor_id=1, facility="Court B",
                    booking_date=date(2026, 6, 28), slot_time="08:00-09:00",
                    amount=600, status="cancelled"),
            Booking(id=5,  user_id=11, vendor_id=1, facility="Court A",
                    booking_date=date(2026, 7, 1),  slot_time="11:00-12:00",
                    amount=600, status="completed"),
            Booking(id=6,  user_id=13, vendor_id=1, facility="Court B",
                    booking_date=date(2026, 7, 3),  slot_time="09:00-10:00",
                    amount=600, status="confirmed"),
            Booking(id=7,  user_id=15, vendor_id=1, facility="Court A",
                    booking_date=date(2026, 7, 4),  slot_time="16:00-17:00",
                    amount=600, status="completed"),
            Booking(id=8,  user_id=1,  vendor_id=1, facility="Court B",
                    booking_date=date(2026, 7, 5),  slot_time="10:00-11:00",
                    amount=600, status="confirmed"),
            Booking(id=9,  user_id=2,  vendor_id=1, facility="Court A",
                    booking_date=date(2026, 7, 6),  slot_time="14:00-15:00",
                    amount=450, status="completed"),
            Booking(id=10, user_id=4,  vendor_id=1, facility="Court B",
                    booking_date=date(2026, 7, 7),  slot_time="18:00-19:00",
                    amount=450, status="confirmed"),
            # Historical bookings — vendor 2 (Zenith Yoga Studio)
            Booking(id=11, user_id=6,  vendor_id=2, facility="Studio 1",
                    booking_date=date(2026, 6, 22), slot_time="06:00-07:00",
                    amount=300, status="completed"),
            Booking(id=12, user_id=8,  vendor_id=2, facility="Studio 2",
                    booking_date=date(2026, 6, 26), slot_time="07:00-08:00",
                    amount=300, status="completed"),
            Booking(id=13, user_id=14, vendor_id=2, facility="Studio 1",
                    booking_date=date(2026, 7, 2),  slot_time="06:00-07:00",
                    amount=300, status="confirmed"),
            Booking(id=14, user_id=6,  vendor_id=2, facility="Studio 2",
                    booking_date=date(2026, 7, 5),  slot_time="18:00-19:00",
                    amount=150, status="cancelled"),
            # Historical bookings — vendor 3 (Champion Football Ground)
            Booking(id=15, user_id=10, vendor_id=3, facility="Ground A",
                    booking_date=date(2026, 6, 23), slot_time="16:00-17:00",
                    amount=500, status="completed"),
            Booking(id=16, user_id=12, vendor_id=3, facility="Ground A",
                    booking_date=date(2026, 7, 1),  slot_time="17:00-18:00",
                    amount=500, status="confirmed"),
            Booking(id=17, user_id=4,  vendor_id=3, facility="Ground A",
                    booking_date=date(2026, 7, 8),  slot_time="15:00-16:00",
                    amount=500, status="confirmed"),
            # Today's bookings — vendor 1, 2026-07-09, total = 1800
            Booking(id=18, user_id=5,  vendor_id=1, facility="Court A",
                    booking_date=date(2026, 7, 9),  slot_time="09:00-10:00",
                    amount=600, status="confirmed"),
            Booking(id=19, user_id=7,  vendor_id=1, facility="Court B",
                    booking_date=date(2026, 7, 9),  slot_time="11:00-12:00",
                    amount=600, status="confirmed"),
            Booking(id=20, user_id=9,  vendor_id=1, facility="Court A",
                    booking_date=date(2026, 7, 9),  slot_time="17:00-18:00",
                    amount=600, status="confirmed"),
        ]
        db.add_all(bookings)
        db.flush()

        # ── Revenue (vendor_id=1, July 3-9 2026) ────────────────────────
        revenue_rows = [
            Revenue(vendor_id=1, date=date(2026, 7, 3),
                    bookings_revenue=1800, membership_revenue=2499, total_revenue=4299),
            Revenue(vendor_id=1, date=date(2026, 7, 4),
                    bookings_revenue=600,  membership_revenue=7999, total_revenue=8599),
            Revenue(vendor_id=1, date=date(2026, 7, 5),
                    bookings_revenue=2400, membership_revenue=999,  total_revenue=3399),
            Revenue(vendor_id=1, date=date(2026, 7, 6),
                    bookings_revenue=900,  membership_revenue=0,    total_revenue=900),
            Revenue(vendor_id=1, date=date(2026, 7, 7),
                    bookings_revenue=1500, membership_revenue=2499, total_revenue=3999),
            Revenue(vendor_id=1, date=date(2026, 7, 8),
                    bookings_revenue=2100, membership_revenue=999,  total_revenue=3099),
            Revenue(vendor_id=1, date=date(2026, 7, 9),
                    bookings_revenue=1800, membership_revenue=2999, total_revenue=4799),
        ]
        db.add_all(revenue_rows)

        db.commit()
        print("Database seeded successfully with all data.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
