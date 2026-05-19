from flask import Flask, request, jsonify, send_from_directory
from db import q, one, run, conn

app = Flask(__name__, static_folder='.', static_url_path='')


# сторінки 

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:f>')
def static_files(f):
    return send_from_directory('.', f)


# каталог

@app.route('/api/products')
def products():
    cat = request.args.get('cat')
    sql = """
        SELECT p.id, p.name, p.description as desc, p.price_label as price,
               p.status, p.is_bulky, p.photo_data as photo,
               c.slug as cat
        FROM products p
        JOIN categories c ON p.category_id = c.id
        {}
        ORDER BY p.sort_order, p.id
    """.format("WHERE c.slug = ?" if cat else "")
    return jsonify(q(sql, (cat,) if cat else ()))


@app.route('/api/products/<int:pid>', methods=['PATCH'])
def update_product(pid):
    data = request.get_json()
    if 'price' in data:
        label = data['price'] if data['price'] else 'За запитом'
        run("UPDATE products SET price_label=? WHERE id=?", (label, pid))
    if 'status' in data:
        run("UPDATE products SET status=? WHERE id=?", (data['status'], pid))
    return jsonify({'ok': True})


@app.route('/api/products', methods=['POST'])
def add_product():
    d = request.get_json()
    if not d.get('name'):
        return jsonify({'ok': False, 'message': "Назва обов'язкова"}), 422

    cat = one("SELECT id FROM categories WHERE slug=?", (d.get('cat', 'other'),))
    cat_id = cat['id'] if cat else 5

    pid = run("""
        INSERT INTO products (category_id, name, description, price_label, status, is_bulky, photo_data)
        VALUES (?,?,?,?,?,?,?)
    """, (
        cat_id,
        d['name'],
        d.get('desc', ''),
        d.get('price', 'За запитом'),
        d.get('status', 'available'),
        1 if d.get('cat') in ('tractors', 'combines', 'sprayers') else 0,
        d.get('photo', '')
    ))
    return jsonify({'ok': True, 'id': pid})


@app.route('/api/products/<int:pid>', methods=['DELETE'])
def delete_product(pid):
    run("DELETE FROM products WHERE id=?", (pid,))
    return jsonify({'ok': True})


# замовлення 

@app.route('/api/orders', methods=['POST'])
def create_order():
    d = request.get_json()
    if not d.get('name') or not d.get('phone'):
        return jsonify({'ok': False, 'message': "Ім'я та телефон обов'язкові"}), 422
    if not d.get('items'):
        return jsonify({'ok': False, 'message': 'Кошик порожній'}), 422

    client = one("SELECT id FROM clients WHERE phone=?", (d['phone'],))
    if client:
        cid = client['id']
    else:
        cid = run("INSERT INTO clients (full_name, phone, email) VALUES (?,?,?)",
                  (d['name'], d['phone'], d.get('email', '')))

    total = sum(
        (i.get('price_value') or 0) * i.get('qty', 1)
        for i in d['items']
    ) or None

    oid = run("""
        INSERT INTO orders
            (client_id, contact_name, contact_phone, contact_email,
             delivery_method, payment_method, comment, total_amount)
        VALUES (?,?,?,?,?,?,?,?)
    """, (cid, d['name'], d['phone'], d.get('email', ''),
          d.get('delivery', 'pickup'), d.get('payment', 'cash'),
          d.get('comment', ''), total))

    for item in d['items']:
        run("""
            INSERT INTO order_items
                (order_id, product_id, product_name, product_cat,
                 price_label, price_value, quantity, is_bulky)
            VALUES (?,?,?,?,?,?,?,?)
        """, (oid, item.get('id'), item['name'], item.get('cat', ''),
              item.get('price', 'За запитом'), item.get('price_value'),
              item.get('qty', 1), item.get('is_bulky', 0)))

    return jsonify({
        'ok': True,
        'id': oid,
        'message': f"Замовлення №{oid} прийнято! Менеджер зв'яжеться з вами."
    })


@app.route('/api/orders')
def get_orders():
    rows = q("""
        SELECT o.*, c.full_name as client_name
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        ORDER BY o.created_at DESC
    """)
    return jsonify(rows)


@app.route('/api/orders/<int:oid>/status', methods=['PATCH'])
def order_status(oid):
    d = request.get_json()
    run("UPDATE orders SET status=? WHERE id=?", (d['status'], oid))
    return jsonify({'ok': True})


# гарантія 

