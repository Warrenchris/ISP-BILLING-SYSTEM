"""
seed_generator.py
Generates realistic 6-month ISP historical data → isp_seed.sql
Run: python seed_generator.py
Then: docker exec -i isp-db mysql -u root -proot isp_billing_db < isp_seed.sql
"""

import random, uuid, math
from datetime import datetime, timedelta

random.seed(42)

# ── helpers ───────────────────────────────────────────────────────────────────
def uid(): return str(uuid.uuid4())
def q(v):
    if v is None: return "NULL"
    s = str(v).replace("'", "''")
    return f"'{s}'"
def dt(d): return q(d.strftime("%Y-%m-%d %H:%M:%S"))
def esc(d): return d.strftime("%Y-%m-%d %H:%M:%S")

NOW   = datetime(2026, 5, 14, 12, 0, 0)
START = NOW - timedelta(days=183)   # ~6 months ago

def rand_dt(a, b):
    delta = int((b - a).total_seconds())
    return a + timedelta(seconds=random.randint(0, max(delta,1)))

BCRYPT_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TdmEL6G5bTz/Ry5NKvxNXEGH.vG"  # "Test@1234"

# ── data plans ────────────────────────────────────────────────────────────────
PLAN_BASIC    = "10000000-0000-0000-0000-000000000001"
PLAN_STANDARD = "10000000-0000-0000-0000-000000000002"
PLAN_PREMIUM  = "10000000-0000-0000-0000-000000000003"

PLANS = [
    (PLAN_BASIC,    "Basic",    "Entry-level home internet",   10240,  1000.00, 30, "5 Mbps",  "basic",    "prepaid", 1, 1),
    (PLAN_STANDARD, "Standard", "Mid-tier home broadband",     51200,  2000.00, 30, "20 Mbps", "standard", "prepaid", 0, 2),
    (PLAN_PREMIUM,  "Premium",  "High-speed unlimited fibre",  204800, 3500.00, 30, "50 Mbps", "premium",  "prepaid", 0, 3),
]

# ── realistic Kenyan names ─────────────────────────────────────────────────────
FIRST = ["Amina","Brian","Caroline","Daniel","Eunice","Faith","George","Hannah",
         "Isaac","Joyce","Kevin","Lucy","Michael","Nancy","Oscar","Patricia",
         "Quentin","Rose","Samuel","Tabitha","Uchenna","Violet","Walter","Xenia",
         "Yusuf","Zipporah","Allan","Beatrice","Charles","Diana","Emmanuel",
         "Florence","Gerald","Harriet","Ivan","Jackline","Kenneth","Lydia",
         "Martin","Naomi","Oliver","Pauline","Raymond","Stella","Timothy",
         "Ursula","Victor","Winnie","Xavier","Yvonne","Zachariah","Achieng",
         "Baraka","Chebet","Dennis"]
LAST  = ["Kamau","Otieno","Wanjiku","Mwangi","Odhiambo","Kariuki","Mutua",
         "Njoroge","Owino","Kimani","Achieng","Wambua","Omondi","Gitau",
         "Mugo","Kipchoge","Wangari","Nganga","Olweny","Muriuki","Ouma",
         "Kiptoo","Gathoni","Simiyu","Mbugua","Were","Ndegwa","Cheruiyot",
         "Mutura","Okello","Waithaka","Barasa","Ndirangu","Onyango","Njuguna"]

CITIES   = ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Nyeri"]
COUNTIES  = ["Nairobi","Mombasa","Kisumu","Nakuru","Uasin Gishu","Kiambu","Nyeri"]

def phone():
    prefix = random.choice(["0712","0722","0733","0743","0757","0768","0798"])
    return prefix + "".join([str(random.randint(0,9)) for _ in range(6)])

def nat_id(): return str(random.randint(20000000, 39999999))

# ── generate 55 users ──────────────────────────────────────────────────────────
N_USERS = 55
users = []
emails_used, phones_used, ids_used = set(), set(), set()

PLAN_DIST = ([PLAN_BASIC]*28) + ([PLAN_STANDARD]*19) + ([PLAN_PREMIUM]*8)
random.shuffle(PLAN_DIST)

