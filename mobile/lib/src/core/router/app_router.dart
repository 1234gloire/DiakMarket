import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/signup_screen.dart';
import '../../features/cart/presentation/cart_screen.dart';
import '../../features/checkout/presentation/checkout_screen.dart';
import '../../features/home/presentation/home_shell.dart';
import '../../features/orders/presentation/order_detail_screen.dart';
import '../../features/payments/presentation/payment_screen.dart';
import '../../features/products/presentation/product_detail_screen.dart';
import '../../features/products/presentation/search_screen.dart';
import '../../features/seller/presentation/create_product_screen.dart';
import '../../features/seller/presentation/my_listings_screen.dart';
import '../../features/seller/presentation/my_sales_screen.dart';
import 'go_router_refresh_stream.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);

  return GoRouter(
    initialLocation: '/home',
    refreshListenable: GoRouterRefreshStream(authRepository.onAuthStateChange),
    redirect: (context, state) {
      final isAuthenticated = authRepository.currentSession != null;
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup';

      if (!isAuthenticated) return isAuthRoute ? null : '/login';
      if (isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
      GoRoute(path: '/home', builder: (context, state) => const HomeShell()),
      GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
      GoRoute(
        path: '/product/:id',
        builder: (context, state) => ProductDetailScreen(productId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/cart', builder: (context, state) => const CartScreen()),
      GoRoute(path: '/checkout', builder: (context, state) => const CheckoutScreen()),
      GoRoute(
        path: '/payment/:orderId',
        builder: (context, state) => PaymentScreen(orderId: state.pathParameters['orderId']!),
      ),
      GoRoute(
        path: '/orders/:id',
        builder: (context, state) => OrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/seller/listings', builder: (context, state) => const MyListingsScreen()),
      GoRoute(path: '/seller/products/new', builder: (context, state) => const CreateProductScreen()),
      GoRoute(path: '/seller/sales', builder: (context, state) => const MySalesScreen()),
    ],
  );
});
