import 'product.dart';

class CartItem {
  final String id;
  final String productId;
  final int quantity;
  final Product product;

  const CartItem({required this.id, required this.productId, required this.quantity, required this.product});

  int get lineTotal => product.price * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: json['id'] as String,
        productId: json['productId'] as String,
        quantity: json['quantity'] as int,
        product: Product.fromJson(json['product'] as Map<String, dynamic>),
      );
}

class Cart {
  final String id;
  final List<CartItem> items;

  const Cart({required this.id, required this.items});

  int get total => items.fold(0, (sum, item) => sum + item.lineTotal);
  String? get currencyCode => items.isEmpty ? null : items.first.product.currencyCode;

  factory Cart.fromJson(Map<String, dynamic> json) => Cart(
        id: json['id'] as String,
        items: (json['items'] as List<dynamic>? ?? [])
            .map((i) => CartItem.fromJson(i as Map<String, dynamic>))
            .toList(),
      );
}
