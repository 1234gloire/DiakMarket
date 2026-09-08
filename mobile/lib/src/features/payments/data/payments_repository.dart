import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../models/payment_transaction.dart';

class PaymentsRepository {
  final ApiClient _api;

  PaymentsRepository(this._api);

  Future<PaymentTransaction> initiate({required String orderId, required String payerPhone}) => _api.post(
        '/payments/initiate',
        body: {'orderId': orderId, 'payerPhone': payerPhone},
        map: (data) => PaymentTransaction.fromJson(asJsonMap(data)),
      );

  /// Dev/staging only — triggers the MockPaymentProvider webhook directly so the payment can be
  /// confirmed without a real Mobile Money network. The backend refuses this in production.
  Future<void> simulate({required String transactionId, required String outcome}) => _api.post(
        '/payments/dev/simulate',
        body: {'transactionId': transactionId, 'outcome': outcome},
        map: (_) {},
      );
}

final paymentsRepositoryProvider = Provider<PaymentsRepository>((ref) => PaymentsRepository(ref.watch(apiClientProvider)));
