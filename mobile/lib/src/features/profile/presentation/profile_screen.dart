import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/auth_repository.dart';
import '../data/profile_repository.dart';
import '../providers/current_user_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  static String _initial(String? name) => (name != null && name.isNotEmpty) ? name.substring(0, 1).toUpperCase() : '?';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: userAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('$error')),
        data: (user) {
          if (user == null) return const SizedBox.shrink();
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              CircleAvatar(radius: 40, child: Text(_initial(user.profile?.displayName))),
              const SizedBox(height: 12),
              Center(child: Text(user.profile?.displayName ?? 'Utilisateur', style: Theme.of(context).textTheme.titleLarge)),
              if (user.email != null) Center(child: Text(user.email!, style: Theme.of(context).textTheme.bodyMedium)),
              const SizedBox(height: 8),
              if (user.profile != null)
                Center(
                  child: Text(
                    '⭐ ${user.profile!.ratingAvg.toStringAsFixed(1)} (${user.profile!.ratingCount} avis) · ${user.profile!.salesCount} ventes',
                  ),
                ),
              const SizedBox(height: 24),
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('Modifier le profil'),
                onTap: () => _showEditDialog(context, ref, user.profile?.displayName ?? ''),
              ),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Se déconnecter'),
                onTap: () => ref.read(authRepositoryProvider).signOut(),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _showEditDialog(BuildContext context, WidgetRef ref, String currentName) async {
    final controller = TextEditingController(text: currentName);
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nom affiché'),
        content: TextField(controller: controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.of(context).pop(controller.text.trim()), child: const Text('Enregistrer')),
        ],
      ),
    );
    if (newName != null && newName.isNotEmpty) {
      await ref.read(profileRepositoryProvider).updateProfile(displayName: newName);
      ref.read(currentUserProvider.notifier).refresh();
    }
  }
}
