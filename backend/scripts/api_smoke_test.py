"""End-to-end API test of the Phase 1 buyer, vendor and admin journeys.

Run it against a LOCAL backend on a FRESH database only: it creates accounts,
orders and settlements, changes the Green Coffee commission rate, and its
expected amounts assume the seeded category rates. Never point it at production.

    python backend/scripts/api_smoke_test.py http://localhost:8080 <admin-email> <admin-password>

The backend must run with PAYMENTS_MOCK_ENABLED=true (the docker-compose default).
Auth endpoints are rate limited to 10 requests a minute per IP, so wait a minute between runs.
"""
import json, sys, time, uuid, urllib.request, urllib.error, base64

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
ADMIN_EMAIL, ADMIN_PASSWORD = sys.argv[2], sys.argv[3]
RUN = uuid.uuid4().hex[:6]
results = []

# 1x1 PNG
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")


def call(method, path, token=None, body=None, raw=False, headers=None):
    data = None
    h = dict(headers or {})
    if body is not None and not isinstance(body, bytes):
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    elif body is not None:
        data = body
    if token:
        h["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            content = r.read()
            return r.status, (content if raw else (json.loads(content) if content else None))
    except urllib.error.HTTPError as e:
        content = e.read()
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, content


def upload(token, visibility):
    boundary = "----smoke" + uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"doc.png\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + PNG + f"\r\n--{boundary}--\r\n".encode()
    s, r = call("POST", f"/api/files?visibility={visibility}", token, body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    assert s == 200, (s, r)
    return r


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"   -> {detail}"))


def phone():
    return "9" + str(uuid.uuid4().int)[:9]


