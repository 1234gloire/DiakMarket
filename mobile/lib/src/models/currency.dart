class Currency {
  final String code;
  final String name;
  final String symbol;
  final int minorUnit;

  const Currency({required this.code, required this.name, required this.symbol, required this.minorUnit});

  factory Currency.fromJson(Map<String, dynamic> json) => Currency(
        code: json['code'] as String,
        name: json['name'] as String,
        symbol: json['symbol'] as String,
        minorUnit: json['minorUnit'] as int? ?? 0,
      );
}
