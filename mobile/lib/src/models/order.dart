import 'address.dart';
import 'product.dart';

enum OrderStatus {
  PENDING_PAYMENT,
  PAID,
  SELLER_CONFIRMED,
  READY_FOR_PICKUP,
  PICKED_UP,
  IN_TRANSIT,
  DELIVERED,
  BUYER_CONFIRMED,
  COMPLETED,
  PAYMENT_FAILED,
  CANCELLED,
  DISPUTED,
  REFUNDED,
  RETURN_REQUESTED,
  RETURNED,
}

OrderStatus orderStatusFromJson(String? value) =>
    OrderStatus.values.firstWhere((s) => s.name == value, orElse: () => OrderStatus.PENDING_PAYMENT);

extension OrderStatusLabel on OrderStatus {
  String get label => switch (this) {
        OrderStatus.PENDING_PAYMENT => 'En attente de paiement',
        OrderStatus.PAID => 'Payée',
        OrderStatus.SELLER_CONFIRMED => 'Confirmée par le vendeur',
        OrderStatus.READY_FOR_PICKUP => 'Prête pour la collecte',
        OrderStatus.PICKED_UP => 'Colis récupéré',
        OrderStatus.IN_TRANSIT => 'En cours de livraison',
        OrderStatus.DELIVERED => 'Livrée',
        OrderStatus.BUYER_CONFIRMED => 'Réception confirmée',
        OrderStatus.COMPLETED => 'Terminée',
        OrderStatus.PAYMENT_FAILED => 'Échec du paiement',
        OrderStatus.CANCELLED => 'Annulée',
        OrderStatus.DISPUTED => 'En litige',
        OrderStatus.REFUNDED => 'Remboursée',
        OrderStatus.RETURN_REQUESTED => 'Retour demandé',
        OrderStatus.RETURNED => 'Retournée',
      };
}

enum DeliveryMode { HOME_DELIVERY, PICKUP_POINT, HAND_TO_HAND }

extension DeliveryModeLabel on DeliveryMode {
  String get label => switch (this) {
        DeliveryMode.HOME_DELIVERY => 'Livraison à domicile',
        DeliveryMode.PICKUP_POINT => 'Point relais',
        DeliveryMode.HAND_TO_HAND => 'Remise en main propre',
      };
}

class OrderItem {
  final String id;
  final String productId;
  final String sellerId;
  final int quantity;
  final int unitPrice;
  final String currencyCode;
  final Product? product;

  const OrderItem({
    required this.id,
    required this.productId,
    required this.sellerId,
    required this.quantity,
    required this.unitPrice,
    required this.currencyCode,
    this.product,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        id: json['id'] as String,
        productId: json['productId'] as String,
        sellerId: json['sellerId'] as String,
        quantity: json['quantity'] as int,
        unitPrice: json['unitPrice'] as int,
        currencyCode: json['currencyCode'] as String,
        product: json['product'] != null ? Product.fromJson(json['product'] as Map<String, dynamic>) : null,
      );
}

class OrderStatusHistoryEntry {
  final String id;
  final OrderStatus? fromStatus;
  final OrderStatus toStatus;
  final String? reason;
  final DateTime createdAt;

  const OrderStatusHistoryEntry({required this.id, required this.toStatus, required this.createdAt, this.fromStatus, this.reason});

  factory OrderStatusHistoryEntry.fromJson(Map<String, dynamic> json) => OrderStatusHistoryEntry(
        id: json['id'] as String,
        fromStatus: json['fromStatus'] != null ? orderStatusFromJson(json['fromStatus'] as String) : null,
        toStatus: orderStatusFromJson(json['toStatus'] as String?),
        reason: json['reason'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class Order {
  final String id;
  final String buyerId;
  final OrderStatus status;
  final String currencyCode;
  final int itemsTotal;
  final int deliveryFee;
  final int buyerProtectionFee;
  final int discountTotal;
  final int otherFees;
  final int grandTotal;
  final DeliveryMode deliveryMode;
  final List<OrderItem> items;
  final List<OrderStatusHistoryEntry> statusHistory;
  final Address? shippingAddress;
  final DateTime createdAt;

  const Order({
    required this.id,
    required this.buyerId,
    required this.status,
    required this.currencyCode,
    required this.itemsTotal,
    required this.deliveryFee,
    required this.buyerProtectionFee,
    required this.discountTotal,
    required this.otherFees,
    required this.grandTotal,
    required this.deliveryMode,
    required this.items,
    required this.statusHistory,
    required this.createdAt,
    this.shippingAddress,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        buyerId: json['buyerId'] as String,
        status: orderStatusFromJson(json['status'] as String?),
        currencyCode: json['currencyCode'] as String,
        itemsTotal: json['itemsTotal'] as int,
        deliveryFee: json['deliveryFee'] as int? ?? 0,
        buyerProtectionFee: json['buyerProtectionFee'] as int? ?? 0,
        discountTotal: json['discountTotal'] as int? ?? 0,
        otherFees: json['otherFees'] as int? ?? 0,
        grandTotal: json['grandTotal'] as int,
        deliveryMode: DeliveryMode.values.firstWhere(
          (m) => m.name == json['deliveryMode'],
          orElse: () => DeliveryMode.HAND_TO_HAND,
        ),
        items: (json['items'] as List<dynamic>? ?? []).map((i) => OrderItem.fromJson(i as Map<String, dynamic>)).toList(),
        statusHistory: (json['statusHistory'] as List<dynamic>? ?? [])
            .map((h) => OrderStatusHistoryEntry.fromJson(h as Map<String, dynamic>))
            .toList(),
        shippingAddress: json['shippingAddress'] != null ? Address.fromJson(json['shippingAddress'] as Map<String, dynamic>) : null,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
