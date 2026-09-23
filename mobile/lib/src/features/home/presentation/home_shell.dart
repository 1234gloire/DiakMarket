import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/floating_nav_bar.dart';
import '../../favorites/presentation/favorites_screen.dart';
import '../../orders/presentation/orders_list_screen.dart';
import '../../profile/presentation/profile_screen.dart';
import '../../profile/presentation/select_country_screen.dart';
import '../../profile/providers/current_user_provider.dart';
import 'home_screen.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _tabs = [
    HomeScreen(),
    FavoritesScreen(),
    OrdersListScreen(),
    ProfileScreen(),
  ];

  static const _navItems = [
    FloatingNavItem(icon: Icons.storefront_outlined, selectedIcon: Icons.storefront, label: 'Accueil'),
    FloatingNavItem(icon: Icons.favorite_border, selectedIcon: Icons.favorite, label: 'Favoris'),
    FloatingNavItem(icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long, label: 'Commandes'),
    FloatingNavItem(icon: Icons.person_outline, selectedIcon: Icons.person, label: 'Profil'),
  ];

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(currentUserProvider);

    return userAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) => Scaffold(body: Center(child: Text('$error'))),
      data: (user) {
        if (user != null && user.countryId == null) {
          return const SelectCountryScreen();
        }
        return Scaffold(
          extendBody: true,
          body: IndexedStack(index: _index, children: _tabs),
          bottomNavigationBar: FloatingNavBar(
            items: _navItems,
            currentIndex: _index,
            onTabSelected: (index) => setState(() => _index = index),
            centerIcon: Icons.add,
            onCenterTap: () => context.push('/seller/products/new'),
          ),
        );
      },
    );
  }
}
