import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/money.dart';
import '../../../models/order.dart';
import '../data/orders_repository.dart';

class OrdersListScreen extends ConsumerWidget {
  const OrdersListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(myOrdersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes commandes')),
      body: ordersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (orders) {
          if (orders.isEmpty) return const Center(child: Text('Aucune commande pour le moment.'));
          return RefreshIndicator(
            onRefresh: () => ref.refresh(myOrdersProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final order = orders[index];
                return Card(
                  child: ListTile(
                    title: Text('Commande #${order.id.substring(0, 8)}'),
                    subtitle: Text('${order.status.label} · ${order.items.length} article(s)'),
                    trailing: Text(formatMoney(order.grandTotal, order.currencyCode)),
                    onTap: () => context.push('/orders/${order.id}'),
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
