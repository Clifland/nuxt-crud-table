CREATE TRIGGER orderitems_set_price
AFTER INSERT ON orderitems
WHEN NEW.price IS NULL OR NEW.price = 0
BEGIN
  UPDATE orderitems
  SET price = (SELECT price FROM products WHERE id = NEW.product_id)
  WHERE id = NEW.id;
END;

CREATE TRIGGER products_set_stock_insert
AFTER INSERT ON orderitems
BEGIN
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
END;

CREATE TRIGGER products_set_stock_delete
AFTER DELETE ON orderitems
BEGIN
  UPDATE products
  SET stock = stock + OLD.quantity
  WHERE id = OLD.product_id;
END;

CREATE TRIGGER products_set_stock_update
AFTER UPDATE ON orderitems
BEGIN
  UPDATE products
  SET stock = stock + OLD.quantity - NEW.quantity
  WHERE id = NEW.product_id;
END;
