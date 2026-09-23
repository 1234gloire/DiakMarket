import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/order.dart';

class SellerOrdersRepository {
  final ApiClient _api;

  SellerOrdersRepository(this._api);

  Future<List<Order>> getMySales() =>
      _api.get('/orders/me/sales', map: (data) => asJsonList(data).map(Order.fromJson).toList());
}

final sellerOrdersRepositoryProvider =
    Provider<SellerOrdersRepository>((ref) => SellerOrdersRepository(ref.watch(apiClientProvider)));

final mySalesProvider = FutureProvider<List<Order>>((ref) => ref.watch(sellerOrdersRepositoryProvider).getMySales());
