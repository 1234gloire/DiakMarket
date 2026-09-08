import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/money.dart';
import '../../../models/order.dart';
import '../../cart/providers/cart_provider.dart';
import '../../orders/data/orders_repository.dart';
import '../../profile/providers/current_user_provider.dart';
import '../data/addresses_repository.dart';
import 'add_address_sheet.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  DeliveryMode _deliveryMode = DeliveryMode.HOME_DELIVERY;
  String? _selectedAddressId;
  bool _isSubmitting = false;
  String? _errorMessage;

  Future<void> _addAddress() async {
    final countryId = ref.read(currentUserProvider).value?.countryId;
    if (countryId == null) return;
    final address = await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => AddAddressSheet(countryId: countryId),
    );
    if (address != null) setState(() => _selectedAddressId = address.id);
  }

  Future<void> _placeOrder() async {
    if (_deliveryMode == DeliveryMode.HOME_DELIVERY && _selectedAddressId == null) {
      setState(() => _errorMessage = 'Choisissez une adresse de livraison');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });
    try {
      final order = await ref.read(ordersRepositoryProvider).checkout(
            deliveryMode: _deliveryMode,
            shippingAddressId: _deliveryMode == DeliveryMode.HOME_DELIVERY ? _selectedAddressId : null,
          );
      await ref.read(cartProvider.notifier).refresh();
      if (mounted) context.pushReplacement('/payment/${order.id}');
    } catch (e) {
      setState(() => _errorMessage = e is ApiException ? e.message : 'Impossible de créer la commande');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartAsync = ref.watch(cartProvider);
    final addressesAsync = ref.watch(addressesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Commande')),
      body: cartAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (cart) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Mode de livraison', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...DeliveryMode.values.map(
              (mode) => RadioListTile<DeliveryMode>(
                contentPadding: EdgeInsets.zero,
                title: Text(mode.label),
                value: mode,
                groupValue: _deliveryMode,
                onChanged: (value) => setState(() => _deliveryMode = value!),
              ),
            ),
            if (_deliveryMode == DeliveryMode.HOME_DELIVERY) ...[
              const SizedBox(height: 8),
              Text('Adresse de livraison', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              addressesAsync.when(
                loading: () => const CircularProgressIndicator(),
                error: (error, _) => Text('$error'),
                data: (addresses) => Column(
                  children: [
                    ...addresses.map(
                      (address) => RadioListTile<String>(
                        contentPadding: EdgeInsets.zero,
                        title: Text(address.shortLabel),
                        subtitle: Text(address.line1),
                        value: address.id,
                        groupValue: _selectedAddressId,
                        onChanged: (value) => setState(() => _selectedAddressId = value),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _addAddress,
                      icon: const Icon(Icons.add_location_alt_outlined),
                      label: const Text('Ajouter une adresse'),
                    ),
                  ],
                ),
              ),
            ],
            const Divider(height: 32),
            Text('Récapitulatif', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...cart.items.map(
              (item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(child: Text('${item.product.title} ×${item.quantity}')),
                    Text(formatMoney(item.lineTotal, item.product.currencyCode)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.bold))),
                Text(
                  formatMoney(cart.total, cart.currencyCode ?? 'XOF'),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Text(
              'Les frais de livraison et de protection acheteur seront calculés par le serveur.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _placeOrder,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Confirmer la commande'),
            ),
          ],
        ),
      ),
    );
  }
}
