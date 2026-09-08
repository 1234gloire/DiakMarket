import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../reference/data/reference_repository.dart';
import '../data/addresses_repository.dart';

class AddAddressSheet extends ConsumerStatefulWidget {
  final String countryId;

  const AddAddressSheet({super.key, required this.countryId});

  @override
  ConsumerState<AddAddressSheet> createState() => _AddAddressSheetState();
}

class _AddAddressSheetState extends ConsumerState<AddAddressSheet> {
  final _formKey = GlobalKey<FormState>();
  final _labelController = TextEditingController();
  final _line1Controller = TextEditingController();
  String? _cityId;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _labelController.dispose();
    _line1Controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      final address = await ref.read(addressesProvider.notifier).create(
            countryId: widget.countryId,
            cityId: _cityId,
            label: _labelController.text.trim().isEmpty ? null : _labelController.text.trim(),
            line1: _line1Controller.text.trim(),
          );
      if (mounted) Navigator.of(context).pop(address);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final citiesAsync = ref.watch(citiesProvider(widget.countryId));

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Nouvelle adresse', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            TextFormField(
              controller: _labelController,
              decoration: const InputDecoration(labelText: 'Libellé (ex: Domicile)'),
            ),
            const SizedBox(height: 12),
            citiesAsync.when(
              data: (cities) => DropdownButtonFormField<String>(
                initialValue: _cityId,
                decoration: const InputDecoration(labelText: 'Ville'),
                items: cities.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: (value) => setState(() => _cityId = value),
              ),
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _line1Controller,
              decoration: const InputDecoration(labelText: 'Adresse (quartier, rue, repère...)'),
              validator: (value) => (value == null || value.trim().isEmpty) ? 'Adresse requise' : null,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}