for i in range(N_USERS):
    uid_ = f"20000000-0000-0000-0000-{str(i+1).zfill(12)}"
    fn = FIRST[i % len(FIRST)]
    ln = LAST[i % len(LAST)]
    em = f"{fn.lower()}.{ln.lower()}{i}@gmail.com"
    while em in emails_used: em = f"{fn.lower()}{i}_{random.randint(10,99)}@gmail.com"
    emails_used.add(em)

    ph = phone()
    while ph in phones_used: ph = phone()
    phones_used.add(ph)

    nid = nat_id()
    while nid in ids_used: nid = nat_id()
    ids_used.add(nid)

    city_i = i % len(CITIES)
    # Spread registrations: first 10 at START, next wave 45 days later, etc.
    reg = START + timedelta(days=random.randint(0, 150), hours=random.randint(8,20))

    # Churn profile: users 46-55 are churned/inactive
    is_active = 1 if i < 45 else 0
    plan = PLAN_DIST[i]
    users.append({
        "id": uid_, "first_name": fn, "last_name": ln, "email": em,
        "phone": ph, "nat_id": nid, "city": CITIES[city_i],
        "county": COUNTIES[city_i], "is_active": is_active,
        "plan": plan, "reg": reg,
        "churn_profile": i >= 45,        # heavy churn indicators
        "at_risk": i >= 38 and i < 45,   # medium risk
    })

