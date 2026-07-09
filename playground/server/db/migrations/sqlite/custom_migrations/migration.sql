CREATE TRIGGER orderitems_set_price
AFTER INSERT ON orderitems
WHEN NEW.price IS NULL OR NEW.price = 0
BEGIN
  UPDATE orderitems
  SET price = (SELECT price FROM products WHERE id = NEW.product_id)
  WHERE id = NEW.id;
END;
