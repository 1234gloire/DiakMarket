import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../models/country.dart';
import '../../reference/data/reference_repository.dart';
import '../providers/current_user_provider.dart';

class SelectCountryScreen extends ConsumerStatefulWidget {
  const SelectCountryScreen({super.key});

  @override
  ConsumerState<SelectCountryScreen> createState() => _SelectCountryScreenState();
}

class _SelectCountryScreenState extends ConsumerState<SelectCountryScreen> {
  bool _isSubmitting = false;

  Future<void> _select(Country country) async {
    setState(() => _isSubmitting = true);
    try {
      await ref.read(currentUserProvider.notifier).setCountry(country.id);
      if (mounted) context.go('/home');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final countriesAsync = ref.watch(countriesProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Text('Où êtes-vous ?', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Choisissez votre pays pour voir les annonces, les prix et les modes de paiement adaptés.'),
              const SizedBox(height: 24),
              Expanded(
                child: countriesAsync.when(
                  data: (countries) => _isSubmitting
                      ? const Center(child: CircularProgressIndicator())
                      : ListView.separated(
                          itemCount: countries.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final country = countries[index];
                            return Card(
                              child: ListTile(
                                title: Text(country.name),
                                subtitle: Text(country.currencyCode),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => _select(country),
                              ),
                            );
                          },
                        ),
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(child: Text('$error')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