@app.route('/api/warranty', methods=['POST'])
def warranty():
    d = request.get_json()
    for f in ('name', 'phone', 'machine', 'desc'):
        if not d.get(f):
            return jsonify({'ok': False, 'message': f"Поле '{f}' обов'язкове"}), 422

    client = one("SELECT id FROM clients WHERE phone=?", (d['phone'],))
    cid = client['id'] if client else run(
        "INSERT INTO clients (full_name, phone, email) VALUES (?,?,?)",
        (d['name'], d['phone'], d.get('email', ''))
    )

    wid = run("""
        INSERT INTO warranty_requests
            (client_id, contact_name, contact_phone, contact_email,
             machine_name, serial_number, purchase_date,
             fault_type, fault_description, machine_location)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, (cid, d['name'], d['phone'], d.get('email', ''),
          d['machine'], d.get('serial', ''), d.get('date', ''),
          d.get('type', 'other'), d['desc'], d.get('location', '')))

    return jsonify({
        'ok': True,
        'id': wid,
        'message': f"Заявку #{wid} прийнято. Зателефонуємо найближчим часом."
    })


@app.route('/api/warranty')
def get_warranty():
    return jsonify(q("SELECT * FROM warranty_requests ORDER BY created_at DESC"))


@app.route('/api/warranty/<int:wid>/status', methods=['PATCH'])
def warranty_status(wid):
    d = request.get_json()
    run("UPDATE warranty_requests SET status=?, resolution_note=? WHERE id=?",
        (d['status'], d.get('note', ''), wid))
    return jsonify({'ok': True})


#  контакти 

@app.route('/api/contact', methods=['POST'])
def contact():
    d = request.get_json()
    if not d.get('name') or not d.get('phone'):
        return jsonify({'ok': False, 'message': "Ім'я та телефон обов'язкові"}), 422

    client = one("SELECT id FROM clients WHERE phone=?", (d['phone'],))
    cid = client['id'] if client else run(
        "INSERT INTO clients (full_name, phone, email) VALUES (?,?,?)",
        (d['name'], d['phone'], d.get('email', ''))
    )

    run("""
        INSERT INTO contact_requests (client_id, contact_name, contact_phone, contact_email, subject, message)
        VALUES (?,?,?,?,?,?)
    """, (cid, d['name'], d['phone'], d.get('email', ''),
          d.get('subject', 'other'), d.get('message', '')))

    return jsonify({
        'ok': True,
        'message': f"Дякуємо, {d['name']}! Ми зв'яжемося з вами протягом дня."
    })


@app.route('/api/contact')
def get_contacts():
    return jsonify(q("SELECT * FROM contact_requests ORDER BY created_at DESC"))


#  налаштування 

@app.route('/api/settings')
def get_settings():
    rows = q("SELECT key, value FROM settings")
    return jsonify({r['key']: r['value'] for r in rows})


if __name__ == '__main__':
    print('http://127.0.0.1:5000')
    app.run(debug=True, port=5000)


#  категорії з ієрархією 

@app.route('/api/categories')
def categories():
    all_cats = q("SELECT * FROM categories ORDER BY sort_order, id")
    # Build tree: top-level + children
    tree = []
    for cat in all_cats:
        if cat['parent_id'] is None:
            cat = dict(cat)
            cat['children'] = [c for c in all_cats if c['parent_id'] == cat['id']]
            tree.append(cat)
    return jsonify(tree)


#  розширений пошук 

@app.route('/api/search')
def search():
    text       = request.args.get('q', '').strip()
    cat        = request.args.get('cat', '')
    price_min  = request.args.get('price_min', type=float)
    price_max  = request.args.get('price_max', type=float)
    maker      = request.args.get('maker', '')
    status     = request.args.get('status', '')

    sql = """
        SELECT p.id, p.name, p.description as desc, p.price_label as price,
               p.price as price_num, p.status, p.is_bulky,
               p.photo_data as photo, c.slug as cat, c.name_uk as cat_name,
               m.name as maker
        FROM products p
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE 1=1
    """
    params = []

    if text:
        sql += " AND (p.name LIKE ? OR p.description LIKE ? OR p.model LIKE ?)"
        like = f'%{text}%'
        params += [like, like, like]

    if cat:
        sql += """ AND (c.slug = ? OR c.parent_id = (
                     SELECT id FROM categories WHERE slug = ?
                   ))"""
        params += [cat, cat]

    if price_min is not None:
        sql += " AND p.price >= ?"
        params.append(price_min)

    if price_max is not None:
        sql += " AND p.price <= ?"
        params.append(price_max)

    if maker:
        sql += " AND m.name LIKE ?"
        params.append(f'%{maker}%')

    if status:
        sql += " AND p.status = ?"
        params.append(status)

    sql += " ORDER BY p.sort_order, p.id"

    results = q(sql, params)
    return jsonify({'results': results, 'total': len(results)})


#  виробники для фільтра 

@app.route('/api/makers')
def makers():
    rows = q("""
        SELECT DISTINCT m.id, m.name
        FROM manufacturers m
        JOIN products p ON p.manufacturer_id = m.id
        ORDER BY m.name
    """)
    return jsonify(rows)
