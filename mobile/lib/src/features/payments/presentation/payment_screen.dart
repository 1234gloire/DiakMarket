import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/money.dart';
import '../../../models/order.dart';
import '../../../models/payment_transaction.dart';
import '../../orders/data/orders_repository.dart';
import '../data/payments_repository.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  final String orderId;

  const PaymentScreen({super.key, required this.orderId});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  final _phoneController = TextEditingController();
  PaymentTransaction? _transaction;
  Order? _order;
  Timer? _pollTimer;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    final order = await ref.read(ordersRepositoryProvider).getById(widget.orderId);
    if (mounted) setState(() => _order = order);
  }

  Future<void> _initiatePayment() async {
    if (_phoneController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Entrez votre numéro Mobile Money');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });
    try {
      final transaction = await ref.read(paymentsRepositoryProvider).initiate(
            orderId: widget.orderId,
            payerPhone: _phoneController.text.trim(),
          );
      setState(() => _transaction = transaction);
      _startPolling();
    } catch (e) {
      setState(() => _errorMessage = e is ApiException ? e.message : "Impossible d'initier le paiement");
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      final order = await ref.read(ordersRepositoryProvider).getById(widget.orderId);
      if (!mounted) return;
      setState(() => _order = order);
      if (order.status == OrderStatus.PAID || order.status == OrderStatus.PAYMENT_FAILED) {
        _pollTimer?.cancel();
      }
    });
  }

  Future<void> _devSimulate(String outcome) async {
    if (_transaction == null) return;
    await ref.read(paymentsRepositoryProvider).simulate(transactionId: _transaction!.id, outcome: outcome);
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;

    return Scaffold(
      appBar: AppBar(title: const Text('Paiement')),
      body: order == null
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Expanded(child: Text('Montant à payer')),
                          Text(
                            formatMoney(order.grandTotal, order.currencyCode),
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (order.status == OrderStatus.PAID) ...[
                    const Icon(Icons.check_circle, color: Colors.green, size: 64),
                    const SizedBox(height: 16),
                    const Text('Paiement confirmé !', textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => context.go('/orders/${order.id}'),
                      child: const Text('Suivre ma commande'),
                    ),
                  ] else if (order.status == OrderStatus.PAYMENT_FAILED) ...[
                    Icon(Icons.error, color: Theme.of(context).colorScheme.error, size: 64),
                    const SizedBox(height: 16),
                    const Text('Le paiement a échoué.', textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => setState(() {
                        _transaction = null;
                        _errorMessage = null;
                      }),
                      child: const Text('Réessayer'),
                    ),
                  ] else if (_transaction == null) ...[
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Numéro Mobile Money', hintText: '+221771234567'),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _initiatePayment,
                      child: _isSubmitting
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Payer'),
                    ),
                  ] else ...[
                    const Center(child: CircularProgressIndicator()),
                    const SizedBox(height: 16),
                    const Text(
                      'En attente de confirmation du paiement Mobile Money...',
                      textAlign: TextAlign.center,
                    ),
                    if (kDebugMode) ...[
                      const SizedBox(height: 32),
                      const Divider(),
                      const Text('Outils de développement (désactivés en production)', style: TextStyle(fontSize: 12)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _devSimulate('SUCCEEDED'),
                              child: const Text('Simuler succès'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _devSimulate('FAILED'),
                              child: const Text('Simuler échec'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ],
              ),
            ),
    );
  }
}
