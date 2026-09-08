import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/money.dart';
import '../../../models/order.dart';
import '../../reviews/presentation/leave_review_dialog.dart';
import '../data/orders_repository.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _isUpdating = false;

  Future<void> _confirmReceipt() async {
    setState(() => _isUpdating = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(ordersRepositoryProvider).updateStatus(widget.orderId, OrderStatus.BUYER_CONFIRMED);
      ref.invalidate(orderDetailProvider(widget.orderId));
      ref.invalidate(myOrdersProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e is ApiException ? e.message : 'Erreur')));
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Future<void> _leaveReview(Order order) async {
    final sellerId = order.items.isNotEmpty ? order.items.first.sellerId : null;
    if (sellerId == null) return;
    await showDialog(
      context: context,
      builder: (_) => LeaveReviewDialog(orderId: order.id, targetId: sellerId, targetName: 'le vendeur'),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(orderDetailProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Détail de la commande')),
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (order) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Commande #${order.id.substring(0, 8)}', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text(order.status.label, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text('Livraison : ${order.deliveryMode.label}'),
                    if (order.shippingAddress != null) Text(order.shippingAddress!.line1),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Articles', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...order.items.map(
              (item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(child: Text('${item.product?.title ?? 'Produit'} ×${item.quantity}')),
                    Text(formatMoney(item.unitPrice * item.quantity, item.currencyCode)),
                  ],
                ),
              ),
            ),
            const Divider(height: 24),
            _totalRow(context, 'Sous-total', order.itemsTotal, order.currencyCode),
            _totalRow(context, 'Livraison', order.deliveryFee, order.currencyCode),
            if (order.buyerProtectionFee > 0) _totalRow(context, 'Protection acheteur', order.buyerProtectionFee, order.currencyCode),
            const SizedBox(height: 4),
            _totalRow(context, 'Total', order.grandTotal, order.currencyCode, bold: true),
            const SizedBox(height: 24),
            Text('Suivi de la commande', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...order.statusHistory.reversed.map(
              (entry) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.circle, size: 12),
                title: Text(entry.toStatus.label),
                subtitle: Text(DateFormat('dd/MM/yyyy HH:mm').format(entry.createdAt.toLocal())),
              ),
            ),
            const SizedBox(height: 24),
            if (order.status == OrderStatus.DELIVERED)
              ElevatedButton(
                onPressed: _isUpdating ? null : _confirmReceipt,
                child: _isUpdating
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Confirmer la réception'),
              ),
            if (order.status == OrderStatus.COMPLETED)
              OutlinedButton(
                onPressed: () => _leaveReview(order),
                child: const Text('Noter le vendeur'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _totalRow(BuildContext context, String label, int amount, String currencyCode, {bool bold = false}) {
    final style = bold ? const TextStyle(fontWeight: FontWeight.bold) : null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(formatMoney(amount, currencyCode), style: style),
        ],
      ),
    );
  }
}
