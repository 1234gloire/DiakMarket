class Address {
  final String id;
  final String countryId;
  final String? cityId;
  final String? label;
  final String line1;
  final String? line2;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  const Address({
    required this.id,
    required this.countryId,
    required this.line1,
    required this.isDefault,
    this.cityId,
    this.label,
    this.line2,
    this.latitude,
    this.longitude,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: json['id'] as String,
        countryId: json['countryId'] as String,
        cityId: json['cityId'] as String?,
        label: json['label'] as String?,
        line1: json['line1'] as String,
        line2: json['line2'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        isDefault: json['isDefault'] as bool? ?? false,
      );

  String get shortLabel => label?.isNotEmpty == true ? label! : line1;
}
