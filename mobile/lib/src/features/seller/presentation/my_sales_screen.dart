import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/money.dart';
import '../../../models/order.dart';
import '../../orders/data/orders_repository.dart';
import '../data/seller_orders_repository.dart';

/// The seller's next available action for a sale, if any — mirrors the transitions
/// OrdersService.authorizeTransition() actually grants to the seller.
OrderStatus? _nextSellerAction(OrderStatus status) => switch (status) {
      OrderStatus.PAID => OrderStatus.SELLER_CONFIRMED,
      OrderStatus.SELLER_CONFIRMED => OrderStatus.READY_FOR_PICKUP,
      _ => null,
    };

String _actionLabel(OrderStatus status) => switch (status) {
      OrderStatus.SELLER_CONFIRMED => 'Confirmer la vente',
      OrderStatus.READY_FOR_PICKUP => 'Marquer prêt pour collecte',
      _ => '',
    };

class MySalesScreen extends ConsumerStatefulWidget {
  const MySalesScreen({super.key});

  @override
  ConsumerState<MySalesScreen> createState() => _MySalesScreenState();
}

class _MySalesScreenState extends ConsumerState<MySalesScreen> {
  String? _updatingOrderId;

  Future<void> _advance(Order order) async {
    final toStatus = _nextSellerAction(order.status);
    if (toStatus == null) return;
    setState(() => _updatingOrderId = order.id);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(ordersRepositoryProvider).updateStatus(order.id, toStatus);
      ref.invalidate(mySalesProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e is ApiException ? e.message : 'Erreur')));
    } finally {
      if (mounted) setState(() => _updatingOrderId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final salesAsync = ref.watch(mySalesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes ventes')),
      body: salesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (orders) {
          if (orders.isEmpty) return const Center(child: Text('Aucune vente pour le moment.'));
          return RefreshIndicator(
            onRefresh: () => ref.refresh(mySalesProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final order = orders[index];
                final action = _nextSellerAction(order.status);
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Commande #${order.id.substring(0, 8)}', style: Theme.of(context).textTheme.titleSmall),
                        const SizedBox(height: 4),
                        Text(order.status.label),
                        const SizedBox(height: 4),
                        Text(formatMoney(order.grandTotal, order.currencyCode), style: const TextStyle(fontWeight: FontWeight.bold)),
                        if (action != null) ...[
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _updatingOrderId == order.id ? null : () => _advance(order),
                              child: _updatingOrderId == order.id
                                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                  : Text(_actionLabel(action)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
