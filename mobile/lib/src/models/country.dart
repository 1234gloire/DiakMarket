import 'currency.dart';

class Country {
  final String id;
  final String code;
  final String name;
  final String currencyCode;
  final Currency? currency;
  final String phonePrefix;
  final bool isActive;

  const Country({
    required this.id,
    required this.code,
    required this.name,
    required this.currencyCode,
    required this.phonePrefix,
    required this.isActive,
    this.currency,
  });

  factory Country.fromJson(Map<String, dynamic> json) => Country(
        id: json['id'] as String,
        code: json['code'] as String,
        name: json['name'] as String,
        currencyCode: json['currencyCode'] as String,
        phonePrefix: json['phonePrefix'] as String,
        isActive: json['isActive'] as bool? ?? true,
        currency: json['currency'] != null ? Currency.fromJson(json['currency'] as Map<String, dynamic>) : null,
      );
}