# ---------------------------------------------------------------- setup
s, r = call("POST", "/api/auth/login", body={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
check("admin login", s == 200, r)
admin = r["token"]

s, cats = call("GET", "/api/categories")
check("guest can read category tree with seeded taxonomy", s == 200 and len(cats) == 4, cats)
leaf = {c["name"]: c for root in cats for c in root["children"]}
green, roasted = leaf["Green Coffee"], leaf["Roasted Coffee"]
check("category carries structured attribute schema", any(a["key"] == "cropYear" for a in green["attributes"]))
check("commission is configured per category", green["effectiveCommissionRate"] == 3 and roasted["effectiveCommissionRate"] == 10,
      (green["effectiveCommissionRate"], roasted["effectiveCommissionRate"]))


def register_seller(name):
    p = phone()
    s, r = call("POST", "/api/auth/register-seller", body={
        "businessName": name, "contactPerson": "Owner " + name, "email": f"{name.lower().replace(' ', '')}@example.test",
        "phone": p, "password": "Passw0rd!x", "vendorType": "COFFEE_ESTATE", "addressLine": "1 Estate Road",
        "city": "Chikmagalur", "state": "Karnataka", "pin": "577101"})
    assert s == 200, (s, r)
    return r["token"], p


sellerA, phoneA = register_seller(f"Estate A {RUN}")
sellerB, _ = register_seller(f"Roaster B {RUN}")
buyer_phone = phone()
s, r = call("POST", "/api/auth/register", body={"name": "Priya Buyer", "email": f"buyer{RUN}@example.test",
                                                "phone": buyer_phone, "password": "Passw0rd!x", "companyName": "Cafe Priya"})
check("buyer registers", s == 200, r)
buyer = r["token"]

s, r = call("POST", "/api/auth/login", body={"identifier": buyer_phone, "password": "Passw0rd!x"})
check("login with mobile number", s == 200, r)
s, r = call("POST", "/api/auth/login", body={"identifier": buyer_phone, "password": "wrong-password"})
check("wrong password rejected", s == 401, (s, r))
s, r = call("POST", "/api/auth/forgot-password", body={"email": f"buyer{RUN}@example.test"})
check("forgot password accepted", s == 200, r)
s, r = call("POST", "/api/auth/reset-password", body={"token": "bogus", "password": "Passw0rd!y"})
check("reset with bad token rejected", s == 400, (s, r))

# ---------------------------------------------------------------- vendor onboarding & verification
s, me = call("GET", "/api/vendor/me", sellerA)
check("new vendor starts as DRAFT", s == 200 and me["status"] == "DRAFT", me)
vendorA_id, vendorA_slug = me["id"], me["slug"]

product_body = lambda cat, attrs, img: {
    "name": f"Test Lot {RUN} {cat['name']}", "description": "Shade grown lot.", "price": 450, "priceUnit": "kg", "moq": 2,
    "categoryId": cat["id"], "stock": 10, "imageUrl": img, "imageUrls": [img], "attributes": attrs,
    "shippingCharge": 120, "dispatchDays": 3, "shipsFrom": "Chikmagalur"}
green_attrs = {"coffeeType": "Arabica", "grade": "AA", "origin": "Chikmagalur", "process": "Washed", "cropYear": "2026"}

imgA = upload(sellerA, "public")["url"]
s, pA = call("POST", "/api/products", sellerA, product_body(green, green_attrs, imgA))
check("unverified vendor can save a draft product", s == 200 and pA["status"] == "DRAFT", pA)
s, r = call("POST", f"/api/products/{pA['id']}/submit", sellerA)
check("unverified vendor cannot submit a product", s == 403, (s, r))
s, r = call("POST", "/api/vendor/me/submit", sellerA)
check("verification blocked until documents and bank are provided", s == 400 and "document" in r["message"], (s, r))
s, r = call("GET", f"/api/suppliers/{vendorA_slug}")
check("unapproved vendor has no public storefront", s == 404, (s, r))


def onboard(token):
    for doc_type in ["GST", "PAN", "BANK_PROOF", "ADDRESS_PROOF"]:
        f = upload(token, "private")
        s, r = call("POST", "/api/vendor/me/documents", token, {"type": doc_type, "fileId": f["id"]})
        assert s == 200, (s, r)
    s, r = call("PUT", "/api/vendor/me/bank", token, {"accountHolder": "Estate", "accountNumber": "123456789012",
                                                      "ifsc": "HDFC0001234", "bankName": "HDFC"})
    assert s == 200, (s, r)
    s, r = call("POST", "/api/vendor/me/submit", token)
    assert s == 200 and r["status"] == "PENDING_VERIFICATION", (s, r)
    return r


profA = onboard(sellerA)
check("documents uploaded: vendor is pending, not verified", profA["status"] == "PENDING_VERIFICATION")
doc_file = profA["documents"][0]["fileId"]
s, _ = call("GET", f"/api/files/{doc_file}", raw=True)
check("verification document is not publicly readable", s == 404, s)
s, _ = call("GET", f"/api/files/{doc_file}", sellerB, raw=True)
check("another vendor cannot read the document", s == 404, s)
s, _ = call("GET", f"/api/files/{doc_file}", admin, raw=True)
check("admin can read the document", s == 200, s)

s, r = call("PUT", f"/api/admin/vendors/{vendorA_id}/status", sellerA, {"status": "APPROVED"})
check("vendor cannot approve themself (server-side role check)", s == 403, (s, r))
s, r = call("PUT", f"/api/admin/vendors/{vendorA_id}/status", admin, {"status": "REJECTED"})
check("rejecting a vendor requires a reason", s == 400, (s, r))
s, r = call("PUT", f"/api/admin/vendors/{vendorA_id}/status", admin, {"status": "APPROVED"})
check("admin approves vendor", s == 200 and r["status"] == "APPROVED", (s, r))
s, r = call("PUT", f"/api/admin/vendors/{vendorA_id}/bank", admin, {"status": "VERIFIED"})
check("admin verifies bank account", s == 200 and r["bank"]["status"] == "VERIFIED", (s, r))

profB = onboard(sellerB)
vendorB_id = profB["id"]
call("PUT", f"/api/admin/vendors/{vendorB_id}/status", admin, {"status": "APPROVED"})

# ---------------------------------------------------------------- product moderation
bad = product_body(green, {"coffeeType": "Liberica"}, imgA)
s, r = call("PUT", f"/api/products/{pA['id']}", sellerA, bad)
check("invalid structured attribute value rejected", s == 400, (s, r))
s, r = call("PUT", f"/api/products/{pA['id']}", sellerA, product_body(green, {"coffeeType": "Arabica"}, imgA))
s, r = call("POST", f"/api/products/{pA['id']}/submit", sellerA)
check("submission blocked when required category attributes are missing", s == 400 and "grade" in r["message"], (s, r))
call("PUT", f"/api/products/{pA['id']}", sellerA, product_body(green, green_attrs, imgA))
s, r = call("POST", f"/api/products/{pA['id']}/submit", sellerA)
check("approved vendor submits product -> PENDING", s == 200 and r["status"] == "PENDING", (s, r))
s, r = call("GET", f"/api/products?q=Test Lot {RUN}".replace(" ", "%20"))
check("pending product is not searchable", s == 200 and r["totalElements"] == 0, r)
s, r = call("GET", f"/api/products/{pA['id']}")
check("pending product is hidden from guests", s == 404, s)
s, r = call("PUT", f"/api/admin/products/{pA['id']}/moderate", admin, {"action": "REJECT"})
check("rejecting a product requires a reason", s == 400, (s, r))
s, r = call("PUT", f"/api/admin/products/{pA['id']}/moderate", admin, {"action": "REJECT", "reason": "Image too small"})
check("admin rejects with reason", s == 200 and r["status"] == "REJECTED" and r["rejectionReason"] == "Image too small", r)
s, r = call("POST", f"/api/products/{pA['id']}/submit", sellerA)
check("vendor resubmits rejected product", s == 200 and r["status"] == "PENDING", (s, r))
s, r = call("PUT", f"/api/admin/products/{pA['id']}/moderate", admin, {"action": "APPROVE"})
check("admin approves product", s == 200 and r["status"] == "APPROVED", r)

imgB = upload(sellerB, "public")["url"]
roast_attrs = {"coffeeType": "Blend", "origin": "Coorg", "roastLevel": "Dark", "packSize": "250g"}
s, pB = call("POST", "/api/products", sellerB, {**product_body(roasted, roast_attrs, imgB), "moq": None, "price": 600, "priceUnit": "pack"})
call("POST", f"/api/products/{pB['id']}/submit", sellerB)
call("PUT", f"/api/admin/products/{pB['id']}/moderate", admin, {"action": "APPROVE"})

s, r = call("GET", f"/api/products?q=Test%20Lot%20{RUN}&size=5")
check("approved products are searchable and paginated", s == 200 and r["totalElements"] == 2 and r["size"] == 5, r)
s, r = call("GET", f"/api/products?category={green['slug']}&attr_origin=chikmag&q={RUN}")
check("category + structured attribute filter", s == 200 and r["totalElements"] == 1 and r["content"][0]["id"] == pA["id"], r)
s, r = call("GET", f"/api/products?attr_roastLevel=Dark&q={RUN}&minPrice=500")
check("roast level + price filter", s == 200 and r["totalElements"] == 1 and r["content"][0]["id"] == pB["id"], r)
s, r = call("GET", f"/api/products/{pA['slug']}")
check("product readable by SEO slug, with verified vendor", s == 200 and r["vendorVerified"] is True, r)
s, r = call("GET", f"/api/suppliers/{vendorA_slug}")
check("approved vendor storefront is public and shows products", s == 200 and r["summary"]["productCount"] == 1 and r["summary"]["verified"], r)
check("storefront shows approved certifications only", r["certifications"] == [], r["certifications"])
s, r = call("GET", f"/api/search?q={RUN}")
check("global search returns products and suppliers", s == 200 and len(r["products"]) == 2 and len(r["suppliers"]) == 2, r)

# ---------------------------------------------------------------- cart & multi-vendor checkout
s, r = call("POST", "/api/cart/items", buyer, {"productId": pA["id"], "quantity": 1})
check("first add honours MOQ", s == 200 and r["groups"][0]["items"][0]["quantity"] == 2, r)
s, r = call("POST", "/api/cart/items", buyer, {"productId": pB["id"], "quantity": 1})
check("cart holds products from two sellers", s == 200 and len(r["groups"]) == 2, r)
check("cart totals", r["subtotal"] == 1500 and r["shippingTotal"] == 240 and r["total"] == 1740, (r["subtotal"], r["shippingTotal"], r["total"]))
s, r = call("POST", "/api/cart/items", sellerA, {"productId": pA["id"], "quantity": 1})
check("only buyers have a cart", s == 403, s)

address = {"line1": "12 MG Road", "city": "Bengaluru", "state": "Karnataka", "pin": "560001"}
checkout = {"name": "Priya Buyer", "phone": buyer_phone, "email": f"buyer{RUN}@example.test",
            "shippingAddress": address, "gstNumber": "29ABCDE1234F1Z5", "notes": "Call before delivery", "paymentMethod": "COD"}
s, order = call("POST", "/api/checkout", buyer, checkout)
check("checkout creates an order", s == 200, order)
vos = order["vendorOrders"]
check("one parent order + a sub-order per vendor", order["orderNumber"].startswith("CH-") and len(vos) == 2
      and vos[0]["subOrderNumber"] == order["orderNumber"] + "-A" and vos[1]["subOrderNumber"] == order["orderNumber"] + "-B", order)
check("buyer response hides vendor commercials", vos[0]["platformFee"] is None and vos[0]["vendorPayable"] is None, vos[0])
check("order total", order["totalAmount"] == 1740, order["totalAmount"])
s, r = call("GET", "/api/cart", buyer)
check("cart emptied after checkout", r["itemCount"] == 0, r)
s, r = call("GET", f"/api/products/{pA['id']}")
check("stock decremented", r["stock"] == 8, r["stock"])

voA = next(v for v in vos if v["vendorId"] == vendorA_id)
voB = next(v for v in vos if v["vendorId"] == vendorB_id)
s, r = call("GET", "/api/vendor/orders", sellerA)
check("vendor sees only their own sub-order", s == 200 and [v["id"] for v in r["content"]] == [voA["id"]], r)
a = r["content"][0]
check("vendor ledger: commission 3% of 900, payable reconciles",
      a["platformFee"] == 27 and a["totalAmount"] == 1020 and a["vendorPayable"] == a["totalAmount"] - a["platformFee"] - a["gatewayFee"], a)
s, r = call("GET", f"/api/vendor/orders/{voB['id']}", sellerA)
check("vendor cannot read another vendor's sub-order", s == 404, (s, r))
s, r = call("PUT", f"/api/vendor/orders/{voB['id']}/status", sellerA, {"status": "ACCEPTED"})
check("vendor cannot update another vendor's sub-order", s == 404, (s, r))
s, r = call("GET", f"/api/orders/{order['id']}", sellerA)
check("vendor cannot read the parent order", s == 403, s)

s, r = call("PUT", f"/api/vendor/orders/{voA['id']}/status", sellerA, {"status": "ACCEPTED"})
check("vendor accepts", s == 200 and r["status"] == "ACCEPTED", (s, r))
s, r = call("PUT", f"/api/vendor/orders/{voA['id']}/status", sellerA, {"status": "PLACED"})
check("status cannot move backwards", s == 400, (s, r))
s, r = call("PUT", f"/api/vendor/orders/{voA['id']}/status", sellerA, {"status": "SHIPPED"})
check("shipping requires courier and tracking number", s == 400, (s, r))
s, r = call("PUT", f"/api/vendor/orders/{voA['id']}/status", sellerA,
            {"status": "SHIPPED", "courierName": "BlueDart", "trackingNumber": "BD123", "trackingUrl": "https://track.example/BD123"})
check("vendor ships with tracking", s == 200 and r["status"] == "SHIPPED" and r["dispatchDate"], (s, r))
s, r = call("GET", f"/api/orders/{order['id']}", buyer)
bA = next(v for v in r["vendorOrders"] if v["id"] == voA["id"])
check("buyer sees status and tracking", bA["status"] == "SHIPPED" and bA["trackingNumber"] == "BD123" and r["status"] == "PLACED", r)
s, r = call("POST", f"/api/orders/vendor-orders/{voA['id']}/cancel", buyer, {})
check("buyer cannot cancel a shipped order", s == 400, (s, r))
s, r = call("GET", f"/api/reviews/eligibility?productId={pA['id']}", buyer)
check("no review before delivery", r["canReview"] is False, r)
s, r = call("PUT", f"/api/vendor/orders/{voA['id']}/status", sellerA, {"status": "DELIVERED"})
check("vendor marks delivered", s == 200 and r["status"] == "DELIVERED", (s, r))
s, r = call("POST", f"/api/orders/vendor-orders/{voA['id']}/confirm-delivery", buyer)
check("buyer confirms receipt -> COMPLETED", s == 200, (s, r))

# ---------------------------------------------------------------- reviews (verified purchase)
s, r = call("POST", "/api/reviews", buyer, {"productId": pB["id"], "rating": 5})
check("cannot review a product that has not been received", s == 403, (s, r))
s, r = call("POST", "/api/reviews", buyer, {"productId": pA["id"], "rating": 4, "sellerRating": 5, "comment": "Clean cup"})
check("verified purchase review accepted", s == 200 and r["verifiedPurchase"], (s, r))
s, r = call("GET", f"/api/suppliers/{vendorA_slug}")
check("seller rating aggregated separately from product rating", r["summary"]["avgRating"] == 5 and r["summary"]["reviewCount"] == 1, r["summary"])
s, r = call("GET", f"/api/products/{pA['id']}")
check("product rating updated", r["avgRating"] == 4 and r["reviewCount"] == 1, r)
s, rev = call("GET", "/api/admin/reviews", admin)
s, r = call("PUT", f"/api/admin/reviews/{rev['content'][0]['id']}", admin, {"hidden": True, "note": "test"})
s, r = call("GET", f"/api/products/{pA['id']}")
check("admin-hidden review no longer counts", r["reviewCount"] == 0, r)

# ---------------------------------------------------------------- disputes
s, r = call("PUT", f"/api/vendor/orders/{voB['id']}/status", sellerB, {"status": "ACCEPTED"})
ev = upload(buyer, "public")["url"]
s, d = call("POST", "/api/disputes", buyer, {"vendorOrderId": voB["id"], "reason": "SELLER_UNRESPONSIVE", "description": "No update", "evidenceUrls": [ev, "https://evil.example/x.png"]})
check("buyer opens dispute with evidence (external links dropped)", s == 200 and d["evidenceUrls"] == [ev], (s, d))
s, r = call("GET", "/api/vendor/orders/%d" % voB["id"], sellerB)
check("disputed order is on settlement hold", r["status"] == "DISPUTED" and r["settlementStatus"] == "ON_HOLD", r)
s, r = call("POST", f"/api/vendor/disputes/{d['id']}/respond", sellerA, {"response": "not mine"})
check("another vendor cannot respond to the dispute", s == 404, (s, r))
s, r = call("POST", f"/api/vendor/disputes/{d['id']}/respond", sellerB, {"response": "Shipping tomorrow"})
check("vendor responds", s == 200 and r["status"] == "VENDOR_RESPONDED", (s, r))
s, r = call("POST", f"/api/admin/disputes/{d['id']}/resolve", admin, {"resolution": "Vendor to ship within 24h", "refundAmount": 0})
check("admin resolves; order returns to prior status", s == 200 and r["status"] == "RESOLVED_NO_REFUND", (s, r))
s, r = call("GET", "/api/vendor/orders/%d" % voB["id"], sellerB)
check("order restored after dispute", r["status"] == "ACCEPTED", r["status"])

# ---------------------------------------------------------------- online payment (test mode) + refund ledger
call("POST", "/api/cart/items", buyer, {"productId": pB["id"], "quantity": 2})
s, o2 = call("POST", "/api/checkout", buyer, {**checkout, "paymentMethod": "ONLINE"})
check("online order placed awaiting payment", s == 200 and o2["paymentStatus"] == "PENDING", (s, o2))
vo2 = o2["vendorOrders"][0]
s, r = call("PUT", f"/api/vendor/orders/{vo2['id']}/status", sellerB, {"status": "ACCEPTED"})
check("vendor cannot fulfil before payment is confirmed", s == 400, (s, r))
s, r = call("POST", f"/api/orders/{o2['id']}/pay", buyer)
check("payment confirmed -> PAYMENT_CONFIRMED", s == 200 and r["paymentStatus"] == "PAID" and r["vendorOrders"][0]["status"] == "PAYMENT_CONFIRMED", (s, r))
s, r = call("GET", f"/api/vendor/orders/{vo2['id']}", sellerB)
total = r["totalAmount"]
check("ledger with gateway fee reconciles (10% commission on 1200, 2% gateway on 1320)",
      r["platformFee"] == 120 and r["gatewayFee"] == 26.4 and r["vendorPayable"] == round(total - 120 - 26.4, 2), r)
s, r = call("POST", f"/api/orders/vendor-orders/{vo2['id']}/cancel", buyer, {"reason": "Changed my mind"})
check("cancelling a paid order requests a refund", s == 200 and r["vendorOrders"][0]["status"] == "REFUND_REQUESTED", (s, r))
s, r = call("POST", f"/api/admin/vendor-orders/{vo2['id']}/refund", admin, {"amount": total + 1})
check("refund cannot exceed order value", s == 400, (s, r))
s, r = call("POST", f"/api/admin/vendor-orders/{vo2['id']}/refund", admin, {"amount": total, "reason": "Buyer cancelled"})
check("admin issues full refund", s == 200 and r["vendorOrders"][0]["status"] == "REFUNDED" and r["paymentStatus"] == "REFUNDED"
      and r["vendorOrders"][0]["vendorPayable"] == 0, (s, r))
s, r = call("GET", f"/api/products/{pB['id']}")
check("cancelled stock returned", r["stock"] == 9, r["stock"])

# ---------------------------------------------------------------- settlements
s, r = call("GET", "/api/admin/settlements/payables", admin)
mine = [p for p in r if p["vendorId"] == vendorA_id]
check("nothing payable while a COD order is not fully delivered", s == 200 and mine == [], r)
s, r = call("POST", "/api/admin/orders/%d/confirm-payment" % order["id"], admin, {"reference": "CASH-1"})
check("admin confirms payment", s == 200 and r["paymentStatus"] == "PAID", (s, r))
s, r = call("GET", "/api/admin/settlements/payables", admin)
mine = [p for p in r if p["vendorId"] == vendorA_id]
check("delivered + paid order becomes payable", len(mine) == 1 and mine[0]["amount"] == 993 and not mine[0]["payoutOnHold"], r)
s, r = call("PUT", "/api/vendor/me/bank", sellerA, {"accountHolder": "Estate", "accountNumber": "999999999999", "ifsc": "HDFC0001234"})
s, r = call("POST", "/api/admin/settlements", admin, {"vendorId": vendorA_id, "reference": "UTR1"})
check("changing bank details puts payouts on hold", s == 400, (s, r))
call("PUT", f"/api/admin/vendors/{vendorA_id}/bank", admin, {"status": "VERIFIED"})
s, r = call("POST", "/api/admin/settlements", admin, {"vendorId": vendorA_id, "reference": "UTR1"})
check("admin settles vendor", s == 200 and r["amount"] == 993, (s, r))
s, r = call("GET", "/api/vendor/payments", sellerA)
check("vendor sees settlement", s == 200 and r["settled"] == 993 and len(r["settlements"]) == 1, r)

# ---------------------------------------------------------------- RFQ -> quotes -> selection
rfq_body = {"title": f"500kg washed arabica {RUN}", "categoryId": green["id"], "coffeeType": "Arabica", "specification": "AA, screen 17+",
            "quantity": 500, "unit": "kg", "targetPrice": 420, "deliveryLocation": "Bengaluru", "sampleRequired": True,
            "privateLabelRequired": False, "additionalRequirements": "Moisture below 11%"}
s, r = call("POST", "/api/rfqs", None, rfq_body)
check("guest cannot post an RFQ", s in (401, 403), s)
s, rfq = call("POST", "/api/rfqs", buyer, rfq_body)
check("buyer posts RFQ", s == 200 and rfq["status"] == "SUBMITTED", (s, rfq))
s, r = call("GET", "/api/vendor/rfqs", sellerA)
check("RFQ not visible to vendors before admin routing", r["totalElements"] == 0, r)
s, sug = call("GET", f"/api/admin/rfqs/{rfq['id']}/suggested-vendors", admin)
check("admin gets suggested vendors selling in the category", s == 200 and vendorA_id in [v["id"] for v in sug], sug)
s, r = call("POST", f"/api/admin/rfqs/{rfq['id']}/route", admin, {"vendorIds": [vendorA_id, vendorB_id]})
check("admin routes RFQ to vendors", s == 200 and r["status"] == "OPEN" and r["invitedCount"] == 2, (s, r))
s, r = call("GET", f"/api/vendor/rfqs/{rfq['id']}", sellerA)
check("invited vendor sees RFQ without buyer contact details", s == 200 and r["buyerName"] == "Cafe Priya" and r["quotes"] == [], r)
quote = {"pricePerUnit": 430, "moq": 100, "availableQuantity": 800, "taxPercent": 0, "shippingCost": 5000, "leadTimeDays": 7, "sampleCost": 0}
s, r = call("POST", f"/api/vendor/rfqs/{rfq['id']}/quote", sellerA, quote)
check("vendor A quotes", s == 200 and r["myQuote"]["estimatedTotal"] == 220000, (s, r))
s, r = call("POST", f"/api/vendor/rfqs/{rfq['id']}/quote", sellerB, {**quote, "pricePerUnit": 410, "leadTimeDays": 14})
check("vendor B quotes", s == 200, (s, r))
s, r = call("GET", f"/api/vendor/rfqs/{rfq['id']}", sellerA)
check("vendor cannot see competitors' quotes", r["quotes"] == [] and r["myQuote"]["pricePerUnit"] == 430, r)
s, r = call("GET", f"/api/rfqs/{rfq['id']}", buyer)
check("buyer compares quotes side by side", s == 200 and len(r["quotes"]) == 2 and all(q["vendorVerified"] for q in r["quotes"]), r)
chosen = next(q for q in r["quotes"] if q["vendorId"] == vendorB_id)
s, r = call("POST", f"/api/rfqs/{rfq['id']}/quotes/{chosen['id']}/select", sellerA)
check("only the buyer can select a supplier", s == 403, s)
s, r = call("POST", f"/api/rfqs/{rfq['id']}/quotes/{chosen['id']}/select", buyer)
statuses = {q["vendorId"]: q["status"] for q in r["quotes"]}
check("buyer selects supplier", s == 200 and r["status"] == "AWARDED" and statuses == {vendorB_id: "ACCEPTED", vendorA_id: "REJECTED"}, (s, r))

# ---------------------------------------------------------------- messaging
s, conv = call("POST", "/api/conversations", buyer, {"vendorId": vendorA_id, "contextType": "PRODUCT", "contextId": pA["id"],
                                                     "message": "Call me on 9876543210 or mail priya@example.com please"})
body = conv["messages"][0]["body"]
check("phone and email are masked in messages", s == 200 and "9876543210" not in body and "priya@example.com" not in body and conv["flagged"], conv)
s, r = call("GET", f"/api/conversations/{conv['id']}", sellerB)
check("non-participant cannot read a conversation", s == 404, s)
s, r = call("POST", f"/api/conversations/{conv['id']}/messages", sellerA, {"message": "Happy to help"})
check("vendor replies", s == 200 and len(r["messages"]) == 2, (s, r))
s, r = call("GET", "/api/admin/conversations", admin)
check("flagged conversation visible to admin", s == 200 and conv["id"] in [c["id"] for c in r["content"]], r)

# ---------------------------------------------------------------- notifications, admin config, audit, reports
s, r = call("GET", "/api/notifications?size=50", buyer)
types = {n["type"] for n in r["content"]}
check("buyer notifications for order, RFQ and dispute events",
      {"ORDER_PLACED", "ORDER_SHIPPED", "QUOTE_RECEIVED", "RFQ_OPEN", "DISPUTE_UPDATE"} <= types, types)
s, r = call("GET", "/api/notifications?size=50", sellerA)
types = {n["type"] for n in r["content"]}
check("vendor notifications for verification, moderation, order and RFQ events",
      {"VENDOR_VERIFICATION", "PRODUCT_MODERATION", "NEW_ORDER", "RFQ_INVITATION"} <= types, types)

s, r = call("PUT", f"/api/admin/categories/{green['id']}", admin, {"name": "Green Coffee", "parentId": green["parentId"],
            "attributeGroup": "GREEN_COFFEE", "commissionRate": 4, "taxRate": 0, "active": True, "featured": True, "sortOrder": 1})
check("admin changes commission rate without a code change", s == 200 and r["effectiveCommissionRate"] == 4, (s, r))
s, r = call("POST", "/api/admin/categories", buyer, {"name": "X", "attributeGroup": "GENERAL", "active": True})
check("non-admin cannot manage categories", s == 403, s)
s, r = call("POST", "/api/admin/categories", admin, {"name": f"Syrups {RUN}", "attributeGroup": "GENERAL", "commissionRate": 9, "active": True, "featured": False, "sortOrder": 9})
check("admin creates a category", s == 200 and r["slug"].startswith("syrups"), (s, r))
s, r = call("PUT", "/api/admin/settings", admin, [{"key": "gateway_fee_percent", "value": "150"}])
check("invalid setting rejected", s == 400, (s, r))

s, r = call("GET", "/api/admin/audit-logs?size=100", admin)
actions = {a["action"] for a in r["content"]}
check("sensitive admin/vendor actions are audit logged",
      {"VENDOR_STATUS_CHANGED", "PRODUCT_MODERATED", "VENDOR_BANK_CHANGED", "REFUND_ISSUED", "SETTLEMENT_PAID", "CATEGORY_UPDATED",
       "RFQ_ROUTED", "DISPUTE_RESOLVED", "VENDOR_DOCUMENT_UPLOADED", "PAYMENT_CONFIRMED"} <= actions, actions)
s, r = call("GET", "/api/admin/stats", admin)
check("admin KPIs", s == 200 and r["gmv"] > 0 and r["activeVendors"] >= 2 and r["totalRfqs"] >= 1 and r["quoteAcceptanceRate"] > 0, r)
s, r = call("GET", "/api/admin/reports/transactions.csv", admin, raw=True)
check("transactions CSV export", s == 200 and b"Vendor payable" in r and order["orderNumber"].encode() in r, s)
s, r = call("GET", "/api/admin/reports/summary", buyer)
check("reports are admin-only", s == 403, s)
s, r = call("POST", "/api/analytics/events", None, {"name": "product_view", "sessionId": "t", "detail": "1"})
check("analytics event accepted from a guest", s == 200, s)
s, r = call("GET", "/api/admin/analytics", admin)
check("analytics funnel summary", s == 200 and r["product_view"] >= 1, r)
s, r = call("GET", "/api/content/POLICY/privacy-policy")
check("policy page served from CMS", s == 200 and r["title"] == "Privacy Policy", (s, r))
s, r = call("PUT", f"/api/admin/vendors/{vendorB_id}/status", admin, {"status": "SUSPENDED", "reason": "test"})
s, r = call("GET", f"/api/products/{pB['id']}")
check("suspending a vendor takes their listings down", s == 404, s)

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
if failed:
    print("FAILED:\n  " + "\n  ".join(failed))
    sys.exit(1)