# ── subscriptions ──────────────────────────────────────────────────────────────
subs = []
for i, u in enumerate(users):
    sub_id = f"30000000-0000-0000-0000-{str(i+1).zfill(12)}"
    plan_id = u["plan"]
    start = u["reg"] + timedelta(hours=random.randint(1,6))
    end   = start + timedelta(days=30)

    if u["churn_profile"]:
        status = random.choice(["cancelled", "expired"])
        end = start + timedelta(days=random.randint(15,28))
    elif u["at_risk"]:
        status = "active"
    else:
        status = "active"

    num = f"SUB{str(start.timestamp())[-8:].replace('.','')}{str(i).zfill(3)}"[:20]
    price = {PLAN_BASIC:10240, PLAN_STANDARD:51200, PLAN_PREMIUM:204800}[plan_id]
    used  = random.randint(0, price//2)
    subs.append({
        "id": sub_id, "user_id": u["id"], "plan_id": plan_id,
        "sub_num": num, "status": status,
        "start": start, "end": end,
        "data_used": used, "data_remaining": max(0, price-used),
        "auto_renew": 1 if not u["churn_profile"] else 0,
        "activated_at": start,
    })

# ── payments (6 months, monthly cycles) ───────────────────────────────────────
PLAN_PRICE = {PLAN_BASIC:1000.0, PLAN_STANDARD:2000.0, PLAN_PREMIUM:3500.0}
payments = []
invoices = []
pay_idx = 0
inv_idx = 0

for i, u in enumerate(users):
    sub = subs[i]
    plan_price = PLAN_PRICE[u["plan"]]
    months_active = random.randint(1,6) if u["churn_profile"] else random.randint(3,6)

    for m in range(months_active):
        pay_idx += 1
        inv_idx  += 1
        period_start = u["reg"] + timedelta(days=m*30)
        period_end   = period_start + timedelta(days=30)

        # Delay pattern
        if u["churn_profile"] and m >= months_active-1:
            # Last payment failed
            status = "failed"
            completed_at = None
            inv_status = "overdue"
            inv_pay_status = "failed"
            paid_at = None
            paid_amount = 0
        elif u["at_risk"] and random.random() < 0.4:
            # Delayed by 5-15 days
            status = "completed"
            completed_at = period_start + timedelta(days=random.randint(35,45))
            inv_status = "paid"
            inv_pay_status = "paid"
            paid_at = completed_at
            paid_amount = plan_price
        else:
            status = "completed"
            completed_at = period_start + timedelta(days=random.randint(1,5))
            inv_status = "paid"
            inv_pay_status = "paid"
            paid_at = completed_at
            paid_amount = plan_price

        # Skip future-dated payments (cap at NOW, matching data_usage guard)
        if completed_at is not None and completed_at > NOW:
            continue
        if period_start > NOW:
            continue

        receipt = f"QHX{str(pay_idx).zfill(7)}{random.randint(10,99)}" if status == "completed" else None
        checkout_id = f"ws_{uuid.uuid4().hex[:24]}"

        pay_id = f"40000000-0000-0000-0000-{str(pay_idx).zfill(12)}"
        inv_id = f"50000000-0000-0000-0000-{str(inv_idx).zfill(12)}"

        payments.append({
            "id": pay_id, "user_id": u["id"], "sub_id": sub["id"],
            "amount": plan_price, "phone": u["phone"],
            "checkout_id": checkout_id, "receipt": receipt,
            "status": status, "completed_at": completed_at,
            "initiated_at": period_start + timedelta(hours=random.randint(8,18)),
            "reference": f"MPESA-{pay_idx}-{uuid.uuid4().hex[:6]}",
            "description": f"Monthly subscription - {['Basic','Standard','Premium'][[PLAN_BASIC,PLAN_STANDARD,PLAN_PREMIUM].index(u['plan'])]} Plan",
            "created_at": period_start + timedelta(hours=random.randint(8,18)),
        })

        invoices.append({
            "id": inv_id, "user_id": u["id"], "sub_id": sub["id"],
            "inv_num": f"INV2025{str(inv_idx).zfill(6)}"[:20],
            "period_start": period_start, "period_end": period_end,
            "issue_date": period_start, "due_date": period_start + timedelta(days=7),
            "subtotal": plan_price, "tax": round(plan_price*0.16, 2),
            "discount": 0, "total": round(plan_price*1.16, 2),
            "status": inv_status, "pay_status": inv_pay_status,
            "paid_amount": paid_amount, "paid_at": paid_at,
            "created_at": period_start,
        })

# anomaly: 3 duplicate payments
for k in range(3):
    pay_idx += 1
    dup_user = users[k]
    dup_sub  = subs[k]
    base_dt  = NOW - timedelta(days=random.randint(5,20))
    pay_id   = f"40000000-0000-0000-0000-{str(pay_idx).zfill(12)}"
    payments.append({
        "id": pay_id, "user_id": dup_user["id"], "sub_id": dup_sub["id"],
        "amount": PLAN_PRICE[dup_user["plan"]],
        "phone": dup_user["phone"],
        "checkout_id": f"dup_{uuid.uuid4().hex[:24]}",
        "receipt": f"DUP{str(pay_idx).zfill(7)}{random.randint(10,99)}",
        "status": "completed", "completed_at": base_dt + timedelta(minutes=3),
        "initiated_at": base_dt,
        "reference": f"MPESA-DUP-{pay_idx}-{uuid.uuid4().hex[:6]}",
        "description": "Duplicate subscription payment",
        "created_at": base_dt,
    })

# ── data_usage (weekly sessions per active user) ───────────────────────────────
usage_rows = []
du_idx = 0
for i, u in enumerate(users):
    if u["churn_profile"] and i > 50: continue  # fully churned

    months = 6 if not u["churn_profile"] else 3
    plan_limit_mb = {PLAN_BASIC:10240, PLAN_STANDARD:51200, PLAN_PREMIUM:204800}[u["plan"]]

    # Heavier users get more GB
    base_mb = {PLAN_BASIC:3000, PLAN_STANDARD:18000, PLAN_PREMIUM:80000}[u["plan"]]

    for week in range(months * 4):
        du_idx += 1
        wk_start = u["reg"] + timedelta(weeks=week, hours=random.randint(0,12))
        if wk_start > NOW: break

        # Declining pattern for at-risk users in last 2 months
        decay = 0.4 if (u["at_risk"] and week >= months*4 - 8) else 1.0
        # Spike anomaly: 2 users have one huge week
        spike = (i < 3 and week == months*4 - 3)
        weekly_mb = int(base_mb / 4 * decay * random.uniform(0.7, 1.3))
        if spike: weekly_mb = int(base_mb * 2.5)

        bytes_total = weekly_mb * 1048576
        bytes_dl    = int(bytes_total * 0.75)
        bytes_ul    = bytes_total - bytes_dl

        dur_hours = random.randint(20, 80)
        end_time  = wk_start + timedelta(hours=dur_hours)
        if end_time > NOW: end_time = NOW

        sub_id = subs[i]["id"]
        row_id = f"60000000-0000-0000-0000-{str(du_idx).zfill(12)}"
        usage_rows.append({
            "id": row_id, "user_id": u["id"], "sub_id": sub_id,
            "session_id": f"sess_{du_idx}_{uuid.uuid4().hex[:8]}",
            "start": wk_start, "end": end_time,
            "bytes_dl": bytes_dl, "bytes_ul": bytes_ul, "total": bytes_total,
            "status": "completed",
            "created_at": wk_start,
        })

# ── support tickets ────────────────────────────────────────────────────────────
tickets = []
tk_idx  = 0
SUBJECTS = [
    ("Slow internet speed", "low"),
    ("Connection keeps dropping", "medium"),
    ("Cannot connect to internet", "high"),
    ("Billing error on my account", "medium"),
    ("Data depleted too fast", "low"),
    ("Router not working", "high"),
    ("Refund request for double charge", "high"),
    ("No internet since yesterday", "critical"),
    ("Service outage in my area", "critical"),
    ("Need to upgrade my plan", "low"),
]
CATS = ["network","billing","technical","account","outage"]

for i, u in enumerate(users):
    # Churn users: 3-5 tickets. At-risk: 2-3. Normal: 0-2.
    n_tickets = (random.randint(3,5) if u["churn_profile"]
                 else random.randint(2,3) if u["at_risk"]
                 else random.randint(0,2))

    for _ in range(n_tickets):
        tk_idx += 1
        subj, prio = random.choice(SUBJECTS)
        if u["churn_profile"] and prio == "low": prio = "medium"
        st = "open" if u["at_risk"] or u["churn_profile"] else random.choice(["open","resolved","closed"])
        created = rand_dt(u["reg"] + timedelta(days=7), NOW)
        tk_id = f"70000000-0000-0000-0000-{str(tk_idx).zfill(12)}"
        tickets.append({
            "id": tk_id, "user_id": u["id"], "subject": subj,
            "desc": f"Customer reports: {subj}. Requires urgent attention.",
            "priority": prio, "status": st,
            "category": random.choice(CATS),
            "created_at": created,
        })

# ── write SQL ─────────────────────────────────────────────────────────────────
lines = []
def w(s=""): lines.append(s)

w("-- =====================================================================")
w("-- ISP Billing System - 6-Month Historical Seed Data")
w("-- Password for all users: Test@1234")
w(f"-- Generated: {NOW}")
w("-- =====================================================================")
w("SET FOREIGN_KEY_CHECKS = 0;")
w("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';")
w()

# Plans (DataPlan has no underscored:true → camelCase columns)
w("-- ── Data Plans ────────────────────────────────────────────────────────")
w("DELETE FROM data_plans WHERE id IN ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003');")
for pid,name,desc,dlimit,price,validity,speed,cat,ptype,popular,sort in PLANS:
    w(f"INSERT IGNORE INTO data_plans (id,name,description,data_limit,price,validity_period,speed,category,plan_type,is_active,is_popular,sort_order,created_at,updated_at) VALUES "
      f"({q(pid)},{q(name)},{q(desc)},{dlimit},{price},{validity},{q(speed)},{q(cat)},{q(ptype)},1,{popular},{sort},{dt(START)},{dt(NOW)});")
w()

# Users (underscored → snake_case)
w("-- ── Users ─────────────────────────────────────────────────────────────")
for u in users:
    w(f"INSERT IGNORE INTO users (id,first_name,last_name,email,phone_number,password,national_id,city,county,is_active,is_verified,role,created_at,updated_at) VALUES "
      f"({q(u['id'])},{q(u['first_name'])},{q(u['last_name'])},{q(u['email'])},{q(u['phone'])},{q(BCRYPT_HASH)},{q(u['nat_id'])},{q(u['city'])},{q(u['county'])},{u['is_active']},1,'customer',{dt(u['reg'])},{dt(u['reg'])});")
w()

# Subscriptions (underscored)
w("-- ── Subscriptions ─────────────────────────────────────────────────────")
for s in subs:
    ca = dt(s["activated_at"])
    w(f"INSERT IGNORE INTO subscriptions (id,user_id,plan_id,subscription_number,status,start_date,end_date,data_used,data_remaining,auto_renew,activated_at,created_at,updated_at) VALUES "
      f"({q(s['id'])},{q(s['user_id'])},{q(s['plan_id'])},{q(s['sub_num'])},{q(s['status'])},{dt(s['start'])},{dt(s['end'])},{s['data_used']},{s['data_remaining']},{s['auto_renew']},{ca},{dt(s['start'])},{dt(s['start'])});")
w()

# Payments (underscored)
w("-- ── Payments ──────────────────────────────────────────────────────────")
for p in payments:
    cat = dt(p["completed_at"]) if p["completed_at"] else "NULL"
    w(f"INSERT IGNORE INTO payments (id,user_id,subscription_id,amount,currency,phone_number,checkout_request_id,mpesa_receipt_number,status,payment_method,payment_type,reference,description,initiated_at,completed_at,created_at,updated_at) VALUES "
      f"({q(p['id'])},{q(p['user_id'])},{q(p['sub_id'])},{p['amount']},'KES',{q(p['phone'])},{q(p['checkout_id'])},{q(p['receipt'])},{q(p['status'])},'mpesa','subscription',{q(p['reference'])},{q(p['description'])},{dt(p['initiated_at'])},{cat},{dt(p['created_at'])},{dt(p['created_at'])});")
w()

# Invoices (NOT underscored → camelCase)
w("-- ── Invoices ──────────────────────────────────────────────────────────")
for inv in invoices:
    pat = dt(inv["paid_at"]) if inv["paid_at"] else "NULL"
    w(f"INSERT IGNORE INTO invoices (id,user_id,subscription_id,invoice_number,billing_period_start,billing_period_end,issue_date,due_date,subtotal,tax_amount,discount_amount,total_amount,currency,status,payment_status,paid_amount,paid_at,created_at,updated_at) VALUES "
      f"({q(inv['id'])},{q(inv['user_id'])},{q(inv['sub_id'])},{q(inv['inv_num'])},{dt(inv['period_start'])},{dt(inv['period_end'])},{dt(inv['issue_date'])},{dt(inv['due_date'])},{inv['subtotal']},{inv['tax']},{inv['discount']},{inv['total']},'KES',{q(inv['status'])},{q(inv['pay_status'])},{inv['paid_amount']},{pat},{dt(inv['created_at'])},{dt(inv['created_at'])});")
w()

# Data usage (NOT underscored → camelCase)
w("-- ── Data Usage ────────────────────────────────────────────────────────")
for r in usage_rows:
    w(f"INSERT IGNORE INTO data_usage (id,user_id,subscription_id,session_id,start_time,end_time,bytes_downloaded,bytes_uploaded,total_bytes,connection_type,status,created_at,updated_at) VALUES "
      f"({q(r['id'])},{q(r['user_id'])},{q(r['sub_id'])},{q(r['session_id'])},{dt(r['start'])},{dt(r['end'])},{r['bytes_dl']},{r['bytes_ul']},{r['total']},'fiber','completed',{dt(r['created_at'])},{dt(r['created_at'])});")
w()

# Support tickets (underscored)
w("-- ── Support Tickets ───────────────────────────────────────────────────")
for t in tickets:
    w(f"INSERT IGNORE INTO support_tickets (id,user_id,subject,description,priority,status,category,created_at,updated_at) VALUES "
      f"({q(t['id'])},{q(t['user_id'])},{q(t['subject'])},{q(t['desc'])},{q(t['priority'])},{q(t['status'])},{q(t['category'])},{dt(t['created_at'])},{dt(t['created_at'])});")
w()

w("SET FOREIGN_KEY_CHECKS = 1;")
w()

# Stats summary
total_rev = sum(p["amount"] for p in payments if p["status"]=="completed")
w(f"-- ── Summary ───────────────────────────────────────────────────────────")
w(f"-- Users:          {len(users)}  (active: {sum(1 for u in users if u['is_active'])}, churned: {sum(1 for u in users if u['churn_profile'])}, at-risk: {sum(1 for u in users if u['at_risk'])})")
w(f"-- Subscriptions:  {len(subs)}")
w(f"-- Payments:       {len(payments)}  (completed: {sum(1 for p in payments if p['status']=='completed')}, failed: {sum(1 for p in payments if p['status']=='failed')})")
w(f"-- Invoices:       {len(invoices)}")
w(f"-- Data usage rows:{len(usage_rows)}")
w(f"-- Support tickets:{len(tickets)}")
w(f"-- Total revenue:  KES {total_rev:,.2f}")
w(f"-- Duplicate anomalies: 3")

sql = "\n".join(lines)
with open("isp_seed.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print(f"✅ isp_seed.sql written")
print(f"   Users: {len(users)}, Payments: {len(payments)}, Usage rows: {len(usage_rows)}, Tickets: {len(tickets)}")
print(f"   Total revenue (completed): KES {total_rev:,.2f}")
print()
print("Run this to seed your database:")
print("  docker exec -i isp-db mysql -u root -proot isp_billing_db < isp_seed.sql")
