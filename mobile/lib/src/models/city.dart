class City {
  final String id;
  final String countryId;
  final String name;
  final double? latitude;
  final double? longitude;

  const City({required this.id, required this.countryId, required this.name, this.latitude, this.longitude});

  factory City.fromJson(Map<String, dynamic> json) => City(
        id: json['id'] as String,
        countryId: json['countryId'] as String,
        name: json['name'] as String,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
      );
}
