import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/order.dart';

class OrdersRepository {
  final ApiClient _api;

  OrdersRepository(this._api);

  Future<Order> checkout({required DeliveryMode deliveryMode, String? shippingAddressId}) => _api.post(
        '/orders/checkout',
        body: {
          'deliveryMode': deliveryMode.name,
          if (shippingAddressId != null) 'shippingAddressId': shippingAddressId,
        },
        map: (data) => Order.fromJson(asJsonMap(data)),
      );

  Future<List<Order>> getMine() =>
      _api.get('/orders/me', map: (data) => asJsonList(data).map(Order.fromJson).toList());

  Future<Order> getById(String id) => _api.get('/orders/$id', map: (data) => Order.fromJson(asJsonMap(data)));

  Future<Order> updateStatus(String id, OrderStatus toStatus, {String? reason}) => _api.patch(
        '/orders/$id/status',
        body: {'toStatus': toStatus.name, if (reason != null) 'reason': reason},
        map: (data) => Order.fromJson(asJsonMap(data)),
      );
}

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) => OrdersRepository(ref.watch(apiClientProvider)));

final myOrdersProvider = FutureProvider<List<Order>>((ref) => ref.watch(ordersRepositoryProvider).getMine());

final orderDetailProvider = FutureProvider.family<Order, String>((ref, id) => ref.watch(ordersRepositoryProvider).getById(id));
