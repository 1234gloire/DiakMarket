import 'package:intl/intl.dart';

/// Formats an integer minor-unit amount for display. XOF/XAF both have zero decimal digits,
/// so the stored integer IS the whole-currency value — this never divides by 100.
String formatMoney(int amount, String currencyCode) {
  final formatter = NumberFormat.decimalPattern('fr_FR');
  final symbol = switch (currencyCode) {
    'XOF' || 'XAF' => 'FCFA',
    _ => currencyCode,
  };
  return '${formatter.format(amount)} $symbol';
}
